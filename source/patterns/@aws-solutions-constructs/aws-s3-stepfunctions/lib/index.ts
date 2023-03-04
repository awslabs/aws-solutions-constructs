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

import { Construct } from 'constructs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as defaults from '@aws-solutions-constructs/core';
import { EventbridgeToStepfunctions } from '@aws-solutions-constructs/aws-eventbridge-stepfunctions';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Stack } from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as events from 'aws-cdk-lib/aws-events';
import * as logs from 'aws-cdk-lib/aws-logs';

/**
 * @summary The properties for the S3ToStepfunctions Construct
 */
export interface S3ToStepfunctionsProps {
  /**
   * Existing instance of S3 Bucket object, providing both this and `bucketProps` will cause an error.
   * The Amazon EventBridge property must be enabled in the existing bucket for the construct to work.
   *
   * @default - None
   */
  readonly existingBucketObj?: s3.IBucket,
  /**
   * Optional user provided props to override the default props for the S3 Bucket.
   *
   * @default - Default props are used
   */
  readonly bucketProps?: s3.BucketProps,
  /**
   * User provided StateMachineProps to override the defaults
   *
   * @default - None
   */
  readonly stateMachineProps: sfn.StateMachineProps,
  /**
   * Optional user provided eventRuleProps to override the defaults
   *
   * @default - None
   */
  readonly eventRuleProps?: events.RuleProps,
  /**
   * Whether to deploy a Trail in AWS CloudTrail to log API events in Amazon S3
   *
   * @default - true
   */
  readonly deployCloudTrail?: boolean,
  /**
   * Whether to create recommended CloudWatch alarms
   *
   * @default - Alarms are created
   */
  readonly createCloudWatchAlarms?: boolean,
  /**
   * Optional user provided props to override the default props for the CloudWatchLogs LogGroup.
   *
   * @default - Default props are used
   */
  readonly logGroupProps?: logs.LogGroupProps,
  /**
   * Optional user provided props to override the default props for the S3 Logging Bucket.
   *
   * @default - Default props are used
   */
  readonly loggingBucketProps?: s3.BucketProps,
  /**
   * Whether to turn on Access Logs for the S3 bucket with the associated storage costs.
   * Enabling Access Logging is a best practice.
   *
   * @default - true
   */
  readonly logS3AccessLogs?: boolean;
}

export class S3ToStepfunctions extends Construct {
  public readonly stateMachine: sfn.StateMachine;
  public readonly stateMachineLogGroup: logs.ILogGroup;
  public readonly s3Bucket?: s3.Bucket;
  public readonly s3LoggingBucket?: s3.Bucket;
  public readonly cloudwatchAlarms?: cloudwatch.Alarm[];
  public readonly s3BucketInterface: s3.IBucket;

  /**
   * @summary Constructs a new instance of the S3ToStepfunctions class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {S3ToStepfunctionsProps} props - user provided props for the construct
   * @access public
   */
  constructor(scope: Construct, id: string, props: S3ToStepfunctionsProps) {
    super(scope, id);
    defaults.CheckProps(props);

    let bucket: s3.IBucket;

    if (props.deployCloudTrail !== undefined) {
      defaults.printWarning("The deployCloudTrail prop has been deprecated since this construct no longer requires \
      AWS CloudTrail to implement its functionality. This construct no longer creates a CloudTrail in your account.");
    }

    if (!props.existingBucketObj) {
      const buildS3BucketResponse = defaults.buildS3Bucket(this, {
        bucketProps: defaults.consolidateProps({}, props.bucketProps, { eventBridgeEnabled: true }),
        loggingBucketProps: props.loggingBucketProps,
        logS3AccessLogs: props.logS3AccessLogs
      });
      this.s3Bucket = buildS3BucketResponse.bucket;
      this.s3LoggingBucket = buildS3BucketResponse.loggingBucket;

      bucket = this.s3Bucket;

      // Suppress cfn-nag rules that generate warns for S3 bucket notification CDK resources
      defaults.addCfnNagS3BucketNotificationRulesToSuppress(Stack.of(this), 'BucketNotificationsHandler050a0587b7544547bf325f094a3db834');
    } else {
      bucket = props.existingBucketObj;
    }

    this.s3BucketInterface = bucket;

    let _eventRuleProps = {};
    if (props.eventRuleProps) {
      _eventRuleProps = props.eventRuleProps;
    } else {
      // By default the EventBridge Rule will filter any PutObject, POST Object, CopyObject,
      // or CompleteMultipartUpload events for the S3 Bucket
      _eventRuleProps = {
        eventPattern: {
          source: ['aws.s3'],
          detailType: ["Object Created"],
          detail: {
            bucket: {
              name: [bucket.bucketName]
            }
          }
        }
      };
    }

    const eventbridgeToStepfunctions = new EventbridgeToStepfunctions(this, `${id}-event-rule-step-function-construct`, {
      stateMachineProps: props.stateMachineProps,
      eventRuleProps: _eventRuleProps,
      createCloudWatchAlarms: props.createCloudWatchAlarms,
      logGroupProps: props.logGroupProps
    });

    this.stateMachine = eventbridgeToStepfunctions.stateMachine;
    this.stateMachineLogGroup = eventbridgeToStepfunctions.stateMachineLogGroup;
    this.cloudwatchAlarms = eventbridgeToStepfunctions.cloudwatchAlarms;
  }
}