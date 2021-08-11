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

import { SynthUtils } from '@aws-cdk/assert';
import * as cdk from "@aws-cdk/core";
import * as events from "@aws-cdk/aws-events";
import * as defaults from '@aws-solutions-constructs/core';
import '@aws-cdk/assert/jest';
import { EventbridgeToSns, EventbridgeToSnsProps } from "../lib";

function deployNewStack(stack: cdk.Stack) {
  const props: EventbridgeToSnsProps = {
    eventRuleProps: {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    }
  };
  return new EventbridgeToSns(stack, 'test', props);
}

test('snapshot test EventbridgeToSns default params', () => {
  const stack = new cdk.Stack();
  deployNewStack(stack);
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('check if the event rule has permission/policy in place in sns for it to be able to publish to the topic', () => {
  const stack = new cdk.Stack();
  deployNewStack(stack);
  expect(stack).toHaveResource('AWS::SNS::TopicPolicy', {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "SNS:Publish",
            "SNS:RemovePermission",
            "SNS:SetTopicAttributes",
            "SNS:DeleteTopic",
            "SNS:ListSubscriptionsByTopic",
            "SNS:GetTopicAttributes",
            "SNS:Receive",
            "SNS:AddPermission",
            "SNS:Subscribe"
          ],
          Condition: {
            StringEquals: {
              "AWS:SourceOwner": {
                Ref: "AWS::AccountId"
              }
            }
          },
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
          Resource: {
            Ref: "testSnsTopic42942701"
          },
          Sid: "TopicOwnerOnlyAccess"
        },
        {
          Action: [
            "SNS:Publish",
            "SNS:RemovePermission",
            "SNS:SetTopicAttributes",
            "SNS:DeleteTopic",
            "SNS:ListSubscriptionsByTopic",
            "SNS:GetTopicAttributes",
            "SNS:Receive",
            "SNS:AddPermission",
            "SNS:Subscribe"
          ],
          Condition: {
            Bool: {
              "aws:SecureTransport": "false"
            }
          },
          Effect: "Deny",
          Principal: {
            AWS: "*"
          },
          Resource: {
            Ref: "testSnsTopic42942701"
          },
          Sid: "HttpsOnly"
        },
        {
          Action: "sns:Publish",
          Effect: "Allow",
          Principal: {
            Service: "events.amazonaws.com"
          },
          Resource: {
            Ref: "testSnsTopic42942701"
          },
          Sid: "2"
        }
      ],
      Version: "2012-10-17"
    },
    Topics: [
      {
        Ref: "testSnsTopic42942701"
      }
    ]
  }
  );
});

test('check events rule properties', () => {
  const stack = new cdk.Stack();
  deployNewStack(stack);

  expect(stack).toHaveResource('AWS::Events::Rule', {
    ScheduleExpression: "rate(5 minutes)",
    State: "ENABLED",
    Targets: [
      {
        Arn: {
          Ref: "testSnsTopic42942701"
        },
        Id: {
          "Fn::GetAtt": [
            "testSnsTopic42942701",
            "TopicName"
          ]
        }
      }
    ]
  });
});

test('check properties', () => {
  const stack = new cdk.Stack();
  const construct: EventbridgeToSns = deployNewStack(stack);

  expect(construct.eventsRule !== null);
  expect(construct.snsTopic !== null);
  expect(construct.encryptionKey !== null);
});

test('check the sns topic properties', () => {
  const stack = new cdk.Stack();
  deployNewStack(stack);
  expect(stack).toHaveResource('AWS::SNS::Topic', {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "testEncryptionKeyB55BFDBC",
        "Arn"
      ]
    }
  });
});

test('check the sns topic properties with existing KMS key', () => {
  const stack = new cdk.Stack();
  const key = defaults.buildEncryptionKey(stack, {
    description: 'my-key'
  });

  const props: EventbridgeToSnsProps = {
    eventRuleProps: {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    },
    encryptionKey: key
  };

  new EventbridgeToSns(stack, 'test-events-rule-sqs', props);

  expect(stack).toHaveResource('AWS::SNS::Topic', {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "EncryptionKey1B843E66",
        "Arn"
      ]
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