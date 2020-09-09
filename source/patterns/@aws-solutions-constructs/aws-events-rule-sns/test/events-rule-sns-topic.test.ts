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

import { SynthUtils } from '@aws-cdk/assert';
import * as cdk from "@aws-cdk/core";
import * as events from "@aws-cdk/aws-events";
import '@aws-cdk/assert/jest';
import { EventsRuleToSNSTopic, EventsRuleToSNSTopicProps } from "../lib"



function createConstruct(stack: cdk.Stack) {
  const props: EventsRuleToSNSTopicProps = {
    eventRuleProps: {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    }
  }
  return new EventsRuleToSNSTopic(stack, 'test', props);
}

function getStack() {
  const app = new cdk.App()
  return new cdk.Stack(app, 'stack')
}

test('snapshot test EventsRuleToSNS default params', () => {
  const stack = getStack()
  createConstruct(stack)
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('check if the event rule has permission/policy in place in sns for it to be able to publish to the topic', () => {
  const stack = getStack()
  createConstruct(stack)
  expect(stack).toHaveResource('AWS::SNS::TopicPolicy', {
      "PolicyDocument": {
        "Statement": [
          {
            "Action": [
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
            "Condition": {
              "StringEquals": {
                "AWS:SourceOwner": {
                  "Ref": "AWS::AccountId"
                }
              }
            },
            "Effect": "Allow",
            "Principal": {
              "AWS": {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      "Ref": "AWS::Partition"
                    },
                    ":iam::",
                    {
                      "Ref": "AWS::AccountId"
                    },
                    ":root"
                  ]
                ]
              }
            },
            "Resource": {
              "Ref": "testSnsTopic42942701"
            },
            "Sid": "TopicOwnerOnlyAccess"
          },
          {
            "Action": [
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
            "Condition": {
              "Bool": {
                "aws:SecureTransport": "false"
              }
            },
            "Effect": "Deny",
            "Principal": "*",
            "Resource": {
              "Ref": "testSnsTopic42942701"
            },
            "Sid": "HttpsOnly"
          },
          {
            "Action": "SNS:Publish",
            "Effect": "Allow",
            "Principal":{
              "Service": "events.amazonaws.com"
            },
            "Resource": {
              "Fn::GetAtt": [
                "testEventsRuleE75BC9BA",
                "Arn"
              ]
            },
            "Sid": "2"
          }
        ],
        "Version": "2012-10-17"
      },
      "Topics": [
        {
          "Ref": "testSnsTopic42942701"
        }
      ]
    }
  )
})

test('check events rule properties for deploy: true', () => {
  const stack = getStack()
<<<<<<< HEAD
  createConstruct(stack)
=======
  deployNewFunc(stack)
>>>>>>> 03975799433bee20dab9884724a85aa0c669158d

  expect(stack).toHaveResource('AWS::Events::Rule', {
    ScheduleExpression: "rate(5 minutes)",
    State: "ENABLED",
    Targets: [
      {
        Arn: {
          "Ref": "testSnsTopic42942701"
        },
        Id: {
          "Fn::GetAtt": [
            "testSnsTopic42942701",
            "TopicName"
          ]
        }
      }
    ]
  })
})

test('check properties', () => {
  const stack = new cdk.Stack();
  const construct: EventsRuleToSNSTopic = createConstruct(stack);

  expect(construct.eventsRule !== null);
  expect(construct.snsTopic !== null);
});
