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

import * as events from '@aws-cdk/aws-events';
import * as kinesisfirehose from '@aws-cdk/aws-kinesisfirehose';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import * as logs from '@aws-cdk/aws-logs';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from '@aws-cdk/core';
import { EventbridgeToKinesisFirehoseToS3 } from '@aws-solutions-constructs/aws-eventbridge-kinesisfirehose-s3';

/**
 * @summary The properties for the EventsRuleToKinesisFirehoseToS3 Construct
 */
export interface EventsRuleToKinesisFirehoseToS3Props {
  /**
   * Existing instance of a custom EventBus.
   *
   * @default - None
   */
  readonly existingEventBusInterface?: events.IEventBus;
  /**
   * A new custom EventBus is created with provided props.
   *
   * @default - None
   */
  readonly eventBusProps?: events.EventBusProps;
  /**
   * User provided eventRuleProps to override the defaults
   *
   * @default - None
   */
  readonly eventRuleProps: events.RuleProps;
  /**
   * User provided props to override the default props for the Kinesis Firehose.
   *
   * @default - Default props are used
   */
  readonly kinesisFirehoseProps?: kinesisfirehose.CfnDeliveryStreamProps | any;
  /**
   * Existing instance of S3 Bucket object, providing both this and `bucketProps` will cause an error.
   *
   * @default - None
   */
  readonly existingBucketObj?: s3.IBucket;
  /**
   * User provided props to override the default props for the S3 Bucket.
   *
   * @default - Default props are used
   */
  readonly bucketProps?: s3.BucketProps;
  /**
   * User provided props to override the default props for the CloudWatchLogs LogGroup.
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

export class EventsRuleToKinesisFirehoseToS3 extends Construct {
  public readonly eventsRule: events.Rule;
  public readonly eventsRole: iam.Role;
  public readonly kinesisFirehose: kinesisfirehose.CfnDeliveryStream;
  public readonly kinesisFirehoseLogGroup: logs.LogGroup;
  public readonly kinesisFirehoseRole: iam.Role;
  public readonly s3Bucket?: s3.Bucket;
  public readonly s3LoggingBucket?: s3.Bucket;
  public readonly eventBus?: events.IEventBus;
  public readonly s3BucketInterface: s3.IBucket;

  /**
   * @summary Constructs a new instance of the EventsRuleToKinesisFirehoseToS3 class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {EventsRuleToKinesisFirehoseToS3Props} props - user provided props for the construct
   * @access public
   */
  constructor(scope: Construct, id: string, props: EventsRuleToKinesisFirehoseToS3Props) {
    super(scope, id);
    const convertedProps: EventsRuleToKinesisFirehoseToS3Props = { ...props };

    // W (for 'wrapped') is added to the id so that the id's of the constructs with the old and new names don't collide
    // If this character pushes you beyond the 64 character limit, just import the new named construct and instantiate
    // it in place of the older named version. They are functionally identical, aside from the types no other changes
    // will be required.  (eg - new EventbridgeToKinesisFirehoseToS3 instead of EventsRuleToKinesisFirehoseToS3)
    const wrappedConstruct: EventsRuleToKinesisFirehoseToS3 = new EventbridgeToKinesisFirehoseToS3(this, `${id}W`, convertedProps);
    this.eventsRule = wrappedConstruct.eventsRule;
    this.eventsRole = wrappedConstruct.eventsRole;
    this.kinesisFirehose = wrappedConstruct.kinesisFirehose;
    this.kinesisFirehoseLogGroup = wrappedConstruct.kinesisFirehoseLogGroup;
    this.kinesisFirehoseRole = wrappedConstruct.kinesisFirehoseRole;
    this.s3Bucket = wrappedConstruct.s3Bucket;
    this.s3LoggingBucket = wrappedConstruct.s3LoggingBucket;
    this.eventBus = wrappedConstruct.eventBus;
    this.s3BucketInterface = wrappedConstruct.s3BucketInterface;
  }
}