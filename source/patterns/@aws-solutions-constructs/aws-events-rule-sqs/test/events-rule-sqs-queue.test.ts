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

import * as cdk from '@aws-cdk/core';
import { EventsRuleToSQS, EventsRuleToSQSProps } from '../lib'
import * as events from "@aws-cdk/aws-events";
import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';


function deployNewFunc(stack: cdk.Stack) {
    const props: EventsRuleToSQSProps = {
        eventRuleProps: {
            schedule: events.Schedule.rate(cdk.Duration.minutes(5))
        }
    }
    return new EventsRuleToSQS(stack, 'test-events-rule-sqs', props);
}

function getStack() {
    const app = new cdk.App()
    return new cdk.Stack(app, 'stack')
}

test('snapshot test EventsRuleToSQS default params', () => {
    const stack = getStack()
    deployNewFunc(stack)
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('check the sqs queue properties', () => {
    const stack = getStack()
    deployNewFunc(stack)
    expect(stack).toHaveResource('AWS::SQS::Queue', {})
})

test('check if the event rule has permission/policy in place in sqs queue for it to be able to send messages to the queue.', () => {
    const stack = getStack()
    deployNewFunc(stack)
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
                  "AWS":  {
                    "Fn::Join": [
                      "",
                      [
                        "arn:",
                         {
                          "Ref": "AWS::Partition",
                        },
                        ":iam::",
                        {
                        "Ref": "AWS::AccountId",
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
                  "Bool":  {
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
                  "sqs:GetQueueUrl",
                ],
                Effect: "Allow",
                Principal: {
                  "Service": "events.amazonaws.com",
                },
                Resource:  {
                  "Fn::GetAtt": [
                    "testeventsrulesqsEventsRule06054F3F",
                    "Arn",
                  ],
                },
              },
            ],
            Version: "2012-10-17"
        },
            Queues: [
                {
                  "Ref": "testeventsrulesqsqueueAACD0364",
                }
            ]     
    })
})

test('check if the dead letter queue policy is setup', () => {
    const stack = getStack()
    deployNewFunc(stack)
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
                          "Ref": "AWS::Partition",
                        },
                        ":iam::",
                       {
                        "Ref": "AWS::AccountId"
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
                  "Bool":  {
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
              "Ref": "testeventsrulesqsdeadLetterQueueA4A15A1C",
            },
          ]
    })

})

 