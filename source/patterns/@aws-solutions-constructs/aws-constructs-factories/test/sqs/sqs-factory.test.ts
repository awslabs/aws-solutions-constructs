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

import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ConstructsFactories } from "../../lib";
import * as kms from 'aws-cdk-lib/aws-kms';

test('All defaults', () => {
  const stack = new Stack();

  const factories = new ConstructsFactories(stack, 'target');

  const newQueueConstruct = factories.sqsQueueFactory('testQueue', {});

  expect(newQueueConstruct.deadLetterQueue).toBeDefined();
  expect(newQueueConstruct.queue).toBeDefined();

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::SQS::Queue", 2);
  template.resourceCountIs("AWS::SQS::QueuePolicy", 2);
  template.hasResourceProperties("AWS::SQS::Queue", {
    RedrivePolicy: {
      deadLetterTargetArn: Match.anyValue(),
      maxReceiveCount: 15
    }
  });
  template.hasResourceProperties("AWS::SQS::QueuePolicy", {
    Queues: [{
      Ref: "targettestQueue3EF3AAB8"
    }],
    PolicyDocument: {
      Statement: [
        {
          Action: [
            // order of permissions is not fixed, so let's just ensure the correct number
            Match.anyValue(),
            Match.anyValue(),
            Match.anyValue(),
            Match.anyValue(),
            Match.anyValue(),
            Match.anyValue(),
            Match.anyValue()
          ],
          Effect: "Allow"
        },
        {
          Condition: {
            Bool: {
              "aws:SecureTransport": "false"
            }
          },
          Effect: "Deny",
        }
      ]
    }
  });
});

test('Existing Key', () => {
  const stack = new Stack();
  const existingKey = new kms.Key(stack, 'test-key', {
    removalPolicy: RemovalPolicy.DESTROY
  });
  const factories = new ConstructsFactories(stack, 'target');

  const newQueueConstruct = factories.sqsQueueFactory('testQueue', {
    encryptionKey: existingKey,
  });

  expect(newQueueConstruct.deadLetterQueue).toBeDefined();
  expect(newQueueConstruct.queue).toBeDefined();

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::SQS::Queue", 2);
  template.resourceCountIs("AWS::SQS::QueuePolicy", 2);
  template.resourceCountIs("AWS::KMS::Key", 1);
  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "testkey784D0285",
        "Arn"
      ]
    },
  });
});

test('Construct generated key', () => {
  const stack = new Stack();
  const factories = new ConstructsFactories(stack, 'target');

  const newQueueConstruct = factories.sqsQueueFactory('testQueue', {
    enableEncryptionWithCustomerManagedKey: true,
    encryptionKeyProps: {
      removalPolicy: RemovalPolicy.DESTROY
    },
  });

  expect(newQueueConstruct.deadLetterQueue).toBeDefined();
  expect(newQueueConstruct.queue).toBeDefined();

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::SQS::Queue", 2);
  template.resourceCountIs("AWS::SQS::QueuePolicy", 2);
  template.resourceCountIs("AWS::KMS::Key", 1);
  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "targettestQueueKeyED64C35B",
        "Arn"
      ]
    },
  });
});

test('No DLQ', () => {
  const stack = new Stack();
  const factories = new ConstructsFactories(stack, 'target');

  const newQueueConstruct = factories.sqsQueueFactory('testQueue', {
    deployDeadLetterQueue: false
  });

  expect(newQueueConstruct.deadLetterQueue).toBeUndefined();
  expect(newQueueConstruct.queue).toBeDefined();

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::SQS::Queue", 1);
  template.resourceCountIs("AWS::SQS::QueuePolicy", 1);
  template.resourcePropertiesCountIs("AWS::SQS::Queue", {
    RedrivePolicy: {
      deadLetterTargetArn: Match.anyValue(),
      maxReceiveCount: 15
    }
  }, 0);
});

test('Confirm DLQ props are used', () => {
  const testName = "stuff-pkd";
  const stack = new Stack();
  const factories = new ConstructsFactories(stack, 'target');

  const newQueueConstruct = factories.sqsQueueFactory('testQueue', {
    deadLetterQueueProps: {
      queueName: testName
    }
  });

  expect(newQueueConstruct.deadLetterQueue).toBeDefined();
  expect(newQueueConstruct.queue).toBeDefined();

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::SQS::Queue", 2);
  template.resourceCountIs("AWS::SQS::QueuePolicy", 2);

  // Two part test, ensure a queue has the name and that it is not the main queue
  template.hasResourceProperties("AWS::SQS::Queue", {
    QueueName: testName
  });
  template.resourcePropertiesCountIs("AWS::SQS::Queue", {
    QueueName: testName,
    RedrivePolicy: Match.anyValue()
  }, 0);
});

test('Confirm Queue props are used', () => {
  const testName = "stuff-zfw";
  const stack = new Stack();
  const factories = new ConstructsFactories(stack, 'target');

  const newQueueConstruct = factories.sqsQueueFactory('testQueue', {
    queueProps: {
      queueName: testName
    }
  });

  expect(newQueueConstruct.deadLetterQueue).toBeDefined();
  expect(newQueueConstruct.queue).toBeDefined();

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::SQS::Queue", 2);
  template.resourceCountIs("AWS::SQS::QueuePolicy", 2);

  // Two part test, ensure a queue has the name and that it is not the main queue
  template.hasResourceProperties("AWS::SQS::Queue", {
    QueueName: testName,
    RedrivePolicy: Match.anyValue()
  });
});
