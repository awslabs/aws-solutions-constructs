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

import * as kinesisfirehose from 'aws-cdk-lib/aws-kinesisfirehose';
import * as kdfToS3 from '@aws-solutions-constructs/aws-kinesisfirehose-s3';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as defaults from '@aws-solutions-constructs/core';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { addCfnGuardSuppressRules, overrideProps } from '@aws-solutions-constructs/core';
import * as logs from 'aws-cdk-lib/aws-logs';

/**
 * The properties for the KinesisStreamsToKinesisFirehoseToS3 class.
 */
export interface KinesisStreamsToKinesisFirehoseToS3Props {
  /**
   * Optional user provided props to override the default props for the S3 Bucket.
   *
   * @default - Default props are used
   */
  readonly bucketProps?: s3.BucketProps;
  /**
   * Optional whether to create recommended CloudWatch alarms.
   *
   * @default - Alarms are created
   */
  readonly createCloudWatchAlarms?: boolean;
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
   * Optional existing instance of Kinesis Stream, providing both this and `kinesisStreamProps` will cause an error.
   *
   * @default - None
   */
  readonly existingStreamObj?: kinesis.Stream;
  /**
   * Optional user provided props to override the default props.
   *
   * @default - Default props are used
   */
  readonly kinesisFirehoseProps?: kinesisfirehose.CfnDeliveryStreamProps | any;
  /**
   * Optional user-provided props to override the default props for the Kinesis stream.
   *
   * @default - Default props are used.
   */
  readonly kinesisStreamProps?: kinesis.StreamProps;
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

export class KinesisStreamsToKinesisFirehoseToS3 extends Construct {
  public readonly cloudwatchAlarms?: cloudwatch.Alarm[];
  public readonly kinesisFirehose: kinesisfirehose.CfnDeliveryStream;
  public readonly kinesisFirehoseLogGroup: logs.LogGroup;
  public readonly kinesisFirehoseRole: iam.Role;
  public readonly kinesisStream: kinesis.Stream;
  public readonly kinesisStreamRole: iam.Role;
  public readonly s3Bucket?: s3.Bucket;
  public readonly s3LoggingBucket?: s3.Bucket;
  public readonly s3BucketInterface: s3.IBucket;

  /**
   * @summary Constructs a new instance of the KinesisStreamsToKinesisFirehoseToS3 class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {KinesisStreamsToKinesisFirehoseToS3Props} props - user provided props for the construct.
   * @since 1.68.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: KinesisStreamsToKinesisFirehoseToS3Props) {
    super(scope, id);

    // All our tests are based upon this behavior being on, so we're setting
    // context here rather than assuming the client will set it
    this.node.setContext("@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy", true);

    defaults.CheckKinesisStreamProps(props);
    // CheckS3Props() is called by the internal aws-kinesisfirehose-s3 construct

    // Setup the Kinesis Stream
    this.kinesisStream = defaults.buildKinesisStream(this, {
      existingStreamObj: props.existingStreamObj,
      kinesisStreamProps: props.kinesisStreamProps
    });

    this.kinesisStreamRole = new iam.Role(scope, 'KinesisStreamsRole', {
      assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
      inlinePolicies: {
        KinesisStreamsRoleRolePolicy: new iam.PolicyDocument({
          statements: [new iam.PolicyStatement({
            actions: [
              "kinesis:DescribeStream",
              "kinesis:GetShardIterator",
              "kinesis:GetRecords",
              "kinesis:ListShards"
            ],
            resources: [this.kinesisStream.streamArn]
          })]
        })
      }
    });
    addCfnGuardSuppressRules(this.kinesisStreamRole, ["IAM_NO_INLINE_POLICY_CHECK"]);

    // This Construct requires that the deliveryStreamType be overridden regardless of what is specified in the user props
    if (props.kinesisFirehoseProps) {
      if (props.kinesisFirehoseProps.deliveryStreamType !== undefined) {
        defaults.printWarning('Overriding deliveryStreamType type to be KinesisStreamAsSource');
      }

      if (props.kinesisFirehoseProps.kinesisStreamSourceConfiguration !== undefined) {
        defaults.printWarning('Overriding kinesisStreamSourceConfiguration');
      }
    }

    const _kinesisFirehoseProps: kinesisfirehose.CfnDeliveryStreamProps = {
      deliveryStreamType: 'KinesisStreamAsSource',
      kinesisStreamSourceConfiguration: {
        kinesisStreamArn: this.kinesisStream.streamArn,
        roleArn: this.kinesisStreamRole.roleArn
      }
    };

    const kdfToS3Construct = new kdfToS3.KinesisFirehoseToS3(this, 'KinesisFirehoseToS3', {
      kinesisFirehoseProps: overrideProps(props.kinesisFirehoseProps, _kinesisFirehoseProps),
      existingBucketObj: props.existingBucketObj,
      existingLoggingBucketObj: props.existingLoggingBucketObj,
      bucketProps: props.bucketProps,
      logGroupProps: props.logGroupProps,
      loggingBucketProps: props.loggingBucketProps,
      logS3AccessLogs: props.logS3AccessLogs
    });

    this.kinesisFirehose = kdfToS3Construct.kinesisFirehose;
    this.kinesisFirehoseRole = kdfToS3Construct.kinesisFirehoseRole;
    this.kinesisFirehoseLogGroup = kdfToS3Construct.kinesisFirehoseLogGroup;
    this.s3Bucket = kdfToS3Construct.s3Bucket;
    this.s3LoggingBucket = kdfToS3Construct.s3LoggingBucket;
    this.s3BucketInterface = kdfToS3Construct.s3BucketInterface;

    if (props.createCloudWatchAlarms === undefined || props.createCloudWatchAlarms) {
      // Deploy best practices CW Alarms for Kinesis Stream
      this.cloudwatchAlarms = defaults.buildKinesisStreamCWAlarms(this);
    }
  }
}
