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

import { IotToKinesisFirehoseToS3, IotToKinesisFirehoseToS3Props } from "../lib";
import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import '@aws-cdk/assert/jest';

function deploy(stack: cdk.Stack) {
  const props: IotToKinesisFirehoseToS3Props = {
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "Persistent storage of connected vehicle telematics data",
        sql: "SELECT * FROM 'connectedcar/telemetry/#'",
        actions: []
      }
    },
    bucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY
    }
  };

  return new IotToKinesisFirehoseToS3(stack, 'test-iot-firehose-s3', props);
}

test('check iot topic rule properties', () => {
  const stack = new cdk.Stack();

  deploy(stack);

  expect(stack).toHaveResource('AWS::IoT::TopicRule', {
    TopicRulePayload: {
      Actions: [
        {
          Firehose: {
            DeliveryStreamName: {
              Ref: "testiotfirehoses3KinesisFirehoseToS3KinesisFirehose68DB2BEE"
            },
            RoleArn: {
              "Fn::GetAtt": [
                "testiotfirehoses3IotActionsRole743F8973",
                "Arn"
              ]
            }
          }
        }
      ],
      Description: "Persistent storage of connected vehicle telematics data",
      RuleDisabled: false,
      Sql: "SELECT * FROM 'connectedcar/telemetry/#'"
    }
  });
});

test('check firehose and s3 overrides', () => {
  const stack = new cdk.Stack();

  const props: IotToKinesisFirehoseToS3Props = {
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "Persistent storage of connected vehicle telematics data",
        sql: "SELECT * FROM 'connectedcar/telemetry/#'",
        actions: []
      }
    },
    kinesisFirehoseProps: {
      extendedS3DestinationConfiguration: {
        bufferingHints: {
          intervalInSeconds: 600,
          sizeInMBs: 55
        },
      }
    },
    bucketProps: {
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: true,
        ignorePublicAcls: false,
        restrictPublicBuckets: true
      }
    }
  };
  new IotToKinesisFirehoseToS3(stack, 'test-iot-firehose-s3', props);

  expect(stack).toHaveResource("AWS::S3::Bucket", {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: false,
      BlockPublicPolicy: true,
      IgnorePublicAcls: false,
      RestrictPublicBuckets: true
    },
  });

  expect(stack).toHaveResourceLike("AWS::KinesisFirehose::DeliveryStream", {
    ExtendedS3DestinationConfiguration: {
      BufferingHints: {
        IntervalInSeconds: 600,
        SizeInMBs: 55
      }
    }});
});
test('check properties', () => {
  const stack = new cdk.Stack();

  const construct: IotToKinesisFirehoseToS3 = deploy(stack);

  expect(construct.iotTopicRule !== null);
  expect(construct.kinesisFirehose !== null);
  expect(construct.s3Bucket !== null);
  expect(construct.iotActionsRole !== null);
  expect(construct.kinesisFirehoseRole !== null);
  expect(construct.kinesisFirehoseLogGroup !== null);
  expect(construct.s3LoggingBucket !== null);
});

// --------------------------------------------------------------
// Test bad call with existingBucket and bucketProps
// --------------------------------------------------------------
test("Test bad call with existingBucket and bucketProps", () => {
  // Stack
  const stack = new cdk.Stack();

  const testBucket = new s3.Bucket(stack, 'test-bucket', {});

  const app = () => {
    // Helper declaration
    new IotToKinesisFirehoseToS3(stack, "bad-s3-args", {
      iotTopicRuleProps: {
        topicRulePayload: {
          ruleDisabled: false,
          description: "Persistent storage of connected vehicle telematics data",
          sql: "SELECT * FROM 'connectedcar/telemetry/#'",
          actions: []
        }
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