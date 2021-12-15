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
import { S3ToStepfunctions } from '@aws-solutions-constructs/aws-s3-stepfunctions';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from '@aws-cdk/core';
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';
import * as events from '@aws-cdk/aws-events';
import * as logs from '@aws-cdk/aws-logs';

/**
 * @summary The properties for the S3ToStepFunction Construct
 */
export interface S3ToStepFunctionProps {
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
   * Optional User provided eventRuleProps to override the defaults
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
   * User provided props to override the default props for the CloudWatchLogs LogGroup.
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

export class S3ToStepFunction extends Construct {
  public readonly stateMachine: sfn.StateMachine;
  public readonly stateMachineLogGroup: logs.ILogGroup;
  public readonly s3Bucket?: s3.Bucket;
  public readonly s3LoggingBucket?: s3.Bucket;
  public readonly cloudwatchAlarms?: cloudwatch.Alarm[];
  public readonly s3BucketInterface: s3.IBucket;

  /**
   * @summary Constructs a new instance of the S3ToStepFunction class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {S3ToStepFunctionProps} props - user provided props for the construct
   * @access public
   */
  constructor(scope: Construct, id: string, props: S3ToStepFunctionProps) {
    super(scope, id);
    const convertedProps: S3ToStepFunctionProps = { ...props };

    // W (for 'wrapped') is added to the id so that the id's of the constructs with the old and new names don't collide
    // If this character pushes you beyond the 64 character limit, just import the new named construct and instantiate
    // it in place of the older named version. They are functionally identical, aside from the types no other changes
    // will be required.  (eg - new S3ToStepfunctions instead of S3ToStepFunction)
    const wrappedConstruct: S3ToStepFunction = new S3ToStepfunctions(this, `${id}W`, convertedProps);

    this.stateMachine = wrappedConstruct.stateMachine;
    this.stateMachineLogGroup = wrappedConstruct.stateMachineLogGroup;
    this.s3Bucket = wrappedConstruct.s3Bucket;
    this.s3LoggingBucket = wrappedConstruct.s3LoggingBucket;
    this.cloudwatchAlarms = wrappedConstruct.cloudwatchAlarms;
    this.s3BucketInterface = wrappedConstruct.s3BucketInterface;
  }
}