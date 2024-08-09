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

// Imports
import { Stack, RemovalPolicy } from "aws-cdk-lib";
import { IotToSqs, IotToSqsProps } from "../lib";
import { Template } from 'aws-cdk-lib/assertions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as defaults from '@aws-solutions-constructs/core';

test('Pattern deployment with default props', () => {
  // Initial Setup
  const stack = new Stack();
  const props: IotToSqsProps = {
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "Processing messages from IoT devices or factory machines",
        sql: "SELECT * FROM 'test/topic/#'",
        actions: []
      }
    }
  };
  new IotToSqs(stack, 'test-iot-sqs', props);

  // Creates a default sqs queue
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "testiotsqsqueueKeyC5935B79",
        "Arn"
      ]
    }
  });

  // Creates a dead letter queue
  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: "alias/aws/sqs"
  });

  // Creates an IoT Topic Rule
  template.hasResourceProperties("AWS::IoT::TopicRule", {
    TopicRulePayload: {
      Actions: [
        {
          Sqs: {
            QueueUrl: { Ref: "testiotsqsqueue630B4C1F" },
            RoleArn: {
              "Fn::GetAtt": [
                "testiotsqsiotactionsrole93B1D327",
                "Arn"
              ]
            }
          }
        }
      ],
      Description: "Processing messages from IoT devices or factory machines",
      RuleDisabled: false,
      Sql: "SELECT * FROM 'test/topic/#'"
    }
  });

  // Creates an encryption key
  template.hasResourceProperties("AWS::KMS::Key", {
    EnableKeyRotation: true
  });
});

test('Pattern deployment with existing queue', () => {
  // Initial Setup
  const stack = new Stack();

  const queue = new sqs.Queue(stack, 'existing-queue-obj', {
    queueName: 'existing-queue-obj'
  });

  const props: IotToSqsProps = {
    existingQueueObj: queue,
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "Processing messages from IoT devices or factory machines",
        sql: "SELECT * FROM 'test/topic/#'",
        actions: []
      }
    }
  };
  new IotToSqs(stack, 'test-iot-sqs', props);

  // Creates a default sqs queue
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    QueueName: "existing-queue-obj"
  });
});

test('Pattern deployment with queue and dead letter queue props', () => {
  // Initial Setup
  const stack = new Stack();

  const props: IotToSqsProps = {
    deadLetterQueueProps: {
      queueName: 'dlq-name'
    },
    queueProps: {
      queueName: 'queue-name'
    },
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "Processing messages from IoT devices or factory machines",
        sql: "SELECT * FROM 'test/topic/#'",
        actions: []
      }
    }
  };
  new IotToSqs(stack, 'test-iot-sqs', props);

  // Creates a queue using the provided props
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    QueueName: "queue-name",
    RedrivePolicy: {
      deadLetterTargetArn: {
        "Fn::GetAtt": [
          "testiotsqsqueuedlqEFBBF989",
          "Arn",
        ],
      },
      maxReceiveCount: 15
    }
  });

  // Creates a dead letter queue using the provided props
  template.hasResourceProperties("AWS::SQS::Queue", {
    QueueName: "dlq-name"
  });
});

test('Pattern deployment with dead letter queue turned off', () => {
  // Initial Setup
  const stack = new Stack();

  const props: IotToSqsProps = {
    deployDeadLetterQueue: false,
    queueProps: {
      queueName: 'queue-name'
    },
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "Processing messages from IoT devices or factory machines",
        sql: "SELECT * FROM 'test/topic/#'",
        actions: []
      }
    }
  };
  new IotToSqs(stack, 'test-iot-sqs', props);

  // Creates a queue using the provided props
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    QueueName: "queue-name"
  });

  // Does not create the default dead letter queue
  defaults.expectNonexistence(stack, "AWS::SQS::Queue", {
    KmsMasterKeyId: "alias/aws/sqs"
  });
});

test('Pattern deployment with custom maxReceiveCount', () => {
  // Initial Setup
  const stack = new Stack();

  const props: IotToSqsProps = {
    deadLetterQueueProps: {
      queueName: 'dlq-name'
    },
    deployDeadLetterQueue: true,
    maxReceiveCount: 1,
    queueProps: {
      queueName: 'queue-name'
    },
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "Processing messages from IoT devices or factory machines",
        sql: "SELECT * FROM 'test/topic/#'",
        actions: []
      }
    }
  };
  new IotToSqs(stack, 'test-iot-sqs', props);

  // Creates a queue using the provided props
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    QueueName: "queue-name",
    RedrivePolicy: {
      deadLetterTargetArn: {
        "Fn::GetAtt": [
          "testiotsqsqueuedlqEFBBF989",
          "Arn",
        ],
      },
      maxReceiveCount: 1
    },
  });
});

test('Pattern deployment without creating a KMS key', () => {
  // Initial Setup
  const stack = new Stack();

  const props: IotToSqsProps = {
    enableEncryptionWithCustomerManagedKey: false,
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "Processing messages from IoT devices or factory machines",
        sql: "SELECT * FROM 'test/topic/#'",
        actions: []
      }
    }
  };
  new IotToSqs(stack, 'test-iot-sqs', props);

  // Creates a default sqs queue
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: "alias/aws/sqs"
  });

  // Creates a dead letter queue
  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: "alias/aws/sqs"
  });

  // Creates an IoT Topic Rule
  template.hasResourceProperties("AWS::IoT::TopicRule", {
    TopicRulePayload: {
      Actions: [
        {
          Sqs: {
            QueueUrl: { Ref: "testiotsqsqueue630B4C1F" },
            RoleArn: {
              "Fn::GetAtt": [
                "testiotsqsiotactionsrole93B1D327",
                "Arn"
              ]
            }
          }
        }
      ],
      Description: "Processing messages from IoT devices or factory machines",
      RuleDisabled: false,
      Sql: "SELECT * FROM 'test/topic/#'"
    }
  });

  // Does not create an encryption key
  template.resourceCountIs("AWS::KMS::Key", 0);
});

test('Pattern deployment with existing KMS key', () => {
  // Initial Setup
  const stack = new Stack();

  const kmsKey = new kms.Key(stack, 'existing-key', {
    enableKeyRotation: false,
    alias: 'existing-key-alias'
  });

  const props: IotToSqsProps = {
    encryptionKey: kmsKey,
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "Processing messages from IoT devices or factory machines",
        sql: "SELECT * FROM 'test/topic/#'",
        actions: []
      }
    }
  };
  new IotToSqs(stack, 'test-iot-sqs', props);

  // Creates a default sqs queue
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "existingkey205DFC01",
        "Arn"
      ]
    }
  });

  // Creates a dead letter queue
  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: "alias/aws/sqs"
  });

  // Creates an IoT Topic Rule
  template.hasResourceProperties("AWS::IoT::TopicRule", {
    TopicRulePayload: {
      Actions: [
        {
          Sqs: {
            QueueUrl: { Ref: "testiotsqsqueue630B4C1F" },
            RoleArn: {
              "Fn::GetAtt": [
                "testiotsqsiotactionsrole93B1D327",
                "Arn"
              ]
            }
          }
        }
      ],
      Description: "Processing messages from IoT devices or factory machines",
      RuleDisabled: false,
      Sql: "SELECT * FROM 'test/topic/#'"
    }
  });

  // Uses the provided key
  template.hasResourceProperties("AWS::KMS::Key", {
    EnableKeyRotation: false
  });
});

test('Pattern deployment with existing KMS key', () => {
  // Initial Setup
  const stack = new Stack();

  const kmsKey = new kms.Key(stack, 'existing-key', {
    enableKeyRotation: false,
    alias: 'existing-key-alias'
  });

  const props: IotToSqsProps = {
    queueProps: {
      encryptionMasterKey: kmsKey
    },
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "Processing messages from IoT devices or factory machines",
        sql: "SELECT * FROM 'test/topic/#'",
        actions: []
      }
    }
  };
  new IotToSqs(stack, 'test-iot-sqs', props);

  // Creates a default sqs queue
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "existingkey205DFC01",
        "Arn"
      ]
    }
  });

  // Creates a dead letter queue
  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: "alias/aws/sqs"
  });

  // Creates an IoT Topic Rule
  template.hasResourceProperties("AWS::IoT::TopicRule", {
    TopicRulePayload: {
      Actions: [
        {
          Sqs: {
            QueueUrl: { Ref: "testiotsqsqueue630B4C1F" },
            RoleArn: {
              "Fn::GetAtt": [
                "testiotsqsiotactionsrole93B1D327",
                "Arn"
              ]
            }
          }
        }
      ],
      Description: "Processing messages from IoT devices or factory machines",
      RuleDisabled: false,
      Sql: "SELECT * FROM 'test/topic/#'"
    }
  });

  // Uses the provided key
  template.hasResourceProperties("AWS::KMS::Key", {
    EnableKeyRotation: false
  });
});

test('Pattern deployment passing KMS key props', () => {
  // Initial Setup
  const stack = new Stack();

  const props: IotToSqsProps = {
    encryptionKeyProps: {
      enableKeyRotation: false,
      alias: 'new-key-alias-from-props'
    },
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "Processing messages from IoT devices or factory machines",
        sql: "SELECT * FROM 'test/topic/#'",
        actions: []
      }
    }
  };
  new IotToSqs(stack, 'test-iot-sqs', props);

  // Creates a default sqs queue
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "testiotsqsqueueKeyC5935B79",
        "Arn"
      ]
    }
  });

  // Creates a dead letter queue
  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: "alias/aws/sqs"
  });

  // Creates an IoT Topic Rule
  template.hasResourceProperties("AWS::IoT::TopicRule", {
    TopicRulePayload: {
      Actions: [
        {
          Sqs: {
            QueueUrl: { Ref: "testiotsqsqueue630B4C1F" },
            RoleArn: {
              "Fn::GetAtt": [
                "testiotsqsiotactionsrole93B1D327",
                "Arn"
              ]
            }
          }
        }
      ],
      Description: "Processing messages from IoT devices or factory machines",
      RuleDisabled: false,
      Sql: "SELECT * FROM 'test/topic/#'"
    }
  });

  // Uses the props to create the key
  template.hasResourceProperties("AWS::KMS::Key", {
    EnableKeyRotation: false
  });

  template.hasResourceProperties("AWS::KMS::Alias", {
    AliasName: "alias/new-key-alias-from-props",
    TargetKeyId: {
      "Fn::GetAtt": [
        "testiotsqsqueueKeyC5935B79",
        "Arn",
      ]
    }
  });
});

test('Pattern deployment with passing a FIFO queue (not supported by IoT)', () => {
  // Initial Setup
  const stack = new Stack();

  const queue = new sqs.Queue(stack, 'existing-fifo-queue-obj', {
    queueName: 'existing-queue.fifo',
    fifo: true
  });

  const props: IotToSqsProps = {
    existingQueueObj: queue,
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "Processing messages from IoT devices or factory machines",
        sql: "SELECT * FROM 'test/topic/#'",
        actions: []
      }
    }
  };

  expect.assertions(1);

  try {
    new IotToSqs(stack, 'test-iot-sqs', props);
  } catch (err: any) {
    expect(err.message).toBe('The IoT SQS action doesn\'t support Amazon SQS FIFO (First-In-First-Out) queues');
  }
});

test('Confirm CheckSqsProps is being called', () => {
  // Initial Setup
  const stack = new Stack();
  const props: IotToSqsProps = {
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "Processing messages from IoT devices or factory machines",
        sql: "SELECT * FROM 'test/topic/#'",
        actions: []
      }
    },
    queueProps: {
      removalPolicy: RemovalPolicy.DESTROY,
    },
    existingQueueObj: new sqs.Queue(stack, 'test', {})
  };

  const app = () => {
    new IotToSqs(stack, 'test-iot-sqs', props);
  };
  expect(app).toThrowError("Error - Either provide queueProps or existingQueueObj, but not both.\n");
});
