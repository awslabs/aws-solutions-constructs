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
import { SnsToSqs, SnsToSqsProps } from "../lib";
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { CheckKeyProperty, CheckQueueKeyType, CheckTopicKeyType, keyType } from './utils';

test('Pattern deployment w/ new Topic, new Queue and default props', () => {
  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const props: SnsToSqsProps = {};
  const testConstruct = new SnsToSqs(stack, 'test-sns-sqs', props);

  CheckKeyProperty(testConstruct.queueEncryptionKey, keyType.cmk);
  CheckKeyProperty(testConstruct.topicEncryptionKey, keyType.cmk);
  CheckKeyProperty(testConstruct.encryptionKey, keyType.none);

  expect(testConstruct.snsTopic).toBeDefined();
  expect(testConstruct.sqsQueue).toBeDefined();
  expect(testConstruct.queueEncryptionKey?.keyId).not.toEqual(testConstruct.topicEncryptionKey?.keyId);

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::KMS::Key", 2);
  template.resourceCountIs("AWS::SQS::Queue", 2);
  template.resourceCountIs("AWS::SNS::Topic", 1);
  template.resourceCountIs("AWS::SNS::Subscription", 1);

  CheckQueueKeyType(template, keyType.cmk);
  CheckTopicKeyType(template, keyType.cmk);

  // Confirm subscription has proper target
  template.hasResourceProperties("AWS::SNS::Subscription", {
    Protocol: "sqs",
  });
});

test('Pattern deployment w/ new topic, new queue, and overridden props', () => {
  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);
  const testTopicName = "topicehdjs";
  const testQueueName = "queueehdjs.fifo";

  const props: SnsToSqsProps = {
    topicProps: {
      topicName: testTopicName,
    },
    queueProps: {
      queueName: testQueueName,
      fifo: true
    },
    queueEncryptionKeyProps: {
      enableKeyRotation: false
    },
    encryptQueueWithCmk: true,
    encryptTopicWithCmk: true,
    deployDeadLetterQueue: false,
    maxReceiveCount: 0
  };
  const testConstruct = new SnsToSqs(stack, 'test-sns-sqs', props);

  CheckKeyProperty(testConstruct.queueEncryptionKey, keyType.cmk);
  CheckKeyProperty(testConstruct.topicEncryptionKey, keyType.cmk);
  CheckKeyProperty(testConstruct.encryptionKey, keyType.none);

  expect(testConstruct.snsTopic).toBeDefined();
  expect(testConstruct.sqsQueue).toBeDefined();
  expect(testConstruct.queueEncryptionKey?.keyId).not.toEqual(testConstruct.topicEncryptionKey?.keyId);
  expect(testConstruct.deadLetterQueue).not.toBeDefined();

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::KMS::Key", 2);
  template.resourceCountIs("AWS::SQS::Queue", 1);
  template.resourceCountIs("AWS::SNS::Topic", 1);
  template.resourceCountIs("AWS::SNS::Subscription", 1);

  CheckTopicKeyType(template, keyType.cmk);
  CheckQueueKeyType(template, keyType.cmk);

  template.hasResourceProperties("AWS::SNS::Topic", {
    TopicName: testTopicName,
  });

  template.hasResourceProperties("AWS::SQS::Queue", {
    QueueName: testQueueName,
    FifoQueue: true,
  });

  // One key has rotation (default), one does not (override)
  // NOTE - THIS IS FOR TESTING, Key Rotation is a best practice
  template.hasResourceProperties("AWS::KMS::Key", {
    EnableKeyRotation: false
  });
  template.hasResourceProperties("AWS::KMS::Key", {
    EnableKeyRotation: true
  });
});

test('Test getter methods', () => {
  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const props: SnsToSqsProps = {
    deployDeadLetterQueue: true,
    maxReceiveCount: 0
  };
  const testConstruct = new SnsToSqs(stack, 'test-sns-sqs', props);

  CheckKeyProperty(testConstruct.queueEncryptionKey, keyType.cmk);
  CheckKeyProperty(testConstruct.topicEncryptionKey, keyType.cmk);
  CheckKeyProperty(testConstruct.encryptionKey, keyType.none);

  expect(testConstruct.snsTopic).toBeDefined();
  expect(testConstruct.sqsQueue).toBeDefined();
  expect(testConstruct.deadLetterQueue).toBeDefined();

  const template = Template.fromStack(stack);

  CheckQueueKeyType(template, keyType.cmk);
  CheckTopicKeyType(template, keyType.cmk);
});

test('Test deployment w/ existing queue, and topic', () => {
  // Stack
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);
  const testTopicName = 'existing-topic-adfa';
  const testQueueName = 'existing-queue-zfx';

  // Helper declaration
  const topic = new sns.Topic(stack, "existing-topic-obj", {
    topicName: testTopicName
  });
  const queue = new sqs.Queue(stack, 'existing-queue-obj', {
    queueName: testQueueName
  });
  const testConstruct = new SnsToSqs(stack, 'sns-to-sqs-stack', {
    existingTopicObj: topic,
    existingQueueObj: queue
  });

  CheckKeyProperty(testConstruct.queueEncryptionKey, keyType.none);
  CheckKeyProperty(testConstruct.topicEncryptionKey, keyType.none);
  CheckKeyProperty(testConstruct.encryptionKey, keyType.none);

  expect(testConstruct.snsTopic).toBeDefined();
  expect(testConstruct.sqsQueue).toBeDefined();

  const template = Template.fromStack(stack);
  // Since we used simple CDK calls to make topic/queue, there are no CMKs nor DLQ
  template.resourceCountIs("AWS::KMS::Key", 0);
  template.resourceCountIs("AWS::SQS::Queue", 1);
  template.resourceCountIs("AWS::SNS::Topic", 1);
  template.resourceCountIs("AWS::SNS::Subscription", 1);

  CheckQueueKeyType(template,  keyType.none);
  CheckTopicKeyType(template,  keyType.none);

  // Confirm subscription has proper target
  template.hasResourceProperties("AWS::SNS::Subscription", {
    Protocol: "sqs",
  });
});

test('Test deployment with imported encryption key', () => {
  // Stack
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);
  const testKeyAlias = 'key-asdg';

  // Setup
  const kmsKey = new kms.Key(stack, 'imported-key', {
    enableKeyRotation: false,
    alias: testKeyAlias
  });
  // Helper declaration
  const testConstruct = new SnsToSqs(stack, 'sns-to-sqs-stack', {
    existingQueueEncryptionKey: kmsKey
  });

  CheckKeyProperty(testConstruct.queueEncryptionKey, keyType.cmk);
  CheckKeyProperty(testConstruct.topicEncryptionKey, keyType.cmk);
  CheckKeyProperty(testConstruct.encryptionKey, keyType.none);

  expect(testConstruct.snsTopic).toBeDefined();
  expect(testConstruct.sqsQueue).toBeDefined();
  expect(testConstruct.queueEncryptionKey?.keyId).not.toEqual(testConstruct.topicEncryptionKey?.keyId);
  expect(testConstruct.deadLetterQueue).toBeDefined();

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::KMS::Key", 2);
  template.resourceCountIs("AWS::SQS::Queue", 2);
  template.resourceCountIs("AWS::SNS::Topic", 1);
  template.resourceCountIs("AWS::SNS::Subscription", 1);

  template.hasResourceProperties("AWS::KMS::Key", {
    EnableKeyRotation: false,
  });

  template.hasResourceProperties("AWS::KMS::Key", {
    EnableKeyRotation: true,
  });

  CheckQueueKeyType(template, keyType.cmk);
  CheckTopicKeyType(template, keyType.cmk);

  template.hasResourceProperties("AWS::SNS::Topic", {
    KmsMasterKeyId: Match.anyValue()
  });

});

test('Test deployment with SNS managed KMS key', () => {
  // Stack
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  // Helper declaration
  const testConstruct = new SnsToSqs(stack, 'sns-to-sqs-stack', {
    topicProps: {
      masterKey: kms.Alias.fromAliasName(stack, 'sns-managed-key', 'alias/aws/sns')
    },
    queueProps: {
      encryptionMasterKey: new kms.Key(stack, 'test-key', {}),
    },
    enableEncryptionWithCustomerManagedKey: false
  });

  CheckKeyProperty(testConstruct.queueEncryptionKey, keyType.none);
  CheckKeyProperty(testConstruct.topicEncryptionKey, keyType.none);
  CheckKeyProperty(testConstruct.encryptionKey, keyType.none);

  expect(testConstruct.snsTopic).toBeDefined();
  expect(testConstruct.sqsQueue).toBeDefined();
  expect(testConstruct.deadLetterQueue).toBeDefined();

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::KMS::Key", 1);
  template.resourceCountIs("AWS::SQS::Queue", 2);
  template.resourceCountIs("AWS::SNS::Topic", 1);
  template.resourceCountIs("AWS::SNS::Subscription", 1);

  CheckQueueKeyType(template, keyType.cmk);
  CheckTopicKeyType(template, keyType.sse);

});

test('Test deployment with CMK encrypted SNS Topic (avoids interface)', () => {
  // Stack
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const testDescription = 'someString-llasdj';
  const testTopicName = 'topic-hyuyj';
  const cmk = new kms.Key(stack, 'cmk', { description: testDescription });
  // Helper declaration
  const testConstruct = new SnsToSqs(stack, 'sns-to-sqs-stack', {
    topicProps: {
      masterKey: cmk,
      topicName: testTopicName
    }
  });

  CheckKeyProperty(testConstruct.queueEncryptionKey, keyType.cmk);
  CheckKeyProperty(testConstruct.topicEncryptionKey, keyType.none);
  CheckKeyProperty(testConstruct.encryptionKey, keyType.none);

  expect(testConstruct.snsTopic).toBeDefined();
  expect(testConstruct.sqsQueue).toBeDefined();
  expect(testConstruct.queueEncryptionKey?.keyId).not.toEqual(testConstruct.topicEncryptionKey?.keyId);
  expect(testConstruct.deadLetterQueue).toBeDefined();

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::KMS::Key", 2);
  template.resourceCountIs("AWS::SQS::Queue", 2);
  template.resourceCountIs("AWS::SNS::Topic", 1);
  template.resourceCountIs("AWS::SNS::Subscription", 1);

  CheckQueueKeyType(template, keyType.cmk);
  CheckTopicKeyType(template, keyType.cmk);

  template.hasResourceProperties("AWS::KMS::Key", {
    Description: testDescription
  });
});

test('Pattern deployment w/ existing topic and FIFO queue', () => {
  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const topic = new sns.Topic(stack, 'TestTopic', {
    contentBasedDeduplication: true,
    displayName: 'Customer subscription topic',
    fifo: true,
    topicName: 'customerTopic',
  });

  const props: SnsToSqsProps = {
    encryptQueueWithCmk: false,
    existingTopicObj: topic,
    queueProps: {
      fifo: true,
    },
    deadLetterQueueProps: {
      encryption: sqs.QueueEncryption.UNENCRYPTED,
      fifo: true,
    }
  };

  const app = () => {
    new SnsToSqs(stack, 'test-sns-sqs', props);
  };

  // Assertion
  expect(app).toThrowError("SQS queue encrypted by AWS managed KMS key cannot be used as SNS subscription");
});

test('Pattern deployment w/ existing topic and Standard queue', () => {
  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const topic = new sns.Topic(stack, 'TestTopic', {
    displayName: 'Customer subscription topic',
    fifo: false,
    topicName: 'customerTopic',
  });

  const props: SnsToSqsProps = {
    encryptQueueWithCmk: false,
    existingTopicObj: topic,
    queueProps: {
      fifo: false,
    },
    deadLetterQueueProps: {
      encryption: sqs.QueueEncryption.UNENCRYPTED,
      fifo: false,
    }
  };
  const app = () => {
    new SnsToSqs(stack, 'test-sns-sqs', props);
  };

  // Assertion
  expect(app).toThrowError("SQS queue encrypted by AWS managed KMS key cannot be used as SNS subscription");
});

test('Check sqsSubscriptionProps are used', () => {
  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const props: SnsToSqsProps = {
    sqsSubscriptionProps: {
      rawMessageDelivery: true,
      filterPolicy: {
        color: sns.SubscriptionFilter.stringFilter({
          allowlist: ['red', 'orange'],
          matchPrefixes: ['bl'],
        })
      }
    }
  };
  const testConstruct = new SnsToSqs(stack, 'test-sns-sqs', props);

  CheckKeyProperty(testConstruct.queueEncryptionKey, keyType.cmk);
  CheckKeyProperty(testConstruct.topicEncryptionKey, keyType.cmk);
  CheckKeyProperty(testConstruct.encryptionKey, keyType.none);

  const template = Template.fromStack(stack);

  CheckQueueKeyType(template, keyType.cmk);
  CheckTopicKeyType(template, keyType.cmk);

  template.hasResourceProperties("AWS::SNS::Subscription", {
    Protocol: "sqs",
    RawMessageDelivery: true,
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
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const dlq = new sqs.Queue(stack, 'existing-dlq-obj', {});
  const props: SnsToSqsProps = {
    sqsSubscriptionProps: {
      deadLetterQueue: dlq
    }
  };

  const testConstruct = new SnsToSqs(stack, 'test-sns-sqs', props);

  CheckKeyProperty(testConstruct.queueEncryptionKey, keyType.cmk);
  CheckKeyProperty(testConstruct.topicEncryptionKey, keyType.cmk);
  CheckKeyProperty(testConstruct.encryptionKey, keyType.none);

  const template = Template.fromStack(stack);

  // The SNS DLQ is a third queue and should be attached to the Subscription
  template.resourceCountIs("AWS::SQS::Queue", 3);

  CheckQueueKeyType(template, keyType.cmk);
  CheckTopicKeyType(template, keyType.cmk);

  template.hasResourceProperties("AWS::SNS::Subscription", {
    RedrivePolicy: Match.anyValue()
  });
});

test('Construct uses topicProps.masterKey when specified (avoids interface)', () => {
  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const cmk = new kms.Key(stack, 'cmkfortopic');
  const noKeyQueue = new sqs.Queue(stack, 'placeHolderQueue', {});
  const props: SnsToSqsProps = {
    topicProps: {
      masterKey: cmk
    },
    existingQueueObj: noKeyQueue,
  };

  const testConstruct = new SnsToSqs(stack, 'test-sns-sqs', props);

  CheckKeyProperty(testConstruct.queueEncryptionKey, keyType.none);
  CheckKeyProperty(testConstruct.topicEncryptionKey, keyType.none);
  CheckKeyProperty(testConstruct.encryptionKey, keyType.none);

  expect(testConstruct.snsTopic).toBeDefined();
  expect(testConstruct.sqsQueue).toBeDefined();
  expect(testConstruct.deadLetterQueue).not.toBeDefined();

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::KMS::Key", 1);
  template.resourceCountIs("AWS::SQS::Queue", 1);
  template.resourceCountIs("AWS::SNS::Topic", 1);
  template.resourceCountIs("AWS::SNS::Subscription", 1);

  CheckQueueKeyType(template, keyType.none);
  CheckTopicKeyType(template, keyType.cmk);

});

test('Construct uses queueProps.encryptionMasterKey when specified (avoids interface)', () => {
  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const cmk = new kms.Key(stack, 'cmkforqueue', {});
  const props: SnsToSqsProps = {
    queueProps: {
      encryptionMasterKey: cmk
    }
  };

  const testConstruct = new SnsToSqs(stack, 'test-sns-sqs', props);

  CheckKeyProperty(testConstruct.queueEncryptionKey, keyType.none);
  CheckKeyProperty(testConstruct.topicEncryptionKey, keyType.cmk);
  CheckKeyProperty(testConstruct.encryptionKey, keyType.none);

  expect(testConstruct.snsTopic).toBeDefined();
  expect(testConstruct.sqsQueue).toBeDefined();
  expect(testConstruct.encryptionKey).not.toBeDefined();
  expect(testConstruct.queueEncryptionKey).not.toBeDefined();
  expect(testConstruct.topicEncryptionKey).toBeDefined();
  expect(testConstruct.deadLetterQueue).toBeDefined();

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::KMS::Key", 2);
  template.resourceCountIs("AWS::SQS::Queue", 2);
  template.resourceCountIs("AWS::SNS::Topic", 1);
  template.resourceCountIs("AWS::SNS::Subscription", 1);

  CheckQueueKeyType(template, keyType.cmk);
  CheckTopicKeyType(template, keyType.cmk);
});

test('Construct does not override unencrypted topic when passed in existingTopicObj prop', () => {
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const existingTopicObj = new sns.Topic(stack, 'Topic', {
    topicName: 'existing-topic-name'
  });

  const props: SnsToSqsProps = {
    existingTopicObj,
  };

  const testConstruct = new SnsToSqs(stack, 'test-sns-sqs', props);

  CheckKeyProperty(testConstruct.queueEncryptionKey, keyType.cmk);
  CheckKeyProperty(testConstruct.topicEncryptionKey, keyType.none);
  CheckKeyProperty(testConstruct.encryptionKey, keyType.none);

  expect(testConstruct.snsTopic).toBeDefined();
  expect(testConstruct.sqsQueue).toBeDefined();
  expect(testConstruct.queueEncryptionKey?.keyId).not.toEqual(testConstruct.topicEncryptionKey?.keyId);
  expect(testConstruct.deadLetterQueue).toBeDefined();

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::KMS::Key", 1);
  template.resourceCountIs("AWS::SQS::Queue", 2);
  template.resourceCountIs("AWS::SNS::Topic", 1);
  template.resourceCountIs("AWS::SNS::Subscription", 1);

  CheckQueueKeyType(template, keyType.cmk);
  CheckTopicKeyType(template, keyType.none);
});

test('Test deployment with existing encryption key for Topic', () => {
  const testDescription = "someValue";

  // Stack
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);
  // Setup
  const kmsKey = new kms.Key(stack, 'imported-key', {
    enableKeyRotation: false,
    description: testDescription
  });
  // Helper declaration
  const testConstruct = new SnsToSqs(stack, 'sns-to-sqs-stack', {
    encryptTopicWithCmk: true,
    existingTopicEncryptionKey: kmsKey
  });

  CheckKeyProperty(testConstruct.queueEncryptionKey, keyType.cmk);
  CheckKeyProperty(testConstruct.topicEncryptionKey, keyType.cmk);
  CheckKeyProperty(testConstruct.encryptionKey, keyType.none);

  expect(testConstruct.snsTopic).toBeDefined();
  expect(testConstruct.sqsQueue).toBeDefined();
  expect(testConstruct.queueEncryptionKey?.keyId).not.toEqual(testConstruct.topicEncryptionKey?.keyId);
  expect(testConstruct.deadLetterQueue).toBeDefined();

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::KMS::Key", 2);
  template.resourceCountIs("AWS::SQS::Queue", 2);
  template.resourceCountIs("AWS::SNS::Topic", 1);
  template.resourceCountIs("AWS::SNS::Subscription", 1);

  template.hasResourceProperties("AWS::KMS::Key", {
    EnableKeyRotation: false,
    Description: testDescription
  });

  CheckQueueKeyType(template, keyType.cmk);
  CheckTopicKeyType(template, keyType.cmk);
});

test('Test deployment with key props for Topic', () => {
  const testDescription = "test-description-lkjh";

  // Stack
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);
  // Helper declaration
  const testConstruct = new SnsToSqs(stack, 'sns-to-sqs-stack', {
    encryptTopicWithCmk: true,
    topicEncryptionKeyProps: {
      enableKeyRotation: false,
      description: testDescription
    }
  });

  CheckKeyProperty(testConstruct.queueEncryptionKey, keyType.cmk);
  CheckKeyProperty(testConstruct.topicEncryptionKey, keyType.cmk);
  CheckKeyProperty(testConstruct.encryptionKey, keyType.none);

  expect(testConstruct.snsTopic).toBeDefined();
  expect(testConstruct.sqsQueue).toBeDefined();
  expect(testConstruct.queueEncryptionKey?.keyId).not.toEqual(testConstruct.topicEncryptionKey?.keyId);
  expect(testConstruct.deadLetterQueue).toBeDefined();

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::KMS::Key", 2);
  template.resourceCountIs("AWS::SQS::Queue", 2);
  template.resourceCountIs("AWS::SNS::Topic", 1);
  template.resourceCountIs("AWS::SNS::Subscription", 1);

  template.hasResourceProperties("AWS::KMS::Key", {
    EnableKeyRotation: false,
    Description: testDescription
  });

  CheckQueueKeyType(template, keyType.cmk);
  CheckTopicKeyType(template, keyType.cmk);
});

test('Test deployment with no key props or key for Topic', () => {
  // Stack
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);
  // Helper declaration
  const testConstruct = new SnsToSqs(stack, 'sns-to-sqs-stack', {
    encryptTopicWithCmk: true
  });

  CheckKeyProperty(testConstruct.queueEncryptionKey, keyType.cmk);
  CheckKeyProperty(testConstruct.topicEncryptionKey, keyType.cmk);
  CheckKeyProperty(testConstruct.encryptionKey, keyType.none);

  expect(testConstruct.snsTopic).toBeDefined();
  expect(testConstruct.sqsQueue).toBeDefined();
  expect(testConstruct.encryptionKey).not.toBeDefined();
  expect(testConstruct.queueEncryptionKey).toBeDefined();
  expect(testConstruct.topicEncryptionKey).toBeDefined();
  expect(testConstruct.queueEncryptionKey?.keyId).not.toEqual(testConstruct.topicEncryptionKey?.keyId);
  expect(testConstruct.deadLetterQueue).toBeDefined();

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::KMS::Key", 2);
  template.resourceCountIs("AWS::SQS::Queue", 2);
  template.resourceCountIs("AWS::SNS::Topic", 1);
  template.resourceCountIs("AWS::SNS::Subscription", 1);

  CheckQueueKeyType(template, keyType.cmk);
  CheckTopicKeyType(template, keyType.cmk);
});

test('Old interface use with feature flag enabled', () => {
  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const props: SnsToSqsProps = {
    // Force a second key to avoid circular reference problem
    enableEncryptionWithCustomerManagedKey: true,
    queueProps: {
      encryptionMasterKey:  new kms.Key(stack, 'queueKey', {})
    }
  };
  const testConstruct = new SnsToSqs(stack, 'test-sns-sqs', props);

  CheckKeyProperty(testConstruct.queueEncryptionKey, keyType.none);
  CheckKeyProperty(testConstruct.topicEncryptionKey, keyType.none);
  // this is the key created for the topic
  CheckKeyProperty(testConstruct.encryptionKey, keyType.cmk);

  expect(testConstruct.snsTopic).toBeDefined();
  expect(testConstruct.encryptionKey).toBeDefined();

  const template = Template.fromStack(stack);
  CheckQueueKeyType(template, keyType.cmk);
  CheckTopicKeyType(template, keyType.cmk);

  template.resourceCountIs("AWS::KMS::Key", 2);
  template.resourceCountIs("AWS::SQS::Queue", 2);
  template.resourceCountIs("AWS::SNS::Topic", 1);

  template.hasResourceProperties("AWS::SNS::Subscription", {
    Protocol: "sqs",
  });
});

/*******************************
 *
 * Input tests - these tests check that invalid inputs are caught
 * before any processing is attempted. Having both SNS and SQS in the same
 * Construct means the associated properties have unique names in the construct to
 * avoid collisions, so the standard checks will not find these.
 *
 *******************************/

test('Confirm that CheckSqsProps is called', () => {
  // Stack
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const app = () => {
    new SnsToSqs(stack, 'sns-to-sqs-stack', {
      queueProps: {
        removalPolicy: RemovalPolicy.DESTROY,
      },
      existingQueueObj: new sqs.Queue(stack, 'test', {})
    });
  };

  // Assertion
  expect(app).toThrowError("Error - Either provide queueProps or existingQueueObj, but not both.\n");
});

test('Confirm that Construct checks for mixed deprecated and active props', () => {
  // Stack
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const app = () => {
    new SnsToSqs(stack, 'sns-to-sqs-stack', {
      queueProps: {
        removalPolicy: RemovalPolicy.DESTROY,
      },
      enableEncryptionWithCustomerManagedKey: true,
      encryptQueueWithCmk: true
    });
  };

  // Assertion
  expect(app).toThrowError(/Cannot specify both deprecated key props and new key props/);
});

test('Confirm that Construct checks for mixed deprecated and active props', () => {
  // Stack
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const app = () => {
    new SnsToSqs(stack, 'sns-to-sqs-stack', {
      queueProps: {
        removalPolicy: RemovalPolicy.DESTROY,
      },
      enableEncryptionWithCustomerManagedKey: true,
      encryptQueueWithCmk: true
    });
  };

  // Assertion
  expect(app).toThrowError(/Cannot specify both deprecated key props and new key props/);
});

test('Confirm that queueProps and existingQueue is caught', () => {
  // Stack
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const app = () => {
    new SnsToSqs(stack, 'sns-to-sqs-stack', {
      queueProps: {
        removalPolicy: RemovalPolicy.DESTROY,
      },
      existingQueueObj: new sqs.Queue(stack, 'test', {})
    });
  };

  // Assertion
  expect(app).toThrowError("Error - Either provide queueProps or existingQueueObj, but not both.\n");
});

test('Confirm that existingTopic and topicProps is caught', () => {
  // Stack
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);
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

test('Confirm that CheckSqsProps is called', () => {
  // Stack
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const app = () => {
    new SnsToSqs(stack, 'sns-to-sqs-stack', {
      queueProps: {
        removalPolicy: RemovalPolicy.DESTROY,
      },
      existingQueueObj: new sqs.Queue(stack, 'test', {})
    });
  };

  // Assertion
  expect(app).toThrowError("Error - Either provide queueProps or existingQueueObj, but not both.\n");
});

test('Catch queue key and queue key props', () => {
  // Stack
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const app = () => {
    new SnsToSqs(stack, 'sns-to-sqs-stack', {
      existingQueueEncryptionKey: new kms.Key(stack, 'test', {}),
      queueEncryptionKeyProps: {}
    });
  };

  // Assertion
  expect(app).toThrowError(/Error - Either provide existingQueueEncryptionKey or queueEncryptionKeyProps, but not both.\n/);
});

test('Catch queueProps key and construct props key', () => {
  // Stack
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const app = () => {
    new SnsToSqs(stack, 'sns-to-sqs-stack', {
      existingQueueEncryptionKey: new kms.Key(stack, 'firstKey', {}),
      queueProps:  {
        encryptionMasterKey:  new kms.Key(stack, 'secondKey', {})
      }
    });
  };

  // Assertion
  expect(app).toThrowError(/Error - Either provide queueProps.encryptionMasterKey or existingQueueEncryptionKey, but not both.\n/);
});

test('Catch queueProps key and construct props queue Key Props', () => {
  // Stack
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const app = () => {
    new SnsToSqs(stack, 'sns-to-sqs-stack', {
      queueProps:  {
        encryptionMasterKey:  new kms.Key(stack, 'secondKey', {})
      },
      queueEncryptionKeyProps: {}
    });
  };

  // Assertion
  expect(app).toThrowError(/Error - Either provide queueProps.encryptionMasterKey or queueEncryptionKeyProps, but not both./);
});

test('Catch topic key and topic key props', () => {
  // Stack
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const app = () => {
    new SnsToSqs(stack, 'sns-to-sqs-stack', {
      existingTopicEncryptionKey: {} as kms.Key,
      topicEncryptionKeyProps: {}
    });
  };

  // Assertion
  expect(app).toThrowError(/Error - Either provide existingTopicEncryptionKey or topicEncryptionKeyProps, but not both.\n/);
});

test('Catch topicProps key and construct props key', () => {
  // Stack
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const app = () => {
    new SnsToSqs(stack, 'sns-to-sqs-stack', {
      topicProps: {
        masterKey: new kms.Key(stack, 'firstKey', {})
      },
      existingTopicEncryptionKey: new kms.Key(stack, 'secondKey', {})
    });
  };

  // Assertion
  expect(app).toThrowError(/Error - Either provide topicProps.masterKey or existingTopicEncryptionKey, but not both.\n/);
});

test('Catch topicProps key and construct props Key props', () => {
  // Stack
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const app = () => {
    new SnsToSqs(stack, 'sns-to-sqs-stack', {
      topicProps: {
        masterKey: new kms.Key(stack, 'firstKey', {})
      },
      topicEncryptionKeyProps: {}
    });
  };

  // Assertion
  expect(app).toThrowError(/Error - Either provide topicProps.masterKey or topicEncryptionKeyProps, but not both.\n/);
});

test('Catch encryptTopicWithCmk false with topic key props', () => {
  // Stack
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const app = () => {
    new SnsToSqs(stack, 'sns-to-sqs-stack', {
      encryptTopicWithCmk: false,
      topicEncryptionKeyProps: {}
    });
  };

  // Assertion
  expect(app).toThrowError(/Error - if encryptTopicWithCmk is false, submitting topicEncryptionKeyProps is invalid\n/);
});

test('Catch encryptTopicWithCmk false with topic key', () => {
  // Stack
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const app = () => {
    new SnsToSqs(stack, 'sns-to-sqs-stack', {
      encryptTopicWithCmk: false,
      existingTopicEncryptionKey: {} as kms.Key
    });
  };

  // Assertion
  expect(app).toThrowError(/Error - if encryptTopicWithCmk is false, submitting existingTopicEncryptionKey is invalid\n/);
});

test('Catch encryptQueueWithCmk false with queue key props', () => {
  // Stack
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const app = () => {
    new SnsToSqs(stack, 'sns-to-sqs-stack', {
      encryptQueueWithCmk: false,
      queueEncryptionKeyProps: {}
    });
  };

  // Assertion
  expect(app).toThrowError(/Error - if encryptQueueWithCmk is false, submitting queueEncryptionKeyProps is invalid\n/);
});

test('Catch encryptQueueWithCmk false with queue key', () => {
  // Stack
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const app = () => {
    new SnsToSqs(stack, 'sns-to-sqs-stack', {
      encryptQueueWithCmk: false,
      existingQueueEncryptionKey: {} as kms.Key
    });
  };

  // Assertion
  expect(app).toThrowError(/Error - if encryptQueueWithCmk is false, submitting existingQueueEncryptionKey is invalid\n/);
});

test('Catch queueProps.encryption on new interface', () => {
  // Stack
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const app = () => {
    new SnsToSqs(stack, 'sns-to-sqs-stack', {
      queueProps: {
        encryption: sqs.QueueEncryption.UNENCRYPTED
      }
    });
  };

  // Assertion
  expect(app).toThrowError();
});

/*******************************
 * Tests for CreateRequiredKeys()
 *******************************/

test('test CreateRequiredKeys for no arguments', () => {
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const result = SnsToSqs.createRequiredKeys(stack, 'test', {});

  expect(result.useDeprecatedInterface).toBeFalsy();
  expect(result.encryptQueueWithCmk).toBeTruthy();
  expect(result.encryptTopicWithCmk).toBeTruthy();
  expect(result.queueKey).toBeDefined();
  expect(result.topicKey).toBeDefined();
  expect(result.singleKey).not.toBeDefined();
});

test('test CreateRequiredKeys when Topic is provided', () => {
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const result = SnsToSqs.createRequiredKeys(stack, 'test', {
    existingTopicObj: {} as sns.Topic
  });

  expect(result.useDeprecatedInterface).toBeFalsy();
  expect(result.encryptQueueWithCmk).toBeTruthy();
  expect(result.encryptTopicWithCmk).toBeFalsy();
  expect(result.queueKey).toBeDefined();
  expect(result.topicKey).not.toBeDefined();
  expect(result.singleKey).not.toBeDefined();
});

test('test CreateRequiredKeys when Queue is provided', () => {
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const result = SnsToSqs.createRequiredKeys(stack, 'test', {
    existingQueueObj: {} as sqs.Queue
  });

  expect(result.useDeprecatedInterface).toBeFalsy();
  expect(result.encryptQueueWithCmk).toBeFalsy();
  expect(result.encryptTopicWithCmk).toBeTruthy();
  expect(result.queueKey).not.toBeDefined();
  expect(result.topicKey).toBeDefined();
  expect(result.singleKey).not.toBeDefined();
});

test('test CreateRequiredKeys when Queue encryption is explicitly disabled', () => {
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const result = SnsToSqs.createRequiredKeys(stack, 'test', {
    encryptQueueWithCmk: false
  });

  expect(result.useDeprecatedInterface).toBeFalsy();
  expect(result.encryptQueueWithCmk).toBeFalsy();
  expect(result.encryptTopicWithCmk).toBeTruthy();
  expect(result.queueKey).not.toBeDefined();
  expect(result.topicKey).toBeDefined();
  expect(result.singleKey).not.toBeDefined();
});

test('test CreateRequiredKeys when Topic encryption is explicitly disabled', () => {
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const result = SnsToSqs.createRequiredKeys(stack, 'test', {
    encryptTopicWithCmk: false
  });

  expect(result.useDeprecatedInterface).toBeFalsy();
  expect(result.encryptQueueWithCmk).toBeTruthy();
  expect(result.encryptTopicWithCmk).toBeFalsy();
  expect(result.queueKey).toBeDefined();
  expect(result.topicKey).not.toBeDefined();
  expect(result.singleKey).not.toBeDefined();
});

test('test CreateRequiredKeys when Topic props have a key', () => {
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const result = SnsToSqs.createRequiredKeys(stack, 'test', {
    topicProps: {
      masterKey: {} as kms.Key
    }
  });

  expect(result.useDeprecatedInterface).toBeFalsy();
  expect(result.encryptQueueWithCmk).toBeTruthy();
  expect(result.encryptTopicWithCmk).toBeFalsy();
  expect(result.queueKey).toBeDefined();
  expect(result.topicKey).not.toBeDefined();
  expect(result.singleKey).not.toBeDefined();
});

test('test CreateRequiredKeys when Queue props have a key', () => {
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", true);

  const result = SnsToSqs.createRequiredKeys(stack, 'test', {
    queueProps: {
      encryptionMasterKey: {} as kms.Key
    }
  });

  expect(result.useDeprecatedInterface).toBeFalsy();
  expect(result.encryptQueueWithCmk).toBeFalsy();
  expect(result.encryptTopicWithCmk).toBeTruthy();
  expect(result.queueKey).not.toBeDefined();
  expect(result.topicKey).toBeDefined();
  expect(result.singleKey).not.toBeDefined();
});
