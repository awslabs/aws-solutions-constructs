/**
 *  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

import * as kinesisfirehose from "@aws-cdk/aws-kinesisfirehose";
import { Construct } from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import * as defaults from "@aws-solutions-constructs/core";
import * as iam from "@aws-cdk/aws-iam";
import { overrideProps, printWarning } from "@aws-solutions-constructs/core";
import * as logs from "@aws-cdk/aws-logs";
import * as cdk from "@aws-cdk/core";
import * as kms from "@aws-cdk/aws-kms";

/**
 * The properties for the KinesisFirehoseToS3 class.
 */
export interface KinesisFirehoseToS3Props {
  /**
   * Optional user provided props to override the default props for the S3 Bucket.
   *
   * @default - Default props are used
   */
  readonly bucketProps?: s3.BucketProps;
  /**
   * Optional existing instance of S3 Bucket,
   * providing both this and bucketProps will cause an error. Providing both this and bucketProps will cause an error.
   *
   * @default - None
   */
  readonly existingBucketObj?: s3.IBucket;
  /**
   * Optional existing instance of logging S3 Bucket for the S3 Bucket created by the pattern.
   *
   * @default - None
   */
  readonly existingLoggingBucketObj?: s3.IBucket;
  /**
   * Optional user provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly kinesisFirehoseProps?: kinesisfirehose.CfnDeliveryStreamProps | any;
  /**
   * Optional user provided props to override the default props for the CloudWatchLogs LogGroup.
   *
   * @default - Default props are used
   */
  readonly logGroupProps?: logs.LogGroupProps;
}

export class KinesisFirehoseToS3 extends Construct {
  public readonly kinesisFirehose: kinesisfirehose.CfnDeliveryStream;
  public readonly kinesisFirehoseLogGroup: logs.LogGroup;
  public readonly kinesisFirehoseRole: iam.Role;
  public readonly s3Bucket?: s3.Bucket;
  public readonly s3LoggingBucket?: s3.Bucket;

  /**
   * Constructs a new instance of the KinesisFirehoseToS3 class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {KinesisFirehoseToS3Props} props - user provided props for the construct.
   * @access public
   */
  constructor(scope: Construct, id: string, props: KinesisFirehoseToS3Props) {
    super(scope, id);
    defaults.CheckProps(props);

    let bucket: s3.IBucket;

    if (props.existingBucketObj && props.bucketProps) {
      throw new Error('Cannot specify both bucket properties and an existing bucket');
    }

    // Setup S3 Bucket
    if (!props.existingBucketObj) {
      let { bucketProps } = props;

      // Setup logging S3 Bucket
      if (props.existingLoggingBucketObj) {
        if (!bucketProps) {
          bucketProps = {};
        }

        bucketProps = overrideProps(bucketProps, {
          serverAccessLogsBucket: props.existingLoggingBucketObj
        });
      }

      [this.s3Bucket, this.s3LoggingBucket] = defaults.buildS3Bucket(this, {
        bucketProps
      });

      bucket = this.s3Bucket;
    } else {
      bucket = props.existingBucketObj;
    }

    // Setup Cloudwatch Log group & stream for Kinesis Firehose
    this.kinesisFirehoseLogGroup = defaults.buildLogGroup(
      this,
      "firehose-log-group",
      props.logGroupProps
    );
    const cwLogStream: logs.LogStream = this.kinesisFirehoseLogGroup.addStream(
      "firehose-log-stream"
    );

    // Setup the IAM Role for Kinesis Firehose
    this.kinesisFirehoseRole = new iam.Role(this, "KinesisFirehoseRole", {
      assumedBy: new iam.ServicePrincipal("firehose.amazonaws.com"),
    });

    // Setup the IAM policy for Kinesis Firehose
    const firehosePolicy = new iam.Policy(this, "KinesisFirehosePolicy", {
      statements: [
        new iam.PolicyStatement({
          actions: [
            "s3:AbortMultipartUpload",
            "s3:GetBucketLocation",
            "s3:GetObject",
            "s3:ListBucket",
            "s3:ListBucketMultipartUploads",
            "s3:PutObject",
          ],
          resources: [`${bucket.bucketArn}`, `${bucket.bucketArn}/*`],
        }),
        new iam.PolicyStatement({
          actions: ["logs:PutLogEvents"],
          resources: [
            `arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:${this.kinesisFirehoseLogGroup.logGroupName}:log-stream:${cwLogStream.logStreamName}`,
          ],
        }),
      ],
    });

    // Attach policy to role
    firehosePolicy.attachToRole(this.kinesisFirehoseRole);

    const awsManagedKey: kms.IKey = kms.Alias.fromAliasName(
      scope,
      "aws-managed-key",
      "alias/aws/s3"
    );

    // Setup the default Kinesis Firehose props
    let defaultKinesisFirehoseProps: kinesisfirehose.CfnDeliveryStreamProps = defaults.DefaultCfnDeliveryStreamProps(
      bucket.bucketArn,
      this.kinesisFirehoseRole.roleArn,
      this.kinesisFirehoseLogGroup.logGroupName,
      cwLogStream.logStreamName,
      awsManagedKey
    );

    printWarning(`kinesisFirehoseProps: ${JSON.stringify(props.kinesisFirehoseProps, null, 2)}`);
    // if the client didn't explicity say it was a Kinesis client, then turn on encryption
    if (!props.kinesisFirehoseProps ||
        !props.kinesisFirehoseProps.deliveryStreamType ||
        props.kinesisFirehoseProps.deliveryStreamType !== 'KinesisStreamAsSource'
    ) {
      defaultKinesisFirehoseProps = defaults.overrideProps(
        defaultKinesisFirehoseProps,
        {
          deliveryStreamEncryptionConfigurationInput: {
            keyType: "AWS_OWNED_CMK",
          },
        }
      );
    }

    // Override with the input props
    if (props.kinesisFirehoseProps) {
      const kinesisFirehoseProps = overrideProps(
        defaultKinesisFirehoseProps,
        props.kinesisFirehoseProps
      );
      this.kinesisFirehose = new kinesisfirehose.CfnDeliveryStream(
        this,
        "KinesisFirehose",
        kinesisFirehoseProps
      );
    } else {
      this.kinesisFirehose = new kinesisfirehose.CfnDeliveryStream(
        this,
        "KinesisFirehose",
        defaultKinesisFirehoseProps
      );
    }
  }
}