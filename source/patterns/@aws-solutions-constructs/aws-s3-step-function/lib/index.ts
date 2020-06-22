/**
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { EventsRuleToStepFunction } from '@aws-solutions-constructs/aws-events-rule-step-function';
import { Construct } from '@aws-cdk/core';
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';
import * as cloudtrail from '@aws-cdk/aws-cloudtrail';
import * as events from '@aws-cdk/aws-events';

/**
 * @summary The properties for the S3ToStepFunction Construct
 */
export interface S3ToStepFunctionProps {
  /**
   * Whether to create a S3 Bucket or use an existing S3 Bucket.
   * If set to false, you must provide S3 Bucket as `existingBucketObj`
   *
   * @default - true
   */
  readonly deployBucket?: boolean,
  /**
   * Existing instance of S3 Bucket object.
   * If `deployBucket` is set to false only then this property is required
   *
   * @default - None
   */
  readonly existingBucketObj?: s3.Bucket,
  /**
   * Optional user provided props to override the default props.
   * If `deploy` is set to true only then this property is required
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
   * User provided eventRuleProps to override the defaults
   *
   * @default - None
   */
  readonly eventRuleProps?: events.RuleProps;
  /**
   * Whether to deploy a Trail in AWS CloudTrail to log API events in Amazon S3
   *
   * @default - true
   */
  readonly deployCloudTrail?: boolean
}

export class S3ToStepFunction extends Construct {
  public readonly stateMachine: sfn.StateMachine;
  public readonly s3Bucket: s3.Bucket;
  public readonly cloudwatchAlarms: cloudwatch.Alarm[];
  public readonly cloudtrail: cloudtrail.Trail | undefined;

  /**
   * @summary Constructs a new instance of the S3ToStepFunction class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {S3ToStepFunctionProps} props - user provided props for the construct
   * @since 0.9.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: S3ToStepFunctionProps) {
    super(scope, id);

    this.s3Bucket = defaults.buildS3Bucket(this, {
      deployBucket: props.deployBucket,
      existingBucketObj: props.existingBucketObj,
      bucketProps: props.bucketProps
    });

    this.addCfnNagSuppress(this.s3Bucket);

    if (!props.hasOwnProperty('deployCloudTrail') || props.deployCloudTrail === true) {
      const trailBucket = defaults.buildS3Bucket(this, {
        deployBucket: true
      }, 'CloudTrail');

      this.addCfnNagSuppress(trailBucket);

      this.cloudtrail = new cloudtrail.Trail(this, 'S3EventsTrail', {
        bucket: trailBucket
      });

      this.cloudtrail.addS3EventSelector([{
        bucket: this.s3Bucket
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
              "PutObject"
            ],
            requestParameters: {
              bucketName: [
                this.s3Bucket.bucketName
              ]
            }
          }
        }
      };
    }

    const eventsRuleToStepFunction = new EventsRuleToStepFunction(this, 'test-events-rule-step-function-stack', {
      stateMachineProps: props.stateMachineProps,
      eventRuleProps: _eventRuleProps
    });

    this.stateMachine = eventsRuleToStepFunction.stateMachine;
    this.cloudwatchAlarms = eventsRuleToStepFunction.cloudwatchAlarms;
  }

  private addCfnNagSuppress(bucket: s3.Bucket) {
    // Extract the CfnBucket from the s3Bucket
    const s3BucketResource = bucket.node.findChild('Resource') as s3.CfnBucket;

    s3BucketResource.cfnOptions.metadata = {
        cfn_nag: {
            rules_to_suppress: [{
                id: 'W51',
                reason: `This S3 bucket Bucket does not need a bucket policy`
            }]
        }
    };
  }
}