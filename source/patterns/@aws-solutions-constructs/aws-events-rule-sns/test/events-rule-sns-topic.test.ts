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

import * as cdk from "@aws-cdk/core";
import * as events from "@aws-cdk/aws-events";
import * as defaults from '@aws-solutions-constructs/core';
import '@aws-cdk/assert/jest';
import { EventsRuleToSns, EventsRuleToSnsProps } from "../lib";

function deployNewStack(stack: cdk.Stack) {
  const props: EventsRuleToSnsProps = {
    eventRuleProps: {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    }
  };
  return new EventsRuleToSns(stack, 'test', props);
}

function deployStackWithNewEventBus(stack: cdk.Stack) {
  const props: EventsRuleToSnsProps = {
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    },
    eventBusProps: {}
  };
  return new EventsRuleToSns(stack, 'test-neweventbus', props);
}

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
            Ref: "testtestWSnsTopicBFF33C41"
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
            Ref: "testtestWSnsTopicBFF33C41"
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
            Ref: "testtestWSnsTopicBFF33C41"
          },
          Sid: "2"
        }
      ],
      Version: "2012-10-17"
    },
    Topics: [
      {
        Ref: "testtestWSnsTopicBFF33C41"
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
          Ref: "testtestWSnsTopicBFF33C41"
        },
        Id: {
          "Fn::GetAtt": [
            "testtestWSnsTopicBFF33C41",
            "TopicName"
          ]
        }
      }
    ]
  });
});

test('check properties', () => {
  const stack = new cdk.Stack();
  const construct: EventsRuleToSns = deployNewStack(stack);

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
        "testtestWEncryptionKeyC6B126B6",
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

  const props: EventsRuleToSnsProps = {
    eventRuleProps: {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    },
    encryptionKey: key
  };

  new EventsRuleToSns(stack, 'test-events-rule-sqs', props);

  expect(stack).toHaveResource('AWS::SNS::Topic', {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "EncryptionKey1B843E66",
        "Arn"
      ]
    }
  });

  expect(stack).toHaveResource('AWS::KMS::Key', {
    Description: "my-key",
    EnableKeyRotation: true
  });
});

test('check eventbus property, snapshot & eventbus exists', () => {
  const stack = new cdk.Stack();

  const construct: EventsRuleToSns = deployStackWithNewEventBus(stack);

  expect(construct.eventsRule !== null);
  expect(construct.snsTopic !== null);
  expect(construct.encryptionKey !== null);
  expect(construct.eventBus !== null);

  // Check whether eventbus exists
  expect(stack).toHaveResource('AWS::Events::EventBus');
});

test('check exception while passing existingEventBus & eventBusProps', () => {
  const stack = new cdk.Stack();

  const props: EventsRuleToSnsProps = {
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    },
    eventBusProps: {},
    existingEventBusInterface: new events.EventBus(stack, `test-existing-new-eventbus`, {  eventBusName: 'test'  })
  };

  const app = () => {
    new EventsRuleToSns(stack, 'test-eventsrule-sns', props);
  };
  expect(app).toThrowError();
});

test('check custom event bus resource with props when deploy:true', () => {
  const stack = new cdk.Stack();

  const props: EventsRuleToSnsProps = {
    eventBusProps: {
      eventBusName: 'testcustomeventbus'
    },
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    }
  };
  new EventsRuleToSns(stack, 'test-new-eventsrule-sns', props);

  expect(stack).toHaveResource('AWS::Events::EventBus', {
    Name: 'testcustomeventbus'
  });
});