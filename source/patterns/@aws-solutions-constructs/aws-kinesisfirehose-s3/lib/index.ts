/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import * as kinesisfirehose from "aws-cdk-lib/aws-kinesisfirehose";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as defaults from "@aws-solutions-constructs/core";
import * as iam from "aws-cdk-lib/aws-iam";
import { overrideProps, consolidateProps } from "@aws-solutions-constructs/core";
import * as logs from "aws-cdk-lib/aws-logs";
import * as cdk from "aws-cdk-lib";
import * as kms from "aws-cdk-lib/aws-kms";

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
  /**
   * Optional user provided props to override the default props for the S3 Logging Bucket.
   *
   * @default - Default props are used
   */
  readonly loggingBucketProps?: s3.BucketProps;
  /**
   * Whether to turn on Access Logs for the S3 bucket with the associated storage costs.
   * Enabling Access Logging is a best practice.
   *
   * @default - true
   */
  readonly logS3AccessLogs?: boolean;
}

export class KinesisFirehoseToS3 extends Construct {
  public readonly kinesisFirehose: kinesisfirehose.CfnDeliveryStream;
  public readonly kinesisFirehoseLogGroup: logs.LogGroup;
  public readonly kinesisFirehoseRole: iam.Role;
  public readonly s3Bucket?: s3.Bucket;
  public readonly s3LoggingBucket?: s3.Bucket;
  public readonly s3BucketInterface: s3.IBucket;

  /**
   * Constructs a new instance of the KinesisFirehoseToS3 class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {KinesisFirehoseToS3Props} props - user provided props for the construct.
   * @since 0.8.0-beta
   * @access public
   */
  constructor(scope: Construct, id: string, props: KinesisFirehoseToS3Props) {
    super(scope, id);

    // All our tests are based upon this behavior being on, so we're setting
    // context here rather than assuming the client will set it
    this.node.setContext("@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy", true);

    defaults.CheckS3Props(props);

    const firehoseId = 'KinesisFirehose';

    let bucket: s3.IBucket;

    // Setup S3 Bucket
    if (!props.existingBucketObj) {
      let bucketProps = props.bucketProps ?? {};
      bucketProps = props.existingLoggingBucketObj ?
        overrideProps(bucketProps, { serverAccessLogsBucket: props.existingLoggingBucketObj }) :
        bucketProps;

      // Setup logging S3 Bucket
      const buildS3BucketResponse = defaults.buildS3Bucket(this, {
        bucketProps,
        loggingBucketProps: props.loggingBucketProps,
        logS3AccessLogs: props.logS3AccessLogs,
      });
      this.s3Bucket = buildS3BucketResponse.bucket;
      // Commit fd5a4f1fe5bd4fb85265b895eec4c36349a8bf64 fixed the core routine,
      // but changed this behavior. Forcing undefined to pass existing test, but we
      // should clarify behavior for construct properties when existing values are passed in.
      this.s3LoggingBucket = props.existingLoggingBucketObj ? undefined : buildS3BucketResponse.loggingBucket;

      bucket = this.s3Bucket;
    } else {
      bucket = props.existingBucketObj;
    }

    this.s3BucketInterface = bucket;

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
    defaults.addCfnGuardSuppressRules(this.kinesisFirehoseRole, ["IAM_NO_INLINE_POLICY_CHECK"]);

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
      `${id}aws-managed-key`,
      "alias/aws/s3"
    );

    // We need a stream name to set an environment variable, as this is an L1 construct
    // accessing the name as a token doesn't work for environment variable contents, so
    // we take explicit control of the stream name (but will be overridden by a client provided name)
    const deliveryStreamName = defaults.generateName(this, firehoseId);

    // Setup the default Kinesis Firehose props
    let defaultKinesisFirehoseProps: kinesisfirehose.CfnDeliveryStreamProps = defaults.DefaultCfnDeliveryStreamProps(
      bucket.bucketArn,
      this.kinesisFirehoseRole.roleArn,
      this.kinesisFirehoseLogGroup.logGroupName,
      cwLogStream.logStreamName,
      awsManagedKey,
      deliveryStreamName
    );

    // if the client didn't explicitly say it was a Kinesis client, then turn on encryption
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

    const kinesisFirehoseProps = consolidateProps(defaultKinesisFirehoseProps, props.kinesisFirehoseProps);

    this.kinesisFirehose = new kinesisfirehose.CfnDeliveryStream(
      this,
      firehoseId,
      kinesisFirehoseProps
    );

    defaults.addCfnGuardSuppressRules(this.kinesisFirehose, [
      "KINESIS_FIREHOSE_REDSHIFT_DESTINATION_CONFIGURATION_NO_PLAINTEXT_PASSWORD",
      "KINESIS_FIREHOSE_SPLUNK_DESTINATION_CONFIGURATION_NO_PLAINTEXT_PASSWORD"
    ]);
  }
}
