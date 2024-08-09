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

import { S3ToStepfunctions, S3ToStepfunctionsProps } from '../lib/index';
import * as cdk from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Template } from 'aws-cdk-lib/assertions';
import * as defaults from '@aws-solutions-constructs/core';

function deployNewStateMachine(stack: cdk.Stack) {

  const props: S3ToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 's3stp-test')
    }
  };

  return new S3ToStepfunctions(stack, 'test-s3-stepfunctions', props);
}

test('override eventRuleProps', () => {
  const stack = new cdk.Stack();

  const mybucket = new Bucket(stack, 'mybucket');

  const props: S3ToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 's3stp-test')
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
    },
    deployCloudTrail: false // Testing warning
  };

  new S3ToStepfunctions(stack, 'test-s3-stepfunctions', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Events::Rule', {
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
          Ref: "tests3stepfunctionstests3stepfunctionseventrulestepfunctionconstructStateMachine67197269"
        },
        Id: "Target0",
        RoleArn: {
          "Fn::GetAtt": [
            "tests3stepfunctionstests3stepfunctionseventrulestepfunctionconstructEventsRuleRoleE7CAD359",
            "Arn"
          ]
        }
      }
    ]
  });
});

test('check properties', () => {
  const stack = new cdk.Stack();

  const construct: S3ToStepfunctions = deployNewStateMachine(stack);

  expect(construct.stateMachine).toBeDefined();
  expect(construct.s3Bucket).toBeDefined();
  expect(construct.cloudwatchAlarms).toBeDefined();
  expect(construct.stateMachineLogGroup).toBeDefined();
  expect(construct.s3LoggingBucket).toBeDefined();
});

// --------------------------------------------------------------
// Test bad call with existingBucket and bucketProps
// --------------------------------------------------------------
test("Confirm that CheckS3Props is getting called", () => {
  // Stack
  const stack = new cdk.Stack();

  const testBucket = new Bucket(stack, 'test-bucket', {});

  const app = () => {
    // Helper declaration
    new S3ToStepfunctions(stack, "bad-s3-args", {
      stateMachineProps: {
        definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 's3stp-test')
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

// --------------------------------------------------------------
// s3 bucket with bucket, loggingBucket, and auto delete objects
// --------------------------------------------------------------
test('s3 bucket with bucket, loggingBucket, and auto delete objects', () => {
  const stack = new cdk.Stack();

  const testProps: S3ToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 's3stp-test')
    },
    bucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY
    },
    loggingBucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    }
  };

  new S3ToStepfunctions(stack, 'test-s3-stepfunctions', testProps);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("Custom::S3BucketNotifications", {});
  template.resourceCountIs("AWS::S3::Bucket", 2);

  template.hasResourceProperties("Custom::S3AutoDeleteObjects", {
    ServiceToken: {
      "Fn::GetAtt": [
        "CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F",
        "Arn"
      ]
    },
    BucketName: {
      Ref: "tests3stepfunctionsS3LoggingBucketF7586A92"
    }
  });
});

// --------------------------------------------------------------
// s3 bucket with one content bucket and no logging bucket
// --------------------------------------------------------------
test('s3 bucket with no logging bucket', () => {
  const stack = new cdk.Stack();

  const construct = new S3ToStepfunctions(stack, 's3-stepfunctions', {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 's3stp-test')
    },
    bucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    },
    logS3AccessLogs: false
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("Custom::S3BucketNotifications", {});
  expect(construct.s3LoggingBucket).toEqual(undefined);
});
