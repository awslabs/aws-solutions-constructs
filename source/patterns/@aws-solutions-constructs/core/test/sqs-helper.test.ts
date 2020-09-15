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

// Imports
import { Stack } from "@aws-cdk/core";
import * as defaults from '../';
import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import * as sqs from '@aws-cdk/aws-sqs';

// --------------------------------------------------------------
// Test minimal deployment with no properties
// --------------------------------------------------------------
test('Test minimal deployment with no properties', () => {
    // Stack
    const stack = new Stack();
    // Helper declaration
    defaults.buildQueue(stack, 'primary-queue', {});
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test deployment w/ custom properties
// --------------------------------------------------------------
test('Test deployment w/ custom properties', () => {
    // Stack
    const stack = new Stack();
    // Helper setup
    const encKey = defaults.buildEncryptionKey(stack);
    // Helper declaration
    defaults.buildQueue(stack, 'primary-queue', {
        queueProps: {
            queueName: "custom-queue-props",
            encryption: sqs.QueueEncryption.KMS,
            encryptionMasterKey: encKey
        }
    });
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test dead letter queue deployment/configuration
// --------------------------------------------------------------
test('Test dead letter queue deployment/configuration', () => {
    // Stack
    const stack = new Stack();
    // Helper setup
    const encKey = defaults.buildEncryptionKey(stack);
    const [dlq] = defaults.buildQueue(stack, 'dead-letter-queue', {});
    const dlqi = defaults.buildDeadLetterQueue({
        deadLetterQueue: dlq,
        maxReceiveCount: 3
    });
    // Helper declaration
    defaults.buildQueue(stack, 'primary-queue', {
        queueProps: {
            queueName: "not-the-dead-letter-queue-props",
            encryption: sqs.QueueEncryption.KMS,
            encryptionMasterKey: encKey
        },
        deadLetterQueue: dlqi
    });
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test dead letter queue deployment/configuration w/o mrc
// --------------------------------------------------------------
test('Test dead letter queue deployment/configuration w/o mrc', () => {
  // Stack
  const stack = new Stack();
  // Helper setup
  const encKey = defaults.buildEncryptionKey(stack);
  const [dlq] = defaults.buildQueue(stack, 'dead-letter-queue', {});
  const dlqi = defaults.buildDeadLetterQueue({
      deadLetterQueue: dlq
  });
  // Helper declaration
  defaults.buildQueue(stack, 'primary-queue', {
      queueProps: {
          queueName: "not-the-dead-letter-queue-props",
          encryption: sqs.QueueEncryption.KMS,
          encryptionMasterKey: encKey
      },
      deadLetterQueue: dlqi
  });
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test existingQueueObj
// --------------------------------------------------------------
test('Test existingQueueObj', () => {
  // Stack
  const stack = new Stack();
  // Helper setup
  const [existingQueue] = defaults.buildQueue(stack, 'existing-queue', {
    queueProps: {
      queueName: 'existing-queue'
    }
  });
  // Helper declaration
  defaults.buildQueue(stack, 'primary-queue', {
      existingQueueObj: existingQueue
  });
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test deployment w/ imported encryption key
// --------------------------------------------------------------
test('Test deployment w/ imported encryption key', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  defaults.buildQueue(stack, 'existing-queue', {
    queueProps: {
      queueName: 'existing-queue'
    },
    enableEncryptionWithCustomerManagedKey: true,
    encryptionKey: defaults.buildEncryptionKey(stack)
  });
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  // Assertion 2
  expect(stack).toHaveResource("AWS::SQS::Queue", {
    QueueName: "existing-queue"
  });
  // Assertion 3
  expect(stack).toHaveResource("AWS::KMS::Key", {
    EnableKeyRotation: true
  });
});

// --------------------------------------------------------------
// Test deployment without imported encryption key
// --------------------------------------------------------------
test('Test deployment without imported encryption key', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  defaults.buildQueue(stack, 'existing-queue', {
    queueProps: {
      queueName: 'existing-queue'
    }
  });
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  // Assertion 2
  expect(stack).toHaveResource("AWS::SQS::Queue", {
    QueueName: "existing-queue",
    KmsMasterKeyId: "alias/aws/sqs"
  });
});
