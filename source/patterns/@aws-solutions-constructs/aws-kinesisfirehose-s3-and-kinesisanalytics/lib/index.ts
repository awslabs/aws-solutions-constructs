/**
 *  Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

// Imports
import * as kinesisFirehose from 'aws-cdk-lib/aws-kinesisfirehose';
import * as kinesisAnalytics from 'aws-cdk-lib/aws-kinesisanalytics';
import { KinesisFirehoseToS3, KinesisFirehoseToS3Props } from '@aws-solutions-constructs/aws-kinesisfirehose-s3';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

/**
 * The properties for the KinesisFirehoseToAnalyticsAndS3 class.
 */
export interface KinesisFirehoseToAnalyticsAndS3Props {
  /**
   * Optional user-provided props to override the default props for the Kinesis Firehose delivery stream.
   *
   * @default - Default props are used.
   */
  readonly kinesisFirehoseProps?: kinesisFirehose.CfnDeliveryStreamProps | any,
  /**
   * Optional user-provided props to override the default props for the Kinesis Analytics application.
   *
   * @default - Default props are used.
   */
  readonly kinesisAnalyticsProps?: kinesisAnalytics.CfnApplicationProps,
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

/**
 * @summary The KinesisFirehoseToAnalyticsAndS3 class.
 */
export class KinesisFirehoseToAnalyticsAndS3 extends Construct {
  public readonly kinesisAnalytics: kinesisAnalytics.CfnApplication;
  public readonly kinesisFirehose: kinesisFirehose.CfnDeliveryStream;
  public readonly kinesisFirehoseRole: iam.Role;
  public readonly kinesisFirehoseLogGroup: logs.LogGroup;
  public readonly s3Bucket?: s3.Bucket;
  public readonly s3LoggingBucket?: s3.Bucket;
  public readonly s3BucketInterface: s3.IBucket;

  /**
   * @summary Constructs a new instance of the KinesisFirehoseToAnalyticsAndS3 class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {KinesisFirehoseToAnalyticsAndS3Props} props - user provided props for the construct
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: KinesisFirehoseToAnalyticsAndS3Props) {
    super(scope, id);
    defaults.CheckProps(props);

    // Setup the kinesisfirehose-s3 pattern
    const kinesisFirehoseToS3Props: KinesisFirehoseToS3Props = {
      kinesisFirehoseProps: props.kinesisFirehoseProps,
      existingBucketObj: props.existingBucketObj,
      bucketProps: props.bucketProps,
      logGroupProps: props.logGroupProps,
      loggingBucketProps: props.loggingBucketProps,
      logS3AccessLogs: props.logS3AccessLogs
    };

    // Add the kinesisfirehose-s3 pattern
    const kfs = new KinesisFirehoseToS3(this, 'KinesisFirehoseToS3', kinesisFirehoseToS3Props);

    // Add the Kinesis Analytics application
    this.kinesisAnalytics = defaults.buildKinesisAnalyticsApp(this, {
      kinesisFirehose: kfs.kinesisFirehose,
      kinesisAnalyticsProps: props.kinesisAnalyticsProps
    });

    this.kinesisFirehose = kfs.kinesisFirehose;
    this.kinesisFirehoseLogGroup = kfs.kinesisFirehoseLogGroup;
    this.kinesisFirehoseRole = kfs.kinesisFirehoseRole;
    this.s3Bucket = kfs.s3Bucket;
    this.s3LoggingBucket = kfs.s3LoggingBucket;
    this.s3BucketInterface = kfs.s3BucketInterface;
  }
}