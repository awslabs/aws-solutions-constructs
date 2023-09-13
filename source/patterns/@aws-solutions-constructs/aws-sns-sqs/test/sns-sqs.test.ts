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
import { Stack } from "aws-cdk-lib";
import { SnsToSqs, SnsToSqsProps } from "../lib";
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Template } from 'aws-cdk-lib/assertions';

// --------------------------------------------------------------
// Pattern deployment with new Topic, new Queue and
// default properties
// --------------------------------------------------------------
test('Pattern deployment w/ new Topic, new Queue and default props', () => {
  // Initial Setup
  const stack = new Stack();
  const props: SnsToSqsProps = {};
  const testConstruct = new SnsToSqs(stack, 'test-sns-sqs', props);

  expect(testConstruct.snsTopic).toBeDefined();
  expect(testConstruct.encryptionKey).toBeDefined();
  // Assertion 2
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SNS::Topic", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "EncryptionKey1B843E66",
        "Arn"
      ]
    }
  });
  // Assertion 3
  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "EncryptionKey1B843E66",
        "Arn"
      ]
    }
  });
  // Assertion 4
  template.hasResourceProperties("AWS::SNS::Subscription", {
    Protocol: "sqs",
    TopicArn: {
      Ref: "testsnssqsSnsTopic2CD0065B"
    },
    Endpoint: {
      "Fn::GetAtt": [
        "testsnssqsqueueB02504BF",
        "Arn"
      ]
    }
  });
});

// --------------------------------------------------------------
// Pattern deployment with new Topic, new Queue, and
// overridden properties
// --------------------------------------------------------------
test('Pattern deployment w/ new topic, new queue, and overridden props', () => {
  // Initial Setup
  const stack = new Stack();
  const props: SnsToSqsProps = {
    topicProps: {
      topicName: "new-topic",
    },
    queueProps: {
      queueName: "new-queue.fifo",
      fifo: true
    },
    enableEncryptionWithCustomerManagedKey: true,
    encryptionKeyProps: {
      enableKeyRotation: false
    },
    deployDeadLetterQueue: false,
    maxReceiveCount: 0
  };
  new SnsToSqs(stack, 'test-sns-sqs', props);
  // Assertion 1
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SNS::Topic", {
    TopicName: "new-topic",
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "EncryptionKey1B843E66",
        "Arn"
      ]
    }
  });
  // Assertion 2
  template.hasResourceProperties("AWS::SQS::Queue", {
    QueueName: "new-queue.fifo",
    FifoQueue: true
  });
  // Assertion 3
  template.hasResourceProperties("AWS::KMS::Key", {
    EnableKeyRotation: false
  });
});

// --------------------------------------------------------------
// Test the getter methods
// --------------------------------------------------------------
test('Test getter methods', () => {
  // Initial Setup
  const stack = new Stack();
  const props: SnsToSqsProps = {
    enableEncryptionWithCustomerManagedKey: true,
    deployDeadLetterQueue: true,
    maxReceiveCount: 0
  };
  const app = new SnsToSqs(stack, 'test-sns-sqs', props);
  // Assertion 1
  expect(app.snsTopic !== null);
  // Assertion 2
  expect(app.encryptionKey !== null);
  // Assertion 3
  expect(app.sqsQueue !== null);
  // Assertion 4
  expect(app.deadLetterQueue !== null);
});

test('Test deployment w/ existing queue, and topic', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const topic = new sns.Topic(stack, "existing-topic-obj", {
    topicName: 'existing-topic-obj'
  });
  const queue = new sqs.Queue(stack, 'existing-queue-obj', {
    queueName: 'existing-queue-obj'
  });
  const app = new SnsToSqs(stack, 'sns-to-sqs-stack', {
    existingTopicObj: topic,
    existingQueueObj: queue
  });
  // Assertion 2
  expect(app.snsTopic !== null);
  // Assertion 3
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SNS::Topic", {
    TopicName: "existing-topic-obj"
  });
  // Assertion 4
  template.hasResourceProperties("AWS::SQS::Queue", {
    QueueName: "existing-queue-obj"
  });
});

test('Test deployment with imported encryption key', () => {
  // Stack
  const stack = new Stack();
  // Setup
  const kmsKey = new kms.Key(stack, 'imported-key', {
    enableKeyRotation: false
  });
  // Helper declaration
  new SnsToSqs(stack, 'sns-to-sqs-stack', {
    enableEncryptionWithCustomerManagedKey: true,
    encryptionKey: kmsKey
  });
  // Assertion 2
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::KMS::Key", {
    EnableKeyRotation: false
  });
  // Assertion 3
  template.hasResourceProperties("AWS::SNS::Topic", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "importedkey38675D68",
        "Arn"
      ]
    }
  });
});

// --------------------------------------------------------------
// Test deployment with SNS managed KMS key
// --------------------------------------------------------------
test('Test deployment with SNS managed KMS key', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new SnsToSqs(stack, 'sns-to-sqs-stack', {
    topicProps: {
      masterKey: kms.Alias.fromAliasName(stack, 'sns-managed-key', 'alias/aws/sns')
    },
    queueProps: {
      encryption: sqs.QueueEncryption.KMS
    },
    enableEncryptionWithCustomerManagedKey: false
  });
  // Assertion 2
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SNS::Topic", {
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
  // Assertion 3
  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "snstosqsstackqueueKey743636E7",
        "Arn"
      ]
    }
  });
});

// --------------------------------------------------------------
// Test deployment with CMK encrypted SNS Topic
// --------------------------------------------------------------
test('Test deployment with CMK encrypted SNS Topic', () => {
  // Stack
  const stack = new Stack();
  const cmk = new kms.Key(stack, 'cmk');
  // Helper declaration
  new SnsToSqs(stack, 'sns-to-sqs-stack', {
    topicProps: {
      masterKey: cmk
    }
  });
  // Assertion 1
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SNS::Topic", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "cmk01DE03DA",
        "Arn"
      ]
    }
  });
});

// --------------------------------------------------------------
// Pattern deployment with existing Topic and FIFO queues
// --------------------------------------------------------------
test('Pattern deployment w/ existing topic and FIFO queue', () => {
  // Initial Setup
  const stack = new Stack();

  const topic = new sns.Topic(stack, 'TestTopic', {
    contentBasedDeduplication: true,
    displayName: 'Customer subscription topic',
    fifo: true,
    topicName: 'customerTopic',
  });

  const props: SnsToSqsProps = {
    enableEncryptionWithCustomerManagedKey: false,
    existingTopicObj: topic,
    queueProps: {
      encryption: sqs.QueueEncryption.UNENCRYPTED,
      fifo: true,
    },
    deadLetterQueueProps: {
      encryption: sqs.QueueEncryption.UNENCRYPTED,
      fifo: true,
    }
  };

  new SnsToSqs(stack, 'test-sns-sqs', props);

  // Assertion 1
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    FifoQueue: true,
    RedrivePolicy: {
      deadLetterTargetArn: {
        "Fn::GetAtt": [
          "testsnssqsdeadLetterQueue8DACC0A1",
          "Arn"
        ]
      },
      maxReceiveCount: 15
    }
  });
});

// --------------------------------------------------------------
// Pattern deployment with existing Topic and Standard queues
// --------------------------------------------------------------
test('Pattern deployment w/ existing topic and Standard queue', () => {
  // Initial Setup
  const stack = new Stack();

  const topic = new sns.Topic(stack, 'TestTopic', {
    displayName: 'Customer subscription topic',
    fifo: false,
    topicName: 'customerTopic',
  });

  const props: SnsToSqsProps = {
    enableEncryptionWithCustomerManagedKey: false,
    existingTopicObj: topic,
    queueProps: {
      encryption: sqs.QueueEncryption.UNENCRYPTED,
      fifo: false,
    },
    deadLetterQueueProps: {
      encryption: sqs.QueueEncryption.UNENCRYPTED,
      fifo: false,
    }
  };

  new SnsToSqs(stack, 'test-sns-sqs', props);

  // Assertion 1
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    RedrivePolicy: {
      deadLetterTargetArn: {
        "Fn::GetAtt": [
          "testsnssqsdeadLetterQueue8DACC0A1",
          "Arn"
        ]
      },
      maxReceiveCount: 15
    }
  });
});

test('Check raw message delivery is true', () => {
  // Initial Setup
  const stack = new Stack();
  const props: SnsToSqsProps = {
    sqsSubscriptionProps: {
      rawMessageDelivery: true
    }
  };
  new SnsToSqs(stack, 'test-sns-sqs', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SNS::Subscription", {
    Protocol: "sqs",
    TopicArn: {
      Ref: "testsnssqsSnsTopic2CD0065B"
    },
    Endpoint: {
      "Fn::GetAtt": [
        "testsnssqsqueueB02504BF",
        "Arn"
      ]
    },
    RawMessageDelivery: true
  });
});

test('Check for filter policy', () => {
  // Initial Setup
  const stack = new Stack();
  const props: SnsToSqsProps = {
    sqsSubscriptionProps: {
      filterPolicy: {
        color: sns.SubscriptionFilter.stringFilter({
          allowlist: ['red', 'orange'],
          matchPrefixes: ['bl'],
        })
      }
    }
  };

  new SnsToSqs(stack, 'test-sns-sqs', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SNS::Subscription", {
    FilterPolicy: {
      color: [
        "red",
        "orange",
        {
          prefix: "bl"
        }
      ]
    }
  });
});

test('Check SNS dead letter queue', () => {
  // Initial Setup
  const stack = new Stack();
  const dlq = new sqs.Queue(stack, 'existing-dlq-obj', {});
  const props: SnsToSqsProps = {
    sqsSubscriptionProps: {
      deadLetterQueue: dlq
    }
  };

  new SnsToSqs(stack, 'test-sns-sqs', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SNS::Subscription", {
    RedrivePolicy: {
      deadLetterTargetArn: {
        "Fn::GetAtt": [
          "existingdlqobj784C5542",
          "Arn"
        ]
      }
    }
  });
});

test('Construct uses topicProps.masterKey when specified', () => {
  // Initial Setup
  const stack = new Stack();
  const cmk = new kms.Key(stack, 'cmkfortopic');
  const props: SnsToSqsProps = {
    topicProps: {
      masterKey: cmk
    }
  };

  new SnsToSqs(stack, 'test-sns-sqs', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SNS::Topic", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "cmkfortopic0904647B",
        "Arn"
      ]
    }
  });
});

test('Construct uses queueProps.encryptionMasterKey when specified', () => {
  // Initial Setup
  const stack = new Stack();
  const cmk = new kms.Key(stack, 'cmkforqueue');
  const props: SnsToSqsProps = {
    queueProps: {
      encryptionMasterKey: cmk
    }
  };

  new SnsToSqs(stack, 'test-sns-sqs', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "cmkforqueue4E093476",
        "Arn"
      ]
    }
  });
});

test('Construct does not override unencrypted topic when passed in existingTopicObj prop', () => {
  const stack = new Stack();

  const existingTopicObj = new sns.Topic(stack, 'Topic', {
    topicName: 'existing-topic-name'
  });

  const props: SnsToSqsProps = {
    existingTopicObj,
  };

  const testConstruct = new SnsToSqs(stack, 'test-sns-sqs', props);

  expect(testConstruct.snsTopic).toBeDefined();
  expect(testConstruct.encryptionKey).not.toBeDefined();
});

test('Confirm that CheckSnsProps is called', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const topic = new sns.Topic(stack, "existing-topic-obj", {
    topicName: 'existing-topic-obj'
  });
  const queue = new sqs.Queue(stack, 'existing-queue-obj', {
    queueName: 'existing-queue-obj'
  });

  const app = () => {
    new SnsToSqs(stack, 'sns-to-sqs-stack', {
      existingTopicObj: topic,
      topicProps: {
        topicName: 'topic-name'
      },
      existingQueueObj: queue
    });
  };

  // Assertion
  expect(app).toThrowError(/Error - Either provide topicProps or existingTopicObj, but not both.\n/);
});