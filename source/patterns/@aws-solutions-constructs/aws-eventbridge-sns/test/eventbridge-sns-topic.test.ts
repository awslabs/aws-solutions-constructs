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

import * as cdk from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as sns from "aws-cdk-lib/aws-sns";
import * as defaults from '@aws-solutions-constructs/core';
import { Template } from "aws-cdk-lib/assertions";
import { EventbridgeToSns, EventbridgeToSnsProps } from "../lib";

function deployNewStack(stack: cdk.Stack) {
  const props: EventbridgeToSnsProps = {
    eventRuleProps: {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    }
  };
  return new EventbridgeToSns(stack, 'test', props);
}

function deployStackWithNewEventBus(stack: cdk.Stack) {
  const props: EventbridgeToSnsProps = {
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    },
    eventBusProps: { eventBusName: 'test' }
  };
  return new EventbridgeToSns(stack, 'test-neweventbus', props);
}

test('check if the event rule has permission/policy in place in sns for it to be able to publish to the topic', () => {
  const stack = new cdk.Stack();
  const testConstruct = deployNewStack(stack);

  expect(testConstruct.snsTopic).toBeDefined();
  expect(testConstruct.encryptionKey).toBeDefined();
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::SNS::TopicPolicy', {
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

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Events::Rule', {
    ScheduleExpression: "rate(5 minutes)",
    State: "ENABLED",
    Targets: [
      {
        Arn: {
          Ref: "testSnsTopic42942701"
        },
        Id: {
          "Fn::Join": [
            "",
            [
              "Defaulttest-",
              {
                "Fn::Select": [
                  2,
                  {
                    "Fn::Split": [
                      "/",
                      {
                        Ref: "AWS::StackId"
                      }
                    ]
                  }
                ]
              }
            ]
          ]
        }
      }
    ]
  });
});

test('check properties', () => {
  const stack = new cdk.Stack();
  const construct: EventbridgeToSns = deployNewStack(stack);

  expect(construct.eventsRule).toBeDefined();
  expect(construct.snsTopic).toBeDefined();
  expect(construct.encryptionKey).toBeDefined();
});

test('check the sns topic properties', () => {
  const stack = new cdk.Stack();
  deployNewStack(stack);
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::SNS::Topic', {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "testtestKeyDC306BBB",
        "Arn"
      ]
    }
  });
});

test('check the sns topic properties with existing KMS key', () => {
  const stack = new cdk.Stack();
  const key = defaults.buildEncryptionKey(stack, 'test', {
    description: 'my-key'
  });

  const props: EventbridgeToSnsProps = {
    eventRuleProps: {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    },
    encryptionKey: key
  };

  new EventbridgeToSns(stack, 'test-events-rule-sqs', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::SNS::Topic', {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "testKey2C00E5E5",
        "Arn"
      ]
    }
  });

  template.hasResourceProperties('AWS::KMS::Key', {
    Description: "my-key",
    EnableKeyRotation: true
  });
});

test('check eventbus property, snapshot & eventbus exists', () => {
  const stack = new cdk.Stack();

  const construct: EventbridgeToSns = deployStackWithNewEventBus(stack);

  expect(construct.eventsRule).toBeDefined();
  expect(construct.snsTopic).toBeDefined();
  expect(construct.encryptionKey).toBeDefined();
  expect(construct.eventBus).toBeDefined();

  // Check whether eventbus exists
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Events::EventBus', 1);
});

test('Confirm CheckEventBridgeProps is being called', () => {
  const stack = new cdk.Stack();

  const props: EventbridgeToSnsProps = {
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    },
    eventBusProps: {},
    existingEventBusInterface: new events.EventBus(stack, `test-existing-new-eventbus`, { eventBusName: 'test' })
  };

  const app = () => {
    new EventbridgeToSns(stack, 'test-eventbridge-sns', props);
  };
  expect(app).toThrowError('Error - Either provide existingEventBusInterface or eventBusProps, but not both.\n');
});

test('check custom event bus resource with props when deploy:true', () => {
  const stack = new cdk.Stack();

  const props: EventbridgeToSnsProps = {
    eventBusProps: {
      eventBusName: 'testcustomeventbus'
    },
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    }
  };
  new EventbridgeToSns(stack, 'test-new-eventbridge-sns', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Events::EventBus', {
    Name: 'testcustomeventbus'
  });
});

test('Topic is encrypted when key is provided on topicProps.masterKey prop', () => {
  const stack = new cdk.Stack();
  const key = defaults.buildEncryptionKey(stack, 'test', {
    description: 'my-key'
  });

  const props: EventbridgeToSnsProps = {
    eventRuleProps: {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    },
    topicProps: {
      masterKey: key
    }
  };

  new EventbridgeToSns(stack, 'test-events-rule-sqs', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::SNS::Topic', {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "testKey2C00E5E5",
        "Arn"
      ]
    }
  });

  template.hasResourceProperties('AWS::KMS::Key', {
    Description: "my-key",
    EnableKeyRotation: true
  });
});

test('Topic is encrypted when keyProps are provided', () => {
  const stack = new cdk.Stack();

  const props: EventbridgeToSnsProps = {
    eventRuleProps: {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    },
    encryptionKeyProps: {
      description: 'my-key'
    }
  };

  new EventbridgeToSns(stack, 'test-events-rule-sqs', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::SNS::Topic', {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "testeventsrulesqstesteventsrulesqsKey0BF3CCD9",
        "Arn"
      ]
    }
  });

  template.hasResourceProperties('AWS::KMS::Key', {
    Description: "my-key",
    EnableKeyRotation: true
  });
});

test('Topic is encrypted with AWS-managed KMS key when enableEncryptionWithCustomerManagedKey property is false', () => {
  const stack = new cdk.Stack();

  const props: EventbridgeToSnsProps = {
    eventRuleProps: {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    },
    enableEncryptionWithCustomerManagedKey: false
  };

  new EventbridgeToSns(stack, 'test-events-rule-sqs', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::SNS::Topic', {
    KmsMasterKeyId: {
      "Fn::Join": [
        "",
        [
          "arn:",
          {
            Ref: "AWS::Partition"
          },
          ":kms:",
          {
            Ref: "AWS::Region"
          },
          ":",
          {
            Ref: "AWS::AccountId"
          },
          ":alias/aws/sns"
        ]
      ]
    }
  });
});

test('Properties correctly set when unencrypted existing topic is provided', () => {
  const stack = new cdk.Stack();
  const existingTopicObj = new sns.Topic(stack, 'Topic', {
    topicName: 'existing-topic-name'
  });

  const props: EventbridgeToSnsProps = {
    existingTopicObj,
    eventRuleProps: {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    }
  };
  const testConstruct = new EventbridgeToSns(stack, 'test', props);

  expect(testConstruct.snsTopic).toBeDefined();
  expect(testConstruct.encryptionKey).not.toBeDefined();
});

test('Confirm CheckSnsProps is being called', () => {
  const stack = new cdk.Stack();
  const existingTopicObj = new sns.Topic(stack, 'Topic', {
    topicName: 'existing-topic-name'
  });

  const props: EventbridgeToSnsProps = {
    existingTopicObj,
    topicProps: {},
    eventRuleProps: {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    }
  };
  const app = () => {
    new EventbridgeToSns(stack, 'test', props);
  };

  expect(app).toThrowError("Error - Either provide topicProps or existingTopicObj, but not both.\n");
});