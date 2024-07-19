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
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as defaults from '../';
import { Template } from 'aws-cdk-lib/assertions';
import { buildDeadLetterQueue, buildQueue } from "../lib/sqs-helper";
import * as kms from 'aws-cdk-lib/aws-kms';
import { expectKmsKeyAttachedToCorrectResource } from "../";

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

test('Test deployment w/ imported encryption key', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  defaults.buildQueue(stack, 'existing-queue', {
    queueProps: {
      queueName: 'existing-queue'
    },
    enableEncryptionWithCustomerManagedKey: true,
    encryptionKey: defaults.buildEncryptionKey(stack, 'key-test')
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    QueueName: "existing-queue"
  });
  template.hasResourceProperties("AWS::KMS::Key", {
    EnableKeyRotation: true
  });
});

test('Test deployment without imported encryption key', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  defaults.buildQueue(stack, 'existing-queue', {
    queueProps: {
      queueName: 'existing-queue'
    }
  });

  Template.fromStack(stack).hasResourceProperties("AWS::SQS::Queue", {
    QueueName: "existing-queue",
    KmsMasterKeyId: "alias/aws/sqs"
  });
});

test('Test deployment w/ construct created encryption key', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const buildQueueResponse = defaults.buildQueue(stack, 'existing-queue', {
    queueProps: {
      queueName: 'existing-queue'
    },
    enableEncryptionWithCustomerManagedKey: true,
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    QueueName: "existing-queue"
  });
  template.hasResourceProperties("AWS::KMS::Key", {
    EnableKeyRotation: true
  });
  expect(buildQueueResponse.queue).toBeDefined();
  expect(buildQueueResponse.key).toBeDefined();
  expect(buildQueueResponse.dlq).toBeDefined();
});

test('Test DLQ when existing Queue Provided', () => {
  const stack = new Stack();

  const existingQueue = new sqs.Queue(stack, 'test-queue');
  const buildDlqProps: defaults.BuildDeadLetterQueueProps = {
    existingQueueObj: existingQueue,
  };

  const returnedQueue = defaults.buildDeadLetterQueue(stack, 'testdlq', buildDlqProps);

  expect(returnedQueue).toBeUndefined();
  Template.fromStack(stack).resourceCountIs("AWS::SQS::Queue", 1);
});

test('Test DLQ with all defaults', () => {
  const stack = new Stack();

  buildDeadLetterQueue(stack, 'testdlq', {});
  Template.fromStack(stack).hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: "alias/aws/sqs"
  });
});

test("Test DLQ with a provided properties", () => {
  const stack = new Stack();
  const testQueueName = "test-unique252";

  const returnedQueue = buildDeadLetterQueue(stack, 'testdlq', {
    deadLetterQueueProps: {
      queueName: testQueueName,
    },
  });
  Template.fromStack(stack).hasResourceProperties("AWS::SQS::Queue", {
    QueueName: testQueueName,
  });
  expect(returnedQueue).toBeDefined();
});

test('Test DLQ with a provided maxReceiveCount', () => {
  const stack = new Stack();
  const testMaxReceiveCount = 31;

  const dlqInterface = buildDeadLetterQueue(stack, 'testdlq', {
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

  const buildQueueResponse = defaults.buildQueue(stack, 'newQueue', {
    existingQueueObj: existingQueue
  });

  Template.fromStack(stack).hasResourceProperties("AWS::SQS::Queue", {
    QueueName: testQueueName,
  });
  expect(existingQueue.queueName).toEqual(buildQueueResponse.queue.queueName);
  expect(buildQueueResponse.key).not.toBeDefined();
});

test('Test creating a queue with a DLQ', () => {
  const stack = new Stack();

  const buildQueueResponse = buildQueue(stack, 'new-queue', {
  });

  Template.fromStack(stack).resourceCountIs("AWS::SQS::Queue", 2);
  expect(buildQueueResponse.queue).toBeDefined();
  expect(buildQueueResponse.queue.deadLetterQueue).toBeDefined();
});

test('Test creating a FIFO queue', () => {
  const stack = new Stack();

  const buildQueueResponse = buildQueue(stack, 'new-queue', {
    queueProps: {
      fifo: true
    }
  });

  Template.fromStack(stack).hasResourceProperties("AWS::SQS::Queue", {
    FifoQueue: true
  });
  expect(buildQueueResponse.queue.fifo).toBe(true);
});

test('Test fail Dead Letter Queue check', () => {

  const props: defaults.SqsProps = {
    deployDeadLetterQueue: false,
    deadLetterQueueProps: {},
  };

  const app = () => {
    defaults.CheckSqsProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - If deployDeadLetterQueue is false then deadLetterQueueProps cannot be specified.\n');
});

test('Test explicitly turn off DLQ', () => {
  const stack = new Stack();

  const buildQueueResponse = buildQueue(stack, 'new-queue', {
    deployDeadLetterQueue: false,
  });

  expect(buildQueueResponse.dlq).toBeUndefined();

  Template.fromStack(stack).resourceCountIs("AWS::SQS::Queue", 1);
});

test('Test using DLQ properties', () => {
  const testName = 'some-name-ttttt';
  const stack = new Stack();

  buildQueue(stack, 'new-queue', {
    deadLetterQueueProps: {
      queueName: testName
    },
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    QueueName: testName
  });
  template.resourceCountIs("AWS::SQS::Queue", 2);
});
// ---------------------------
// Prop Tests
// ---------------------------

test("Test fail SQS Queue check", () => {
  const stack = new Stack();

  const props: defaults.SqsProps = {
    queueProps: {},
    existingQueueObj: new sqs.Queue(stack, 'placeholder', {}),
  };

  const app = () => {
    defaults.CheckSqsProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide queueProps or existingQueueObj, but not both.\n');
});

test('Test fail SQS queue check when queueProps.encryptionMasterKey and encryptionKey are both specified', () => {
  const stack = new Stack();

  const props: defaults.SqsProps = {
    queueProps: {
      encryptionMasterKey: new kms.Key(stack, 'key')
    },
    encryptionKey: new kms.Key(stack, 'otherkey')
  };

  const app = () => {
    defaults.CheckSqsProps(props);
  };

  expect(app).toThrowError('Error - Either provide queueProps.encryptionMasterKey or encryptionKey, but not both.\n');
});

test('Test fail SQS queue check when queueProps.encryptionMasterKey and encryptionKeyProps are both specified', () => {
  const stack = new Stack();

  const props: defaults.SqsProps = {
    encryptionKeyProps: {
      description: 'key description'
    },
    queueProps: {
      encryptionMasterKey: new kms.Key(stack, 'key')
    }
  };

  const app = () => {
    defaults.CheckSqsProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide queueProps.encryptionMasterKey or encryptionKeyProps, but not both.\n');
});

test('Test fail SQS check when both encryptionKey and encryptionKeyProps are specified', () => {
  const stack = new Stack();

  const props: defaults.SqsProps = {
    encryptionKey: new kms.Key(stack, 'key'),
    encryptionKeyProps: {
      description: 'a description'
    }
  };

  const app = () => {
    defaults.CheckSqsProps(props);
  };

  expect(app).toThrowError('Error - Either provide encryptionKey or encryptionKeyProps, but not both.\n');
});

test('Test fail Dead Letter Queue check', () => {

  const props: defaults.SqsProps = {
    deployDeadLetterQueue: false,
    deadLetterQueueProps: {},
  };

  const app = () => {
    defaults.CheckSqsProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - If deployDeadLetterQueue is false then deadLetterQueueProps cannot be specified.\n');
});

test('Test fail Dead Letter Queue check with queueProps fifo set to true and undefined deadLetterQueueProps', () => {

  const props: defaults.SqsProps = {
    queueProps: { fifo: true },
    deadLetterQueueProps: {},
  };

  const app = () => {
    defaults.CheckSqsProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - If you specify a fifo: true in either queueProps or deadLetterQueueProps, you must also set fifo: ' +
    'true in the other props object. Fifo must match for the Queue and the Dead Letter Queue.\n');
});

test('Test fail Dead Letter Queue check with queueProps fifo set to true and deadLetterQueueProps fifo set to false', () => {

  const props: defaults.SqsProps = {
    queueProps: { fifo: true },
    deadLetterQueueProps: { fifo: false },
  };

  const app = () => {
    defaults.CheckSqsProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - If you specify a fifo: true in either queueProps or deadLetterQueueProps, you must also set fifo: ' +
    'true in the other props object. Fifo must match for the Queue and the Dead Letter Queue.\n');
});

test('Test fail Dead Letter Queue check with queueProps fifo set to false and deadLetterQueueProps fifo set to true', () => {

  const props: defaults.SqsProps = {
    deadLetterQueueProps: { fifo: true },
    queueProps: { fifo: false },
  };

  const app = () => {
    defaults.CheckSqsProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - If you specify a fifo: true in either queueProps or deadLetterQueueProps, you must also set fifo: ' +
    'true in the other props object. Fifo must match for the Queue and the Dead Letter Queue.\n');
});

test('Test fail Dead Letter Queue check with deadLetterQueueProps fifo set to true', () => {

  const props: defaults.SqsProps = {
    deadLetterQueueProps: { fifo: true },
  };

  const app = () => {
    defaults.CheckSqsProps(props);
  };

  expect(app).toThrowError('Error - If you specify a fifo: true in either queueProps or deadLetterQueueProps, you must also set fifo: ' +
    'true in the other props object. Fifo must match for the Queue and the Dead Letter Queue.\n');
});

test('Test fail Dead Letter Queue check with queueProps fifo set to false', () => {

  const props: defaults.SqsProps = {
    queueProps: { fifo: false },
  };

  const app = () => {
    defaults.CheckSqsProps(props);
  };

  expect(app).toThrowError('Error - If you specify a fifo: true in either queueProps or deadLetterQueueProps, you must also set fifo: ' +
    'true in the other props object. Fifo must match for the Queue and the Dead Letter Queue.\n');
});

test('Test fail maxReceiveCount with no dlq', () => {

  const stack = new Stack();

  const app = () => {
    // Helper declaration
    defaults.buildQueue(stack, 'bad-props', {
      deployDeadLetterQueue: false,
      maxReceiveCount: 9
    });
  };

  expect(app).toThrowError(/Error - MaxReceiveCount cannot be set if deployDeadLetterQueue is false.\n/);
});

test('Test that queue construct properties have priority', () => {
  const stack = new Stack();
  const propName = 'not-this';
  const constructPropName = 'but-this';

  buildQueue(stack, 'testqueue', {
    queueProps: {
      queueName: propName
    },
    constructQueueProps: {
      queueName: constructPropName
    }
  });
  Template.fromStack(stack).hasResourceProperties("AWS::SQS::Queue", {
    QueueName: constructPropName
  });
});

test('Test that dlg construct properties have priority', () => {
  const stack = new Stack();
  const propName = 'not-this';
  const constructPropName = 'but-this';

  buildDeadLetterQueue(stack, 'testqueue', {
    deadLetterQueueProps: {
      queueName: propName
    },
    constructDeadLetterQueueProps: {
      queueName: constructPropName
    }
  });
  Template.fromStack(stack).hasResourceProperties("AWS::SQS::Queue", {
    QueueName: constructPropName
  });
});
