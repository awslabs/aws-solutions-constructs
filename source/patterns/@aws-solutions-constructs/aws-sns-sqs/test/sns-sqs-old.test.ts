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
import { Template } from 'aws-cdk-lib/assertions';
import { CheckKeyProperty, CheckQueueKeyType, CheckTopicKeyType, keyType } from './utils';

// This set of tests targets the legacy functionality, so each text MUST
// start with:
//        stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

test('Pattern deployment w/ new Topic, new Queue and default props', () => {
  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

  const props: SnsToSqsProps = {};
  const testConstruct = new SnsToSqs(stack, 'test-sns-sqs', props);

  expect(testConstruct.snsTopic).toBeDefined();
  expect(testConstruct.encryptionKey).toBeDefined();

  const template = Template.fromStack(stack);
  CheckQueueKeyType(template, keyType.cmk);
  CheckTopicKeyType(template, keyType.cmk);

  template.resourceCountIs("AWS::KMS::Key", 1);
  template.resourceCountIs("AWS::SQS::Queue", 2);
  template.resourceCountIs("AWS::SNS::Topic", 1);

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

test('Pattern deployment w/ new topic, new queue, and overridden props', () => {
  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

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

  CheckQueueKeyType(template, keyType.cmk);
  CheckTopicKeyType(template, keyType.cmk);

  template.hasResourceProperties("AWS::SNS::Topic", {
    TopicName: "new-topic",
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

test('Test getter methods, old interface', () => {
  // Initial Setup
  const stack = new Stack();
  const props: SnsToSqsProps = {
    enableEncryptionWithCustomerManagedKey: true,
    deployDeadLetterQueue: true,
    maxReceiveCount: 0
  };
  const testConstruct = new SnsToSqs(stack, 'test-sns-sqs', props);

  expect(testConstruct.snsTopic).toBeDefined();
  expect(testConstruct.encryptionKey).toBeDefined();
  expect(testConstruct.sqsQueue).toBeDefined();
  expect(testConstruct.deadLetterQueue).toBeDefined();

  const template = Template.fromStack(stack);
  CheckQueueKeyType(template, keyType.cmk);
  CheckTopicKeyType(template, keyType.cmk);

  template.resourceCountIs("AWS::KMS::Key", 1);

});

test('Test deployment w/ existing queue, and topic', () => {
  // Stack
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

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
  expect(app.snsTopic).toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SNS::Topic", {
    TopicName: "existing-topic-obj"
  });

  template.hasResourceProperties("AWS::SQS::Queue", {
    QueueName: "existing-queue-obj"
  });

  CheckQueueKeyType(template, keyType.none);
  CheckTopicKeyType(template, keyType.none);
});

test('Test deployment with imported encryption key, old interface', () => {
  // Stack
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

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
  CheckQueueKeyType(template, keyType.cmk);
  CheckTopicKeyType(template, keyType.cmk);

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

test('Test deployment with SNS managed KMS key, old interface', () => {
  // Stack
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

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

  CheckQueueKeyType(template, keyType.cmk);
  CheckTopicKeyType(template, keyType.sse);

});

test('Test deployment with CMK encrypted SNS Topic (avoids interface)', () => {
  // Stack
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

  const testDescription = 'someString-llasdj';
  const cmk = new kms.Key(stack, 'cmk', { description: testDescription });
  // Helper declaration
  new SnsToSqs(stack, 'sns-to-sqs-stack', {
    topicProps: {
      masterKey: cmk
    }
  });
  // Assertion 1
  const template = Template.fromStack(stack);

  CheckQueueKeyType(template, keyType.cmk);
  CheckTopicKeyType(template, keyType.cmk);

  template.hasResourceProperties("AWS::KMS::Key", {
    Description: testDescription
  });
  // A key is still created for the SQS queue, so there are 2 keys in the stack
  template.resourceCountIs("AWS::KMS::Key", 2);
  template.resourceCountIs("AWS::SNS::Topic", 1);
});

test('Pattern deployment w/ existing topic and FIFO queue', () => {
  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

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

  CheckQueueKeyType(template, keyType.none);
  CheckTopicKeyType(template, keyType.none);

  template.resourceCountIs("AWS::KMS::Key", 0);

  template.hasResourceProperties("AWS::SQS::Queue", {
    FifoQueue: true,
    RedrivePolicy: {
      deadLetterTargetArn: {
        "Fn::GetAtt": [
          "testsnssqsqueuedlq3331312B",
          "Arn"
        ]
      },
      maxReceiveCount: 15
    }
  });
});

test('Pattern deployment w/ existing topic and Standard queue', () => {
  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

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

  const template = Template.fromStack(stack);

  CheckQueueKeyType(template, keyType.none);
  CheckTopicKeyType(template, keyType.none);

  template.hasResourceProperties("AWS::SQS::Queue", {
    RedrivePolicy: {
      deadLetterTargetArn: {
        "Fn::GetAtt": [
          "testsnssqsqueuedlq3331312B",
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
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

  const props: SnsToSqsProps = {
    sqsSubscriptionProps: {
      rawMessageDelivery: true
    }
  };
  new SnsToSqs(stack, 'test-sns-sqs', props);

  const template = Template.fromStack(stack);

  CheckQueueKeyType(template, keyType.cmk);
  CheckTopicKeyType(template, keyType.cmk);

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
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

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

  CheckQueueKeyType(template, keyType.cmk);
  CheckTopicKeyType(template, keyType.cmk);

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
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

  const dlq = new sqs.Queue(stack, 'existing-dlq-obj', {});
  const props: SnsToSqsProps = {
    sqsSubscriptionProps: {
      deadLetterQueue: dlq
    }
  };

  new SnsToSqs(stack, 'test-sns-sqs', props);

  const template = Template.fromStack(stack);

  CheckQueueKeyType(template, keyType.cmk);
  CheckTopicKeyType(template, keyType.cmk);

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

test('Construct uses topicProps.masterKey when specified (avoids interface)', () => {
  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

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

test('Construct uses queueProps.encryptionMasterKey when specified (avoids interface)', () => {
  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

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
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

  const existingTopicObj = new sns.Topic(stack, 'Topic', {
    topicName: 'existing-topic-name'
  });

  const props: SnsToSqsProps = {
    existingTopicObj,
  };

  const testConstruct = new SnsToSqs(stack, 'test-sns-sqs', props);

  const template = Template.fromStack(stack);
  expect(testConstruct.snsTopic).toBeDefined();
  // Ensure that the existing topic above is the only topic in the stack
  template.resourceCountIs("AWS::SNS::Topic", 1);

  CheckQueueKeyType(template, keyType.cmk);
  CheckTopicKeyType(template, keyType.none);

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

test('Confirm that CheckSqsProps is called', () => {
  // Stack
  const stack = new Stack();

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

test('Confirm that CheckSqsProps is called', () => {
  // Stack
  const stack = new Stack();

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
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

  const app = () => {
    new SnsToSqs(stack, 'sns-to-sqs-stack', {
      queueProps: {
        removalPolicy: RemovalPolicy.DESTROY,
      },
      enableEncryptionWithCustomerManagedKey: true,
      encryptQueueWithCmk: true
    });
  };

  expect(app).toThrowError(/Cannot specify both deprecated key props and new key props/);
});

test('Error if enableEncryption is false and encryption settings are provided', () => {
  // Stack
  const stack = new Stack();

  const app = () => {
    new SnsToSqs(stack, 'sns-to-sqs-stack', {
      enableEncryptionWithCustomerManagedKey: false,
      encryptionKeyProps: {}
    });
  };

  // Assertion
  expect(app).toThrowError("Error - if enableEncryptionWithCustomerManagedKey is false, submitting encryptionKey or encryptionKeyProps is invalid\n");
});

test('test CreateRequiredKeys for no arguments', () => {
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

  const result = SnsToSqs.createRequiredKeys(stack, 'test', {});

  expect(result.useDeprecatedInterface).toBeTruthy();
  expect(result.encryptQueueWithCmk).toBeTruthy();
  expect(result.encryptTopicWithCmk).toBeTruthy();
  expect(result.queueKey).toBeDefined();
  expect(result.topicKey).toBeDefined();
  expect(result.singleKey).toBeDefined();
});

test('test CreateRequiredKeys when Topic is provided', () => {
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

  const result = SnsToSqs.createRequiredKeys(stack, 'test', {
    existingTopicObj: {} as sns.Topic
  });

  expect(result.useDeprecatedInterface).toBeTruthy();
  expect(result.encryptQueueWithCmk).toBeTruthy();
  expect(result.encryptTopicWithCmk).toBeFalsy();
  expect(result.queueKey).toBeDefined();
  expect(result.topicKey).not.toBeDefined();
  expect(result.singleKey).toBeDefined();
});

test('test CreateRequiredKeys when Queue is provided', () => {
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

  const result = SnsToSqs.createRequiredKeys(stack, 'test', {
    existingQueueObj: {} as sqs.Queue
  });

  expect(result.useDeprecatedInterface).toBeTruthy();
  expect(result.encryptQueueWithCmk).toBeFalsy();
  expect(result.encryptTopicWithCmk).toBeTruthy();
  expect(result.queueKey).not.toBeDefined();
  expect(result.topicKey).toBeDefined();
  expect(result.singleKey).toBeDefined();
});

test('test CreateRequiredKeys when Topic props have a key', () => {
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

  const result = SnsToSqs.createRequiredKeys(stack, 'test', {
    topicProps: {
      masterKey: {} as kms.Key
    }
  });

  expect(result.useDeprecatedInterface).toBeTruthy();
  expect(result.encryptQueueWithCmk).toBeTruthy();
  expect(result.encryptTopicWithCmk).toBeFalsy();
  expect(result.queueKey).toBeDefined();
  expect(result.topicKey).not.toBeDefined();
  expect(result.singleKey).toBeDefined();
});

test('test CreateRequiredKeys when Queue props have a key', () => {
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

  const result = SnsToSqs.createRequiredKeys(stack, 'test', {
    queueProps: {
      encryptionMasterKey: {} as kms.Key
    }
  });

  expect(result.useDeprecatedInterface).toBeTruthy();
  expect(result.encryptQueueWithCmk).toBeFalsy();
  expect(result.encryptTopicWithCmk).toBeTruthy();
  expect(result.queueKey).not.toBeDefined();
  expect(result.topicKey).toBeDefined();
  expect(result.singleKey).toBeDefined();
});

// ***************************
//
// Over the course of implementing the new interface and keeping the old interface capability,
// it became clear that the old interface had some irregular behavior that we did not want to alter.
// So we made a table of behavior for different inputs, then ran a test for each row of that table
// to capture the current behavior. These are those tests that protect existing behavior. Some
// repeat tests already implemented above, we chose not to worry about that.
//
// ***************************

test('1 Legacy Behavior - Queue Props, EncryptFlag False', () => {

  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

  const existingKey = new kms.Key(stack, 'test-existing-key', {
    enableKeyRotation: true,
    alias: 'existingKey'
  });

  const snsToSqsStack = new SnsToSqs(stack, 'SnsToSqsPattern', {

    enableEncryptionWithCustomerManagedKey: false,

    queueProps: {
      encryptionMasterKey: existingKey,
    }
  });

  CheckKeyProperty(snsToSqsStack.encryptionKey, keyType.sse);

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::KMS::Key", 1);

  CheckTopicKeyType(template, keyType.sse);
  CheckQueueKeyType(template, keyType.cmk);

});

test('2 Legacy Behavior - Queue Props, EncryptFlag True', () => {

  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

  const existingKey = new kms.Key(stack, 'test-existing-key', {
    enableKeyRotation: true,
    alias: 'existingKey'
  });

  const snsToSqsStack = new SnsToSqs(stack, 'SnsToSqsPattern', {

    enableEncryptionWithCustomerManagedKey: true,

    queueProps: {
      encryptionMasterKey: existingKey,
    }
  });

  CheckKeyProperty(snsToSqsStack.encryptionKey, keyType.cmk);

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::KMS::Key", 2);

  CheckTopicKeyType(template, keyType.cmk);
  CheckQueueKeyType(template, keyType.cmk);

});

test('4 Legacy Behavior - Topic Props, EncryptFlag True', () => {

  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

  const existingKey = new kms.Key(stack, 'test-existing-key', {
    enableKeyRotation: true,
    alias: 'existingKey'
  });

  const snsToSqsStack = new SnsToSqs(stack, 'SnsToSqsPattern', {

    enableEncryptionWithCustomerManagedKey: true,

    topicProps: {
      masterKey: existingKey,
    }
  });

  CheckKeyProperty(snsToSqsStack.encryptionKey, keyType.cmk);

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::KMS::Key", 2);

  CheckTopicKeyType(template, keyType.cmk);
  CheckQueueKeyType(template, keyType.cmk);

});

test('5 Legacy Behavior - Topic Props, Existing Key', () => {

  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

  const existingKey = new kms.Key(stack, 'test-existing-key', {
    enableKeyRotation: true,
    alias: 'existingKey'
  });

  const app = () => {
    new SnsToSqs(stack, 'SnsToSqsPattern', {

      encryptionKey: existingKey,

      topicProps: {
        masterKey: existingKey,
      }
    });
  };

  expect(app).toThrowError();
});

test('6 Legacy Behavior - Queue Props, Existing Key', () => {

  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

  const existingKey = new kms.Key(stack, 'test-existing-key', {
    enableKeyRotation: true,
    alias: 'existingKey'
  });

  const app = () => {
    new SnsToSqs(stack, 'SnsToSqsPattern', {

      encryptionKey: existingKey,

      queueProps: {
        encryptionMasterKey: existingKey,
      }
    });
  };

  expect(app).toThrowError();
});

test('7 Legacy Behavior - Queue Props, Key Props provided', () => {

  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

  const existingKey = new kms.Key(stack, 'test-existing-key', {
    enableKeyRotation: true,
    alias: 'existingKey'
  });

  const app = () => {
    new SnsToSqs(stack, 'SnsToSqsPattern', {

      encryptionKeyProps: {},

      queueProps: {
        encryptionMasterKey: existingKey,
      }
    });
  };

  expect(app).toThrowError();
});

test('8 Legacy Behavior - Topic Props, Queue Props, EncryptFlag True', () => {

  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

  const existingKey = new kms.Key(stack, 'test-existing-key', {
    enableKeyRotation: true,
    alias: 'existingKey'
  });

  const existingKeyTwo = new kms.Key(stack, 'test-existing-key-two', {
    enableKeyRotation: true,
    alias: 'existingKeyTwo'
  });

  const snsToSqsStack = new SnsToSqs(stack, 'SnsToSqsPattern', {

    enableEncryptionWithCustomerManagedKey: true,

    topicProps: {
      masterKey: existingKey,
    },
    queueProps: {
      encryptionMasterKey: existingKeyTwo
    }
  });

  CheckKeyProperty(snsToSqsStack.encryptionKey, keyType.cmk);

  const template = Template.fromStack(stack);

  // Legacy code created an extra, unneeded key. New
  // code returns this to 2
  template.resourceCountIs("AWS::KMS::Key", 2);

  CheckTopicKeyType(template, keyType.cmk);
  CheckQueueKeyType(template, keyType.cmk);

});

test('9 Legacy Behavior - Topic Props, Queue Props, EncryptFlag False', () => {

  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

  const existingKey = new kms.Key(stack, 'test-existing-key', {
    enableKeyRotation: true,
    alias: 'existingKey'
  });

  const existingKeyTwo = new kms.Key(stack, 'test-existing-key-two', {
    enableKeyRotation: true,
    alias: 'existingKeyTwo'
  });

  const snsToSqsStack = new SnsToSqs(stack, 'SnsToSqsPattern', {

    enableEncryptionWithCustomerManagedKey: false,

    topicProps: {
      masterKey: existingKey,
    },
    queueProps: {
      encryptionMasterKey: existingKeyTwo
    }
  });

  CheckKeyProperty(snsToSqsStack.encryptionKey, keyType.cmk);

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::KMS::Key", 2);

  CheckTopicKeyType(template, keyType.cmk);
  CheckQueueKeyType(template, keyType.cmk);

});

test('10 Legacy Behavior - Existing Topic and Queue, EncryptFlag False', () => {

  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

  const topic = new sns.Topic(stack, 'test-topic', {});
  const queue = new sqs.Queue(stack, 'test-queue', {});

  const snsToSqsStack = new SnsToSqs(stack, 'SnsToSqsPattern', {

    enableEncryptionWithCustomerManagedKey: false,

    existingQueueObj: queue,
    existingTopicObj: topic
  });

  CheckKeyProperty(snsToSqsStack.encryptionKey, keyType.none);

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::KMS::Key", 0);

  CheckTopicKeyType(template, keyType.none);
  CheckQueueKeyType(template, keyType.none);

});

test('11 Legacy Behavior - Existing Topic and Queue, EncryptFlag True', () => {

  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

  const topic = new sns.Topic(stack, 'test-topic', {});
  const queue = new sqs.Queue(stack, 'test-queue', {});

  const snsToSqsStack = new SnsToSqs(stack, 'SnsToSqsPattern', {

    enableEncryptionWithCustomerManagedKey: true,

    existingQueueObj: queue,
    existingTopicObj: topic
  });

  CheckKeyProperty(snsToSqsStack.encryptionKey, keyType.none);

  const template = Template.fromStack(stack);

  // Legacy code created an unused key here, new code
  // does not so this is 0
  template.resourceCountIs("AWS::KMS::Key", 0);

  CheckTopicKeyType(template, keyType.none);
  CheckQueueKeyType(template, keyType.none);

});

test('13 Legacy Behavior - Existing Topic, EncryptFlag True', () => {

  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

  const topic = new sns.Topic(stack, 'test-topic', {});

  const snsToSqsStack = new SnsToSqs(stack, 'SnsToSqsPattern', {

    enableEncryptionWithCustomerManagedKey: true,

    existingTopicObj: topic
  });

  CheckKeyProperty(snsToSqsStack.encryptionKey, keyType.none);

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::KMS::Key", 1);

  CheckTopicKeyType(template, keyType.none);
  CheckQueueKeyType(template, keyType.cmk);

});

test('14 Legacy Behavior - Existing Topic, Key Props', () => {

  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

  const existingKey = new kms.Key(stack, 'test-existing-key', {
    enableKeyRotation: true,
    alias: 'existingKey'
  });

  const topic = new sns.Topic(stack, 'test-topic', {});

  const snsToSqsStack = new SnsToSqs(stack, 'SnsToSqsPattern', {
    enableEncryptionWithCustomerManagedKey: true,
    encryptionKey: existingKey,

    existingTopicObj: topic
  });

  CheckKeyProperty(snsToSqsStack.encryptionKey, keyType.none);

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::KMS::Key", 1);

  CheckTopicKeyType(template, keyType.none);
  CheckQueueKeyType(template, keyType.cmk);

});

test('15 Legacy Behavior - Existing Topic, Existing Key, EncryptFlag True', () => {

  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

  const topic = new sns.Topic(stack, 'test-topic', {});

  const snsToSqsStack = new SnsToSqs(stack, 'SnsToSqsPattern', {
    encryptionKeyProps: { enableKeyRotation: false },
    existingTopicObj: topic
  });

  CheckKeyProperty(snsToSqsStack.encryptionKey, keyType.none);

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::KMS::Key", 1);

  CheckTopicKeyType(template, keyType.none);
  CheckQueueKeyType(template, keyType.cmk);

});

test('16 Legacy Behavior - Existing Queue, EncryptFlag False', () => {

  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

  const queue = new sqs.Queue(stack, 'test-queue', {});

  const snsToSqsStack = new SnsToSqs(stack, 'SnsToSqsPattern', {
    enableEncryptionWithCustomerManagedKey: false,
    existingQueueObj: queue
  });

  CheckKeyProperty(snsToSqsStack.encryptionKey, keyType.sse);

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::KMS::Key", 0);

  CheckTopicKeyType(template, keyType.sse);
  CheckQueueKeyType(template, keyType.none);
});

test('17 Legacy Behavior - Existing Queue, EncryptFlag True', () => {

  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

  const queue = new sqs.Queue(stack, 'test-queue', {});

  const snsToSqsStack = new SnsToSqs(stack, 'SnsToSqsPattern', {
    enableEncryptionWithCustomerManagedKey: true,
    existingQueueObj: queue
  });

  CheckKeyProperty(snsToSqsStack.encryptionKey, keyType.cmk);

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::KMS::Key", 1);

  CheckTopicKeyType(template, keyType.cmk);
  CheckQueueKeyType(template, keyType.none);
});

test('18 Legacy Behavior - Existing Queue, Existing Key, EncryptFlag True', () => {

  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

  const existingKey = new kms.Key(stack, 'test-existing-key', {
    enableKeyRotation: true,
    alias: 'existingKey'
  });

  const queue = new sqs.Queue(stack, 'test-queue', {});

  const snsToSqsStack = new SnsToSqs(stack, 'SnsToSqsPattern', {
    enableEncryptionWithCustomerManagedKey: true,
    encryptionKey: existingKey,
    existingQueueObj: queue
  });

  CheckKeyProperty(snsToSqsStack.encryptionKey, keyType.cmk);

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::KMS::Key", 1);

  CheckTopicKeyType(template, keyType.cmk);
  CheckQueueKeyType(template, keyType.none);
});

test('19 Legacy Behavior - Existing Queue, Key Props, EncryptFlag True', () => {

  // Initial Setup
  const stack = new Stack();
  stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

  const queue = new sqs.Queue(stack, 'test-queue', {});

  const snsToSqsStack = new SnsToSqs(stack, 'SnsToSqsPattern', {
    enableEncryptionWithCustomerManagedKey: true,
    encryptionKeyProps: { enableKeyRotation: false},
    existingQueueObj: queue
  });

  CheckKeyProperty(snsToSqsStack.encryptionKey, keyType.cmk);

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::KMS::Key", 1);

  CheckTopicKeyType(template, keyType.cmk);
  CheckQueueKeyType(template, keyType.none);
});
