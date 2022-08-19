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

import { S3ToStepFunction, S3ToStepFunctionProps } from '../lib/index';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import '@aws-cdk/assert/jest';
import * as cdk from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';

function deployNewStateMachine(stack: cdk.Stack) {

  const startState = new sfn.Pass(stack, 'StartState');

  const props: S3ToStepFunctionProps = {
    stateMachineProps: {
      definition: startState
    }
  };

  return new S3ToStepFunction(stack, 'test-s3-step-function', props);
}

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
        detailType: ['Object Created'],
        detail: {
          bucket: {
            name: [mybucket.bucketName]
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
        "Object Created"
      ],
      "detail": {
        bucket: {
          name: [{
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
          Ref: "tests3stepfunctiontests3stepfunctionWtests3stepfunctionWeventrulestepfunctionconstructStateMachineAAE00FFE"
        },
        Id: "Target0",
        RoleArn: {
          "Fn::GetAtt": [
            "tests3stepfunctiontests3stepfunctionWtests3stepfunctionWeventrulestepfunctionconstructEventsRuleRole1B233B12",
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

  expect(construct.stateMachine !== null);
  expect(construct.s3Bucket !== null);
  expect(construct.cloudwatchAlarms !== null);
  expect(construct.stateMachineLogGroup !== null);
  expect(construct.s3LoggingBucket !== null);
});

// --------------------------------------------------------------
// Test bad call with existingBucket and bucketProps
// --------------------------------------------------------------
test("Test bad call with existingBucket and bucketProps", () => {
  // Stack
  const stack = new cdk.Stack();

  const testBucket = new Bucket(stack, 'test-bucket', {});
  const startState = new sfn.Pass(stack, 'StartState');

  const app = () => {
    // Helper declaration
    new S3ToStepFunction(stack, "bad-s3-args", {
      stateMachineProps: {
        definition: startState
      },
      existingBucketObj: testBucket,
      bucketProps: {
        removalPolicy: cdk.RemovalPolicy.DESTROY
      },
    });
  };
  // Assertion
  expect(app).toThrowError();
});