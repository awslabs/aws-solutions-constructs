/**
 *  CopyrightAmazon.com, Inc. or its affiliates. All Rights Reserved.
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
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as defaults from '../';
import '@aws-cdk/assert/jest';
import { buildDeadLetterQueue, buildQueue } from "../lib/sqs-helper";
import * as kms from 'aws-cdk-lib/aws-kms';
import { expectKmsKeyAttachedToCorrectResource } from "../";

// --------------------------------------------------------------
// Test deployment w/ imported encryption key
// --------------------------------------------------------------
test('Test deployment w/ encryptionMasterKey set on queueProps', () => {
  const stack = new Stack();

  const cmk = new kms.Key(stack, 'EncryptionKey', {
    description: 'kms-key-description'
  });

  defaults.buildQueue(stack, 'queue', {
    queueProps: {
      encryptionMasterKey: cmk
    }
  });

  expectKmsKeyAttachedToCorrectResource(stack, 'AWS::SQS::Queue', 'kms-key-description');
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

  expect(stack).toHaveResource("AWS::SQS::Queue", {
    QueueName: "existing-queue"
  });
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

  expect(stack).toHaveResource("AWS::SQS::Queue", {
    QueueName: "existing-queue",
    KmsMasterKeyId: "alias/aws/sqs"
  });
});

// --------------------------------------------------------------
// Test deployment w/ construct created encryption key
// --------------------------------------------------------------
test('Test deployment w/ construct created encryption key', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const [queue, key] = defaults.buildQueue(stack, 'existing-queue', {
    queueProps: {
      queueName: 'existing-queue'
    },
    enableEncryptionWithCustomerManagedKey: true,
  });

  expect(stack).toHaveResource("AWS::SQS::Queue", {
    QueueName: "existing-queue"
  });
  expect(stack).toHaveResource("AWS::KMS::Key", {
    EnableKeyRotation: true
  });
  expect(queue).toBeDefined();
  expect(key).toBeDefined();
});

test('Test DLQ when existing Queue Provided', () => {
  const stack = new Stack();

  const existingQueue = new sqs.Queue(stack, 'test-queue');
  const buildDlqProps: defaults.BuildDeadLetterQueueProps = {
    existingQueueObj: existingQueue,
  };

  const returnedQueue = defaults.buildDeadLetterQueue(stack, buildDlqProps);

  expect(returnedQueue).toBeUndefined();
  expect(stack).toCountResources("AWS::SQS::Queue", 1);
});

test('Test DLQ with all defaults', () => {
  const stack = new Stack();

  buildDeadLetterQueue(stack, {});
  expect(stack).toHaveResourceLike("AWS::SQS::Queue", {
    KmsMasterKeyId: "alias/aws/sqs"
  });
});

test("Test DLQ with a provided properties", () => {
  const stack = new Stack();
  const testQueueName = "test-unique252";

  const returnedQueue = buildDeadLetterQueue(stack, {
    deadLetterQueueProps: {
      queueName: testQueueName,
    },
  });
  expect(stack).toHaveResourceLike("AWS::SQS::Queue", {
    QueueName: testQueueName,
  });
  expect(returnedQueue).toBeDefined();
});

test('Test DLQ with a provided maxReceiveCount', () => {
  const stack = new Stack();
  const testMaxReceiveCount = 31;

  const dlqInterface = buildDeadLetterQueue(stack, {
    maxReceiveCount: testMaxReceiveCount
  });
  expect(dlqInterface?.maxReceiveCount).toEqual(testMaxReceiveCount);
});

test('Test returning an existing Queue', () => {
  const stack = new Stack();
  const testQueueName = 'existing-queue';

  const existingQueue = new sqs.Queue(stack, 'test-queue', {
    queueName: testQueueName
  });

  const [returnedQueue] = defaults.buildQueue(stack, 'newQueue', {
    existingQueueObj: existingQueue
  });

  expect(stack).toHaveResourceLike("AWS::SQS::Queue", {
    QueueName: testQueueName,
  });
  expect(existingQueue.queueName).toEqual(returnedQueue.queueName);
});

test('Test creating a queue with a DLQ', () => {
  const stack = new Stack();

  const dlqInterface = buildDeadLetterQueue(stack, {});

  const [newQueue] = buildQueue(stack, 'new-queue', {
    deadLetterQueue: dlqInterface
  });

  expect(stack).toCountResources("AWS::SQS::Queue", 2);
  expect(newQueue).toBeDefined();
  expect(newQueue.deadLetterQueue).toBeDefined();
});

test('Test creating a FIFO queue', () => {
  const stack = new Stack();

  const [newFifoQueue] = buildQueue(stack, 'new-queue', {
    queueProps: {
      fifo: true
    }
  });

  expect(stack).toHaveResourceLike("AWS::SQS::Queue", {
    FifoQueue: true
  });
  expect(newFifoQueue.fifo).toBe(true);
});
