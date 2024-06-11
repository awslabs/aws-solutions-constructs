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

import * as cdk from 'aws-cdk-lib';
import { EventbridgeToSqs, EventbridgeToSqsProps } from '../lib';
import * as events from "aws-cdk-lib/aws-events";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Template } from 'aws-cdk-lib/assertions';
import * as defaults from '@aws-solutions-constructs/core';

function deployNewStack(stack: cdk.Stack) {
  const props: EventbridgeToSqsProps = {
    eventRuleProps: {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    }
  };
  return new EventbridgeToSqs(stack, 'test-eventbridge-sqs', props);
}

function deployStackWithNewEventBus(stack: cdk.Stack) {
  const props: EventbridgeToSqsProps = {
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    },
    eventBusProps: { eventBusName: 'test' }
  };
  return new EventbridgeToSqs(stack, 'test-eventbridge-sqs-new-bus', props);
}

test('check the sqs queue properties', () => {
  const stack = new cdk.Stack();
  const buildQueueResponse = deployNewStack(stack);

  expect(buildQueueResponse.sqsQueue).toBeDefined();
  expect(buildQueueResponse.encryptionKey).toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::SQS::Queue', {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "testeventbridgesqsqueueKey396E8615",
        "Arn"
      ]
    },
    RedrivePolicy: {
      deadLetterTargetArn: {
        "Fn::GetAtt": [
          "testeventbridgesqsqueuedlq29C7739E",
          "Arn"
        ]
      },
      maxReceiveCount: 15
    }
  });
});

test('check the sqs queue properties with existing KMS key', () => {
  const stack = new cdk.Stack();
  const key = defaults.buildEncryptionKey(stack, 'test', {
    description: 'my-key'
  });

  const props: EventbridgeToSqsProps = {
    eventRuleProps: {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    },
    encryptionKey: key
  };

  const buildQueueResponse = new EventbridgeToSqs(stack, 'test-eventbridge-sqs', props);

  expect(buildQueueResponse.sqsQueue).toBeDefined();
  expect(buildQueueResponse.encryptionKey).toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::SQS::Queue', {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "testKey2C00E5E5",
        "Arn"
      ]
    },
    RedrivePolicy: {
      deadLetterTargetArn: {
        "Fn::GetAtt": [
          "testeventbridgesqsqueuedlq29C7739E",
          "Arn"
        ]
      },
      maxReceiveCount: 15
    }
  });

  template.hasResourceProperties('AWS::KMS::Key', {
    Description: "my-key",
    EnableKeyRotation: true
  });
});

test('check if the event rule has permission/policy in place in sqs queue for it to be able to send messages to the queue.', () => {
  const stack = new cdk.Stack();
  deployNewStack(stack);
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::SQS::QueuePolicy', {
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
              "testeventbridgesqsqueue21FF6EBA",
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
          Principal: {
            AWS: "*"
          },
          Resource:  {
            "Fn::GetAtt": [
              "testeventbridgesqsqueue21FF6EBA",
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
              "testeventbridgesqsqueue21FF6EBA",
              "Arn"
            ]
          }
        }
      ],
      Version: "2012-10-17"
    },
    Queues: [
      {
        Ref: "testeventbridgesqsqueue21FF6EBA",
      }
    ]
  });
});

test('check if the dead letter queue policy is setup', () => {
  const stack = new cdk.Stack();
  deployNewStack(stack);
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::SQS::QueuePolicy', {
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
              "testeventbridgesqsqueuedlq29C7739E",
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
          Principal: {
            AWS: "*"
          },
          Resource:  {
            "Fn::GetAtt": [
              "testeventbridgesqsqueuedlq29C7739E",
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
        Ref: "testeventbridgesqsqueuedlq29C7739E",
      },
    ]
  });
});

test('check properties', () => {
  const stack = new cdk.Stack();
  const construct: EventbridgeToSqs = deployNewStack(stack);

  expect(construct.eventsRule).toBeDefined();
  expect(construct.sqsQueue).toBeDefined();
  expect(construct.encryptionKey).toBeDefined();
  expect(construct.deadLetterQueue).toBeDefined();
});

test('check eventbus property, snapshot & eventbus exists', () => {
  const stack = new cdk.Stack();
  const construct: EventbridgeToSqs = deployStackWithNewEventBus(stack);

  expect(construct.eventsRule).toBeDefined();
  expect(construct.sqsQueue).toBeDefined();
  expect(construct.encryptionKey).toBeDefined();
  expect(construct.deadLetterQueue).toBeDefined();
  expect(construct.eventBus).toBeDefined();

  // Check whether eventbus exists
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Events::EventBus', 1);
});

test('Confirm CheckEventBridgeProps is being called', () => {
  const stack = new cdk.Stack();

  const props: EventbridgeToSqsProps = {
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    },
    eventBusProps: { eventBusName: 'test' },
    existingEventBusInterface: new events.EventBus(stack, `test-existing-new-eventbus`, {  eventBusName: 'test'  })
  };

  const app = () => {
    new EventbridgeToSqs(stack, 'test-eventbridge-sqs', props);
  };
  expect(app).toThrowError('Error - Either provide existingEventBusInterface or eventBusProps, but not both.\n');
});

test('check custom event bus resource with props when deploy:true', () => {
  const stack = new cdk.Stack();

  const props: EventbridgeToSqsProps = {
    eventBusProps: {
      eventBusName: 'testcustomeventbus'
    },
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    }
  };
  new EventbridgeToSqs(stack, 'test-new-eventbridge-sqs', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Events::EventBus', {
    Name: 'testcustomeventbus'
  });
});

test('Queue is encrypted when key is provided on queueProps.encryptionMasterKey prop', () => {
  const stack = new cdk.Stack();
  const key = defaults.buildEncryptionKey(stack, 'test', {
    description: 'my-key'
  });

  const props: EventbridgeToSqsProps = {
    eventRuleProps: {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    },
    queueProps: {
      encryptionMasterKey: key
    }
  };

  new EventbridgeToSqs(stack, 'test-eventbridge-sqs', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::SQS::Queue', {
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

test('Queue is encrypted when key keyProps are provided', () => {
  const stack = new cdk.Stack();

  const props: EventbridgeToSqsProps = {
    eventRuleProps: {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    },
    encryptionKeyProps: {
      description: 'my-key'
    }
  };

  new EventbridgeToSqs(stack, 'test-eventbridge-sqs', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::SQS::Queue', {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "testeventbridgesqsqueueKey396E8615",
        "Arn"
      ]
    }
  });

  template.hasResourceProperties('AWS::KMS::Key', {
    Description: "my-key",
    EnableKeyRotation: true
  });
});

test('Queue is encrypted with SQS-managed KMS key when enableEncryptionWithCustomerManagedKey property is false', () => {
  const stack = new cdk.Stack();

  const props: EventbridgeToSqsProps = {
    eventRuleProps: {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    },
    enableEncryptionWithCustomerManagedKey: false
  };

  new EventbridgeToSqs(stack, 'test-eventbridge-sqs', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::SQS::Queue', {
    KmsMasterKeyId: "alias/aws/sqs"
  });
});

test('Queue purging flag grants correct permissions', () => {
  const stack = new cdk.Stack();

  const props: EventbridgeToSqsProps = {
    eventRuleProps: {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    },
    enableQueuePurging: true,
    deployDeadLetterQueue: false
  };

  new EventbridgeToSqs(stack, 'test-eventbridge-sqs', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::SQS::QueuePolicy', {
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
              "testeventbridgesqsqueue21FF6EBA",
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
          Principal: {
            AWS: "*"
          },
          Resource:  {
            "Fn::GetAtt": [
              "testeventbridgesqsqueue21FF6EBA",
              "Arn",
            ],
          },
          Sid: "HttpsOnly",
        },
        {
          Action: [
            "sqs:PurgeQueue",
            "sqs:GetQueueAttributes",
            "sqs:GetQueueUrl"
          ],
          Effect: "Allow",
          Principal: {
            Service: "events.amazonaws.com"
          },
          Resource: {
            "Fn::GetAtt": [
              "testeventbridgesqsqueue21FF6EBA",
              "Arn"
            ]
          }
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
              "testeventbridgesqsqueue21FF6EBA",
              "Arn"
            ]
          }
        }
      ],
      Version: "2012-10-17"
    },
    Queues: [
      {
        Ref: "testeventbridgesqsqueue21FF6EBA",
      }
    ]
  });
});

test('check that CheckSqsProps is being called', () => {
  const stack = new cdk.Stack();

  const props: EventbridgeToSqsProps = {
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    },
    eventBusProps: { eventBusName: 'test' },
    queueProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    },
    existingQueueObj: new sqs.Queue(stack, 'test', {})
  };

  const app = () => {
    new EventbridgeToSqs(stack, 'test-eventbridge-sqs', props);
  };
  expect(app).toThrowError("Error - Either provide queueProps or existingQueueObj, but not both.\n");
});
