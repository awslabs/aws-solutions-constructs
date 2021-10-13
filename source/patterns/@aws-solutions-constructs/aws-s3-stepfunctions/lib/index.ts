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

import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as s3 from '@aws-cdk/aws-s3';
import * as defaults from '@aws-solutions-constructs/core';
import { EventbridgeToStepfunctions } from '@aws-solutions-constructs/aws-eventbridge-stepfunctions';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from '@aws-cdk/core';
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';
import * as cloudtrail from '@aws-cdk/aws-cloudtrail';
import * as events from '@aws-cdk/aws-events';
import * as logs from '@aws-cdk/aws-logs';

/**
 * @summary The properties for the S3ToStepfunctions Construct
 */
export interface S3ToStepfunctionsProps {
  /**
   * Existing instance of S3 Bucket object, providing both this and `bucketProps` will cause an error.
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
  readonly eventRuleProps?: events.RuleProps;
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
  readonly logGroupProps?: logs.LogGroupProps
  /**
   * Optional user provided props to override the default props for the S3 Logging Bucket.
   *
   * @default - Default props are used
   */
   readonly loggingBucketProps?: s3.BucketProps
}

export class S3ToStepfunctions extends Construct {
  public readonly stateMachine: sfn.StateMachine;
  public readonly stateMachineLogGroup: logs.ILogGroup;
  public readonly s3Bucket?: s3.Bucket;
  public readonly s3LoggingBucket?: s3.Bucket;
  public readonly cloudwatchAlarms?: cloudwatch.Alarm[];
  public readonly cloudtrail?: cloudtrail.Trail;
  public readonly cloudtrailBucket?: s3.Bucket;
  public readonly cloudtrailLoggingBucket?: s3.Bucket;

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

    if (props.existingBucketObj && props.bucketProps) {
      throw new Error('Cannot specify both bucket properties and an existing bucket');
    }

    if (!props.existingBucketObj) {
      [this.s3Bucket, this.s3LoggingBucket] = defaults.buildS3Bucket(this, {
        bucketProps: props.bucketProps,
        loggingBucketProps: props.loggingBucketProps
      });
      bucket = this.s3Bucket;
    } else {
      bucket = props.existingBucketObj;
    }

    if (props.deployCloudTrail === undefined || props.deployCloudTrail) {
      [this.cloudtrailBucket, this.cloudtrailLoggingBucket] = defaults.buildS3Bucket(this, {}, 'CloudTrail');

      this.cloudtrail = new cloudtrail.Trail(this, 'S3EventsTrail', {
        bucket: this.cloudtrailBucket
      });

      this.cloudtrail.addS3EventSelector([{
        bucket
      }], {
        readWriteType: cloudtrail.ReadWriteType.ALL,
        includeManagementEvents: false
      });
    }

    let _eventRuleProps = {};
    if (props.eventRuleProps) {
      _eventRuleProps = props.eventRuleProps;
    } else {
      // By default the CW Events Rule will filter any 's3:PutObject' events for the S3 Bucket
      _eventRuleProps = {
        eventPattern: {
          source: ['aws.s3'],
          detailType: ['AWS API Call via CloudTrail'],
          detail: {
            eventSource: [
              "s3.amazonaws.com"
            ],
            eventName: [
              "PutObject",
              "CopyObject",
              "CompleteMultipartUpload"
            ],
            requestParameters: {
              bucketName: [
                bucket.bucketName
              ]
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