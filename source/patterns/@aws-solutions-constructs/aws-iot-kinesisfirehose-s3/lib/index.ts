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

import * as kinesisfirehose from '@aws-cdk/aws-kinesisfirehose';
import * as iot from '@aws-cdk/aws-iot';
import * as s3 from '@aws-cdk/aws-s3';
import * as iam from '@aws-cdk/aws-iam';
import * as logs from '@aws-cdk/aws-logs';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from '@aws-cdk/core';
import * as defaults from '@aws-solutions-constructs/core';
import { overrideProps } from '@aws-solutions-constructs/core';
import { KinesisFirehoseToS3 } from '@aws-solutions-constructs/aws-kinesisfirehose-s3';

/**
 * @summary The properties for the IotToKinesisFirehoseToS3 Construct
 */
export interface IotToKinesisFirehoseToS3Props {
  /**
   * User provided CfnTopicRuleProps to override the defaults
   *
   * @default - Default props are used
   */
  readonly iotTopicRuleProps: iot.CfnTopicRuleProps;
  /**
   * Optional user provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly kinesisFirehoseProps?: kinesisfirehose.CfnDeliveryStreamProps | any;
  /**
   * Existing instance of S3 Bucket object, providing both this and `bucketProps` will cause an error.
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
   * User provided props to override the default props for the CloudWatchLogs LogGroup.
   *
   * @default - Default props are used
   */
  readonly logGroupProps?: logs.LogGroupProps
}

export class IotToKinesisFirehoseToS3 extends Construct {
  public readonly iotTopicRule: iot.CfnTopicRule;
  public readonly kinesisFirehose: kinesisfirehose.CfnDeliveryStream;
  public readonly kinesisFirehoseLogGroup: logs.LogGroup;
  public readonly kinesisFirehoseRole: iam.Role;
  public readonly s3Bucket?: s3.Bucket;
  public readonly s3LoggingBucket?: s3.Bucket;
  public readonly iotActionsRole: iam.Role;

  /**
   * @summary Constructs a new instance of the IotToKinesisFirehoseToS3 class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {CloudFrontToApiGatewayProps} props - user provided props for the construct
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: IotToKinesisFirehoseToS3Props) {
    super(scope, id);
    defaults.CheckProps(props);

    if (props.existingBucketObj && props.bucketProps) {
      throw new Error('Cannot specify both bucket properties and an existing bucket');
    }

    const firehoseToS3 = new KinesisFirehoseToS3(this, 'KinesisFirehoseToS3', {
      kinesisFirehoseProps: props.kinesisFirehoseProps,
      existingBucketObj: props.existingBucketObj,
      bucketProps: props.bucketProps,
      logGroupProps: props.logGroupProps
    });
    this.kinesisFirehose = firehoseToS3.kinesisFirehose;
    this.s3Bucket = firehoseToS3.s3Bucket;

    // Setup the IAM Role for IoT Actions
    this.iotActionsRole = new iam.Role(this, 'IotActionsRole', {
      assumedBy: new iam.ServicePrincipal('iot.amazonaws.com'),
    });

    // Setup the IAM policy for IoT Actions
    const iotActionsPolicy = new iam.Policy(this, 'IotActionsPolicy', {
      statements: [new iam.PolicyStatement({
        actions: [
          'firehose:PutRecord'
        ],
        resources: [this.kinesisFirehose.attrArn]
      })
      ]});

    // Attach policy to role
    iotActionsPolicy.attachToRole(this.iotActionsRole);

    const defaultIotTopicProps = defaults.DefaultCfnTopicRuleProps([{
      firehose: {
        deliveryStreamName: this.kinesisFirehose.ref,
        roleArn: this.iotActionsRole.roleArn
      }
    }]);
    const iotTopicProps = overrideProps(defaultIotTopicProps, props.iotTopicRuleProps, true);

    // Create the IoT topic rule
    this.iotTopicRule = new iot.CfnTopicRule(this, 'IotTopic', iotTopicProps);

    this.kinesisFirehoseRole = firehoseToS3.kinesisFirehoseRole;
    this.s3LoggingBucket = firehoseToS3.s3LoggingBucket;
    this.kinesisFirehoseLogGroup = firehoseToS3.kinesisFirehoseLogGroup;
  }
}