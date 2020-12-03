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

// Imports
import { Stack } from "@aws-cdk/core";
import { S3ToSqs, S3ToSqsProps } from "../lib";
import * as sqs from '@aws-cdk/aws-sqs';
import * as kms from '@aws-cdk/aws-kms';
import * as s3 from '@aws-cdk/aws-s3';
import '@aws-cdk/assert/jest';
import * as defaults from '@aws-solutions-constructs/core';

// --------------------------------------------------------------
// Test the getter methods
// --------------------------------------------------------------
test('Test getter methods', () => {
    // Initial Setup
    const stack = new Stack();
    const filter: s3.NotificationKeyFilter = { prefix: 'the/place', suffix: '*.mp3' };
    const props: S3ToSqsProps = {
        deployDeadLetterQueue: true,
        maxReceiveCount: 0,
        queueProps: {},
        s3EventTypes: [s3.EventType.OBJECT_REMOVED],
        s3EventFilters: [filter]
    };
    const app = new S3ToSqs(stack, 'test-s3-sqs', props);
    // Assertion 1
    expect(app.sqsQueue !== null);
    // Assertion 2
    expect(app.deadLetterQueue !== null);
    // Assertion 3
    expect(app.s3Bucket !== null);
});

// --------------------------------------------------------------
// Test deployment w/ existing queue
// --------------------------------------------------------------
test('Test deployment w/ existing queue', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const kmsKey: kms.Key = new kms.Key(stack, 'ExistingQueueEncryptionKey', {});
  const queue = new sqs.Queue(stack, 'existing-queue-obj', {
    queueName: 'existing-queue-obj',
    encryptionMasterKey: kmsKey
  });
  new S3ToSqs(stack, 'test-s3-sqs', {
    existingQueueObj: queue
  });
  // Assertion 1
  expect(stack).toHaveResource("Custom::S3BucketNotifications", {
    NotificationConfiguration: {
      QueueConfigurations: [
        {
          Events: ['s3:ObjectCreated:*'],
          QueueArn: {
            "Fn::GetAtt": [
              "existingqueueobjF8AF0ED1",
              "Arn"
            ]
          }
        }
      ]
    }
  });
});

// --------------------------------------------------------------
// Test deployment w/ existing s3 Bucket
// --------------------------------------------------------------
test('Test deployment w/ existing Bucket', () => {
    // Stack
    const stack = new Stack();
    // Helper declaration

    const [myBucket] = defaults.buildS3Bucket(stack, {});
    new S3ToSqs(stack, 'test-s3-sqs', {
        existingBucketObj: myBucket
    });
    // Assertion 1
    expect(stack).toHaveResource("Custom::S3BucketNotifications", {
      NotificationConfiguration: {
        QueueConfigurations: [
          {
            Events: ['s3:ObjectCreated:*'],
            QueueArn: {
              "Fn::GetAtt": [
                "tests3sqsqueue810CCE19",
                "Arn"
              ]
            }
          }
        ]
      }
    });
});

// --------------------------------------------------------------
// Pattern deployment w/ bucket block public access override
// --------------------------------------------------------------
test('Pattern deployment w/ bucket versioning turned off', () => {
    const stack = new Stack();
    const props: S3ToSqsProps = {
        bucketProps: {
            blockPublicAccess: {
                blockPublicAcls: false,
                blockPublicPolicy: true,
                ignorePublicAcls: false,
                restrictPublicBuckets: true
            }
        }
    };
    new S3ToSqs(stack, 'test-s3-sqs', props);
    expect(stack).toHaveResource("AWS::S3::Bucket", {
        PublicAccessBlockConfiguration: {
            BlockPublicAcls: false,
            BlockPublicPolicy: true,
            IgnorePublicAcls: false,
            RestrictPublicBuckets: true
        }
    });
});

// --------------------------------------------------------------
// Test deployment w/ specific s3 event types
// --------------------------------------------------------------
test('Test deployment w/ s3 event types and filters', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const filter: s3.NotificationKeyFilter = {
    prefix: 'the/place',
    suffix: '*.mp3'
  };
  const props: S3ToSqsProps = {
    deployDeadLetterQueue: true,
    maxReceiveCount: 0,
    queueProps: {},
    s3EventTypes: [s3.EventType.OBJECT_REMOVED],
    s3EventFilters: [filter]
  };
  new S3ToSqs(stack, 'test-s3-sqs', props);
  // Assertion 1
  expect(stack).toHaveResource("Custom::S3BucketNotifications", {
    NotificationConfiguration: {
      QueueConfigurations: [
        {
          Events: ['s3:ObjectRemoved:*'],
          Filter: {
            Key: {
              FilterRules: [
                {
                  Name: 'suffix',
                  Value: '*.mp3'
                },
                {
                  Name: 'prefix',
                  Value: 'the/place'
                }
              ]
            }
          },
          QueueArn: {
            "Fn::GetAtt": [
              "tests3sqsqueue810CCE19",
              "Arn"
            ]
          }
        }
      ]
    }
  });
});

// --------------------------------------------------------------
// Test deployment w/ SSE encryption enabled using customer managed KMS CMK
// --------------------------------------------------------------
test('Test deployment w/ SSE encryption enabled using customer managed KMS CMK', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new S3ToSqs(stack, 'test-s3-sqs', {
    enableEncryptionWithCustomerManagedKey: true
  });

  // Assertion 1
  expect(stack).toHaveResource("Custom::S3BucketNotifications");

  // Assertion 2
  expect(stack).toHaveResource("AWS::SQS::Queue", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "tests3sqsEncryptionKeyFD4D5946",
        "Arn"
      ]
    }
  });

  // Assertion 3
  expect(stack).toHaveResource('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: [
          {
            Action: [
              "kms:Create*",
              "kms:Describe*",
              "kms:Enable*",
              "kms:List*",
              "kms:Put*",
              "kms:Update*",
              "kms:Revoke*",
              "kms:Disable*",
              "kms:Get*",
              "kms:Delete*",
              "kms:ScheduleKeyDeletion",
              "kms:CancelKeyDeletion",
              "kms:GenerateDataKey",
              "kms:TagResource",
              "kms:UntagResource"
            ],
            Effect: "Allow",
            Principal: {
              AWS: {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      Ref: "AWS::Partition"
                    },
                    ":iam::",
                    {
                      Ref: "AWS::AccountId"
                    },
                    ":root"
                  ]
                ]
              }
            },
            Resource: "*"
          },
          {
            Action: [
              "kms:Decrypt",
              "kms:Encrypt",
              "kms:ReEncrypt*",
              "kms:GenerateDataKey*"
            ],
            Condition: {
              ArnLike: {
                "aws:SourceArn": {
                  "Fn::GetAtt": [
                    "tests3sqsS3BucketFF76CDA6",
                    "Arn"
                  ]
                }
              }
            },
            Effect: "Allow",
            Principal: {
              Service: "s3.amazonaws.com"
            },
            Resource: "*"
          },
          {
            Action: [
              "kms:GenerateDataKey*",
              "kms:Decrypt"
            ],
            Effect: "Allow",
            Principal: {
              Service: "s3.amazonaws.com"
            },
            Resource: "*"
          }
        ],
        Version: "2012-10-17"
      },
      EnableKeyRotation: true
    });
});
