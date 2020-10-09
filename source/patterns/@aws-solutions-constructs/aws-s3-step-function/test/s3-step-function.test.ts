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

import { SynthUtils } from '@aws-cdk/assert';
import { S3ToStepFunction, S3ToStepFunctionProps } from '../lib/index';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import '@aws-cdk/assert/jest';
import * as cdk from '@aws-cdk/core';
import { Bucket } from '@aws-cdk/aws-s3';

function deployNewStateMachine(stack: cdk.Stack) {

  const startState = new sfn.Pass(stack, 'StartState');

  const props: S3ToStepFunctionProps = {
    stateMachineProps: {
      definition: startState
    }
  };

  return new S3ToStepFunction(stack, 'test-s3-step-function', props);
}

test('snapshot test S3ToStepFunction default params', () => {
  const stack = new cdk.Stack();
  deployNewStateMachine(stack);
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('check deployCloudTrail = false', () => {
  const stack = new cdk.Stack();

  const startState = new sfn.Pass(stack, 'StartState');

  const props: S3ToStepFunctionProps = {
    stateMachineProps: {
      definition: startState
    },
    deployCloudTrail: false
  };

  const construct = new S3ToStepFunction(stack, 'test-s3-step-function', props);

  expect(construct.cloudtrail === undefined);
});

test('override eventRuleProps', () => {
  const stack = new cdk.Stack();

  const mybucket = new Bucket(stack, 'mybucket');
  const startState = new sfn.Pass(stack, 'StartState');

  const props: S3ToStepFunctionProps = {
    stateMachineProps: {
      definition: startState
    },
    existingBucketObj: mybucket,
    eventRuleProps: {
      eventPattern: {
          source: ['aws.s3'],
          detailType: ['AWS API Call via CloudTrail'],
          detail: {
            eventSource: [
              "s3.amazonaws.com"
            ],
            eventName: [
              "GetObject"
            ],
            requestParameters: {
              bucketName: [
                mybucket.bucketName
              ]
            }
          }
      }
    }
  };

  new S3ToStepFunction(stack, 'test-s3-step-function', props);

  expect(stack).toHaveResource('AWS::Events::Rule', {
    EventPattern: {
      "source": [
        "aws.s3"
      ],
      "detail-type": [
        "AWS API Call via CloudTrail"
      ],
      "detail": {
        eventSource: [
          "s3.amazonaws.com"
        ],
        eventName: [
          "GetObject"
        ],
        requestParameters: {
          bucketName: [
            {
              Ref: "mybucket160F8132"
            }
          ]
        }
      }
    },
    State: "ENABLED",
    Targets: [
      {
        Arn: {
          Ref: "tests3stepfunctiontesteventsrulestepfunctionstackStateMachine5A6C0DFF"
        },
        Id: "Target0",
        RoleArn: {
          "Fn::GetAtt": [
            "tests3stepfunctiontesteventsrulestepfunctionstackEventsRuleRoleF447A174",
            "Arn"
          ]
        }
      }
    ]
  });
});

test('check properties', () => {
  const stack = new cdk.Stack();

  const construct: S3ToStepFunction = deployNewStateMachine(stack);

  expect(construct.cloudtrail !== null);
  expect(construct.stateMachine !== null);
  expect(construct.s3Bucket !== null);
  expect(construct.cloudwatchAlarms !== null);
  expect(construct.stateMachineLogGroup !== null);
  expect(construct.s3LoggingBucket !== null);
  expect(construct.cloudtrail !== null);
  expect(construct.cloudtrailBucket !== null);
  expect(construct.cloudtrailLoggingBucket !== null);
});
