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

import * as events from 'aws-cdk-lib/aws-events';
import * as kinesisfirehose from 'aws-cdk-lib/aws-kinesisfirehose';
import * as defaults from '@aws-solutions-constructs/core';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as logs from 'aws-cdk-lib/aws-logs';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import { overrideProps } from '@aws-solutions-constructs/core';
import { KinesisFirehoseToS3 } from '@aws-solutions-constructs/aws-kinesisfirehose-s3';

/**
 * @summary The properties for the EventbridgeToKinesisFirehoseToS3 Construct
 */
export interface EventbridgeToKinesisFirehoseToS3Props {
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

export class EventbridgeToKinesisFirehoseToS3 extends Construct {
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
   * @summary Constructs a new instance of the EventbridgeToKinesisFirehoseToS3 class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {EventbridgeToKinesisFirehoseToS3Props} props - user provided props for the construct
   * @access public
   */
  constructor(scope: Construct, id: string, props: EventbridgeToKinesisFirehoseToS3Props) {
    super(scope, id);

    // All our tests are based upon this behavior being on, so we're setting
    // context here rather than assuming the client will set it
    this.node.setContext("@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy", true);

    defaults.CheckProps(props);
    defaults.CheckEventBridgeProps(props);
    // CheckS3Props is called by internal aws-kinesisfirehose-s3 construct

    // Set up the Kinesis Firehose using KinesisFirehoseToS3 construct
    const firehoseToS3 = new KinesisFirehoseToS3(this, 'KinesisFirehoseToS3', {
      kinesisFirehoseProps: props.kinesisFirehoseProps,
      existingBucketObj: props.existingBucketObj,
      bucketProps: props.bucketProps,
      logGroupProps: props.logGroupProps,
      loggingBucketProps: props.loggingBucketProps,
      logS3AccessLogs: props.logS3AccessLogs
    });
    this.kinesisFirehose = firehoseToS3.kinesisFirehose;
    this.s3Bucket = firehoseToS3.s3Bucket;
    this.kinesisFirehoseRole = firehoseToS3.kinesisFirehoseRole;
    this.s3LoggingBucket = firehoseToS3.s3LoggingBucket;
    this.kinesisFirehoseLogGroup = firehoseToS3.kinesisFirehoseLogGroup;
    this.s3BucketInterface = firehoseToS3.s3BucketInterface;

    // Create an events service role
    this.eventsRole = new iam.Role(this, 'EventsRuleInvokeKinesisFirehoseRole', {
      assumedBy: new iam.ServicePrincipal('events.amazonaws.com'),
      description: 'Events Rule To Kinesis Firehose Role',
    });

    // Setup the IAM policy that grants events rule the permission to send cw events data to kinesis firehose
    const eventsPolicy = new iam.Policy(this, 'EventsRuleInvokeKinesisFirehosePolicy', {
      statements: [new iam.PolicyStatement({
        actions: [
          'firehose:PutRecord',
          'firehose:PutRecordBatch'
        ],
        resources: [this.kinesisFirehose.attrArn]
      })
      ]});

    // Attach policy to role
    eventsPolicy.attachToRole(this.eventsRole);

    // Set up the Kinesis Firehose as the target for event rule
    const KinesisFirehoseEventTarget: events.IRuleTarget = {
      bind: () => ({
        id: '',
        arn: this.kinesisFirehose.attrArn,
        role: this.eventsRole
      })
    };

    // build an event bus if existingEventBus is provided or eventBusProps are provided
    this.eventBus = defaults.buildEventBus(this, {
      existingEventBusInterface: props.existingEventBusInterface,
      eventBusProps: props.eventBusProps
    });

    // Set up the events rule props
    const defaultEventsRuleProps = defaults.DefaultEventsRuleProps([KinesisFirehoseEventTarget], this.eventBus);
    const eventsRuleProps = overrideProps(defaultEventsRuleProps, props.eventRuleProps, true);

    this.eventsRule = new events.Rule(this, 'EventsRule', eventsRuleProps);

  }
}