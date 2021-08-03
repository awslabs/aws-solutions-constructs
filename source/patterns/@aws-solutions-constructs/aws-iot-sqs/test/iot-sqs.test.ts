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

// Imports
import { Stack } from "@aws-cdk/core";
import { IotToSqs, IotToSqsProps } from "../lib";
import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import * as sqs from '@aws-cdk/aws-sqs';
import * as kms from '@aws-cdk/aws-kms';

// --------------------------------------------------------------
// Pattern deployment with default props
// --------------------------------------------------------------
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

  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();

  // Creates a default sqs queue
  expect(stack).toHaveResource("AWS::SQS::Queue", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "testiotsqsEncryptionKey64EE64B1",
        "Arn"
      ]
    }
  });

  // Creates a dead letter queue
  expect(stack).toHaveResource("AWS::SQS::Queue", {
    KmsMasterKeyId: "alias/aws/sqs"
  });

  // Creates an IoT Topic Rule
  expect(stack).toHaveResource("AWS::IoT::TopicRule", {
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
  expect(stack).toHaveResource("AWS::KMS::Key", {
    EnableKeyRotation: true
  });
});

// --------------------------------------------------------------
// Testing with existing SQS Queue
// --------------------------------------------------------------
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

  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();

  // Creates a default sqs queue
  expect(stack).toHaveResource("AWS::SQS::Queue", {
    QueueName: "existing-queue-obj"
  });
});

// --------------------------------------------------------------
// Testing with passing queue and dead letter queue props
// --------------------------------------------------------------
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

  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();

  // Creates a queue using the provided props
  expect(stack).toHaveResource("AWS::SQS::Queue", {
    QueueName: "queue-name",
    RedrivePolicy: {
      deadLetterTargetArn: {
        "Fn::GetAtt": [
          "testiotsqsdeadLetterQueue66A04E81",
          "Arn",
        ],
      },
      maxReceiveCount: 15
    }
  });

  // Creates a dead letter queue using the provided props
  expect(stack).toHaveResource("AWS::SQS::Queue", {
    QueueName: "dlq-name"
  });
});

// --------------------------------------------------------------
// Testing with dead letter queue turned off
// --------------------------------------------------------------
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

  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();

  // Creates a queue using the provided props
  expect(stack).toHaveResource("AWS::SQS::Queue", {
    QueueName: "queue-name"
  });

  // Does not create the default dead letter queue
  expect(stack).not.toHaveResource("AWS::SQS::Queue", {
    KmsMasterKeyId: "alias/aws/sqs"
  });
});

// --------------------------------------------------------------
// Testing with custom maxReceiveCount
// --------------------------------------------------------------
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

  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();

  // Creates a queue using the provided props
  expect(stack).toHaveResource("AWS::SQS::Queue", {
    QueueName: "queue-name",
    RedrivePolicy: {
      deadLetterTargetArn: {
        "Fn::GetAtt": [
          "testiotsqsdeadLetterQueue66A04E81",
          "Arn",
        ],
      },
      maxReceiveCount: 1
    },
  });
});

// --------------------------------------------------------------
// Testing without creating a KMS key
// --------------------------------------------------------------
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

  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();

  // Creates a default sqs queue
  expect(stack).toHaveResource("AWS::SQS::Queue", {
    KmsMasterKeyId: "alias/aws/sqs"
  });

  // Creates a dead letter queue
  expect(stack).toHaveResource("AWS::SQS::Queue", {
    KmsMasterKeyId: "alias/aws/sqs"
  });

  // Creates an IoT Topic Rule
  expect(stack).toHaveResource("AWS::IoT::TopicRule", {
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
  expect(stack).not.toHaveResource("AWS::KMS::Key");
});

// --------------------------------------------------------------
// Testing with existing KMS key
// --------------------------------------------------------------
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

  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();

  // Creates a default sqs queue
  expect(stack).toHaveResource("AWS::SQS::Queue", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "existingkey205DFC01",
        "Arn"
      ]
    }
  });

  // Creates a dead letter queue
  expect(stack).toHaveResource("AWS::SQS::Queue", {
    KmsMasterKeyId: "alias/aws/sqs"
  });

  // Creates an IoT Topic Rule
  expect(stack).toHaveResource("AWS::IoT::TopicRule", {
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
  expect(stack).toHaveResource("AWS::KMS::Key", {
    EnableKeyRotation: false
  });
});

// --------------------------------------------------------------
// Testing with passing KMS key props
// --------------------------------------------------------------
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

  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();

  // Creates a default sqs queue
  expect(stack).toHaveResource("AWS::SQS::Queue", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "testiotsqsEncryptionKey64EE64B1",
        "Arn"
      ]
    }
  });

  // Creates a dead letter queue
  expect(stack).toHaveResource("AWS::SQS::Queue", {
    KmsMasterKeyId: "alias/aws/sqs"
  });

  // Creates an IoT Topic Rule
  expect(stack).toHaveResource("AWS::IoT::TopicRule", {
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
  expect(stack).toHaveResource("AWS::KMS::Key", {
    EnableKeyRotation: false
  });

  expect(stack).toHaveResource("AWS::KMS::Alias", {
    AliasName: "alias/new-key-alias-from-props",
    TargetKeyId: {
      "Fn::GetAtt": [
        "testiotsqsEncryptionKey64EE64B1",
        "Arn",
      ]
    }
  });
});

// --------------------------------------------------------------
// Testing with passing a FIFO queue (not supported by IoT)
// --------------------------------------------------------------
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
  } catch (err) {
    expect(err.message).toBe('The IoT SQS action doesn\'t support Amazon SQS FIFO (First-In-First-Out) queues');
  }
});
