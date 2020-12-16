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

import * as cdk from '@aws-cdk/core';
import { EventsRuleToSqs, EventsRuleToSqsProps } from '../lib';
import * as events from "@aws-cdk/aws-events";
import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import * as defaults from '@aws-solutions-constructs/core';

function deployNewStack(stack: cdk.Stack) {
  const props: EventsRuleToSqsProps = {
    eventRuleProps: {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    }
  };
  return new EventsRuleToSqs(stack, 'test-events-rule-sqs', props);
}

test('snapshot test EventsRuleToSqs default params', () => {
  const stack = new cdk.Stack();
  deployNewStack(stack);
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('check the sqs queue properties', () => {
  const stack = new cdk.Stack();
  deployNewStack(stack);
  expect(stack).toHaveResource('AWS::SQS::Queue', {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "testeventsrulesqsEncryptionKey19AB0C02",
        "Arn"
      ]
    },
    RedrivePolicy: {
      deadLetterTargetArn: {
        "Fn::GetAtt": [
          "testeventsrulesqsdeadLetterQueueA4A15A1C",
          "Arn"
        ]
      },
      maxReceiveCount: 15
    }
  });
});

test('check the sqs queue properties with existing KMS key', () => {
  const stack = new cdk.Stack();
  const key = defaults.buildEncryptionKey(stack, {
    description: 'my-key'
  });

  const props: EventsRuleToSqsProps = {
    eventRuleProps: {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    },
    encryptionKey: key
  };

  new EventsRuleToSqs(stack, 'test-events-rule-sqs', props);

  expect(stack).toHaveResource('AWS::SQS::Queue', {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "EncryptionKey1B843E66",
        "Arn"
      ]
    },
    RedrivePolicy: {
      deadLetterTargetArn: {
        "Fn::GetAtt": [
          "testeventsrulesqsdeadLetterQueueA4A15A1C",
          "Arn"
        ]
      },
      maxReceiveCount: 15
    }
  });

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
          Effect: "Allow",
          Principal: {
            Service: "events.amazonaws.com"
          },
          Resource: "*"
        }
      ],
      Version: "2012-10-17"
    },
    Description: "my-key",
    EnableKeyRotation: true
  });
});

test('check if the event rule has permission/policy in place in sqs queue for it to be able to send messages to the queue.', () => {
  const stack = new cdk.Stack();
  deployNewStack(stack);
  expect(stack).toHaveResource('AWS::SQS::QueuePolicy', {
    PolicyDocument:  {
      Statement: [
        {
          Action: [
            "sqs:DeleteMessage",
            "sqs:ReceiveMessage",
            "sqs:SendMessage",
            "sqs:GetQueueAttributes",
            "sqs:RemovePermission",
            "sqs:AddPermission",
            "sqs:SetQueueAttributes",
          ],
          Effect: "Allow",
          Principal:  {
            AWS:  {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":iam::",
                  {
                    Ref: "AWS::AccountId",
                  },
                  ":root"
                ],
              ],
            },
          },
          Resource:  {
            "Fn::GetAtt": [
              "testeventsrulesqsqueueAACD0364",
              "Arn",
            ],
          },
          Sid: "QueueOwnerOnlyAccess",
        },
        {
          Action: "SQS:*",
          Condition:  {
            Bool:  {
              "aws:SecureTransport": "false",
            },
          },
          Effect: "Deny",
          Principal: "*",
          Resource:  {
            "Fn::GetAtt": [
              "testeventsrulesqsqueueAACD0364",
              "Arn",
            ],
          },
          Sid: "HttpsOnly",
        },
        {
          Action: [
            "sqs:SendMessage",
            "sqs:GetQueueAttributes",
            "sqs:GetQueueUrl"
          ],
          Effect: "Allow",
          Principal: {
            Service: "events.amazonaws.com"
          },
          Resource: {
            "Fn::GetAtt": [
              "testeventsrulesqsqueueAACD0364",
              "Arn"
            ]
          }
        }
      ],
      Version: "2012-10-17"
    },
    Queues: [
      {
        Ref: "testeventsrulesqsqueueAACD0364",
      }
    ]
  });
});

test('check if the dead letter queue policy is setup', () => {
  const stack = new cdk.Stack();
  deployNewStack(stack);
  expect(stack).toHaveResource('AWS::SQS::QueuePolicy', {
    PolicyDocument:  {
      Statement: [
        {
          Action: [
            "sqs:DeleteMessage",
            "sqs:ReceiveMessage",
            "sqs:SendMessage",
            "sqs:GetQueueAttributes",
            "sqs:RemovePermission",
            "sqs:AddPermission",
            "sqs:SetQueueAttributes",
          ],
          Effect: "Allow",
          Principal:  {
            AWS:  {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":iam::",
                  {
                    Ref: "AWS::AccountId"
                  },
                  ":root"
                ],
              ],
            },
          },
          Resource:  {
            "Fn::GetAtt": [
              "testeventsrulesqsdeadLetterQueueA4A15A1C",
              "Arn",
            ],
          },
          Sid: "QueueOwnerOnlyAccess",
        },
        {
          Action: "SQS:*",
          Condition:  {
            Bool:  {
              "aws:SecureTransport": "false",
            },
          },
          Effect: "Deny",
          Principal: "*",
          Resource:  {
            "Fn::GetAtt": [
              "testeventsrulesqsdeadLetterQueueA4A15A1C",
              "Arn",
            ],
          },
          Sid: "HttpsOnly",
        },
      ],
      Version: "2012-10-17",
    },
    Queues: [
      {
        Ref: "testeventsrulesqsdeadLetterQueueA4A15A1C",
      },
    ]
  });
});

test('check properties', () => {
  const stack = new cdk.Stack();
  const construct: EventsRuleToSqs = deployNewStack(stack);

  expect(construct.eventsRule !== null);
  expect(construct.sqsQueue !== null);
  expect(construct.encryptionKey !== null);
  expect(construct.deadLetterQueue !== null);
});