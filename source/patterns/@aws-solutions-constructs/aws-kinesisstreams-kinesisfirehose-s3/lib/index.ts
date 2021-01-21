/**
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import * as kinesisfirehose from '@aws-cdk/aws-kinesisfirehose';
import * as kdfToS3 from '@aws-solutions-constructs/aws-kinesisfirehose-s3';
import { Construct } from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as defaults from '@aws-solutions-constructs/core';
import * as iam from '@aws-cdk/aws-iam';
import * as kinesis from '@aws-cdk/aws-kinesis';
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';
import { overrideProps } from '@aws-solutions-constructs/core';
import * as logs from '@aws-cdk/aws-logs';

/**
 * The properties for the KinesisStreamsToKinesisFirehoseToS3 class.
 */
export interface KinesisStreamsToKinesisFirehoseToS3Props {
  /**
   * Optional user provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly kinesisFirehoseProps?: kinesisfirehose.CfnDeliveryStreamProps | any,
  /**
   * Existing instance of S3 Bucket object, if this is set then the bucketProps is ignored.
   *
   * @default - None
   */
  readonly existingBucketObj?: s3.IBucket,
  /**
   * User provided props to override the default props for the S3 Bucket.
   *
   * @default - Default props are used
   */
  readonly bucketProps?: s3.BucketProps,
  /**
   * Existing instance of Kinesis Stream, if this is set then kinesisStreamProps is ignored.
   *
   * @default - None
   */
  readonly existingStreamObj?: kinesis.Stream;
  /**
   * Optional user-provided props to override the default props for the Kinesis stream.
   *
   * @default - Default props are used.
   */
  readonly kinesisStreamProps?: kinesis.StreamProps,
  /**
   * Whether to create recommended CloudWatch alarms
   *
   * @default - Alarms are created
   */
  readonly createCloudWatchAlarms?: boolean,
  /**
   * User provided props to override the default props for the CloudWatchLogs LogGroup.
   *
   * @default - Default props are used
   */
  readonly logGroupProps?: logs.LogGroupProps
}

export class KinesisStreamsToKinesisFirehoseToS3 extends Construct {
  public readonly kinesisFirehose: kinesisfirehose.CfnDeliveryStream;
  public readonly kinesisFirehoseRole: iam.Role;
  public readonly kinesisFirehoseLogGroup: logs.LogGroup;
  public readonly s3Bucket?: s3.Bucket;
  public readonly s3LoggingBucket?: s3.Bucket;
  public readonly kinesisStream: kinesis.Stream;
  public readonly cloudwatchAlarms?: cloudwatch.Alarm[];

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

    // Setup the Kinesis Stream
    this.kinesisStream = defaults.buildKinesisStream(this, {
      existingStreamObj: props.existingStreamObj,
      kinesisStreamProps: props.kinesisStreamProps
    });

    const kinesisStreamsRole = new iam.Role(scope, 'KinesisStreamsRole', {
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

    // This Construct requires that the deliveryStreamType be overriden regardless of what is specified in the user props
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
        roleArn: kinesisStreamsRole.roleArn
      }
    };

    const kdfToS3Construct = new kdfToS3.KinesisFirehoseToS3(this, 'KinesisFirehoseToS3', {
      kinesisFirehoseProps: overrideProps(props.kinesisFirehoseProps, _kinesisFirehoseProps),
      existingBucketObj: props.existingBucketObj,
      bucketProps: props.bucketProps,
      logGroupProps: props.logGroupProps
    });

    this.kinesisFirehose = kdfToS3Construct.kinesisFirehose;
    this.kinesisFirehoseRole = kdfToS3Construct.kinesisFirehoseRole;
    this.kinesisFirehoseLogGroup = kdfToS3Construct.kinesisFirehoseLogGroup;

    if (props.createCloudWatchAlarms === undefined || props.createCloudWatchAlarms) {
      // Deploy best practices CW Alarms for Kinesis Stream
      this.cloudwatchAlarms = defaults.buildKinesisStreamCWAlarms(this);
    }
  }
}