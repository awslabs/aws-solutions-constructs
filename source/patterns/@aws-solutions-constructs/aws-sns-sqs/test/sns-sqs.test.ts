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
import { SnsToSqs, SnsToSqsProps } from "../lib";
import * as sqs from '@aws-cdk/aws-sqs';
import * as sns from '@aws-cdk/aws-sns';
import * as kms from '@aws-cdk/aws-kms';
import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';

// --------------------------------------------------------------
// Pattern deployment with new Topic, new Queue and
// default properties
// --------------------------------------------------------------
test('Pattern deployment w/ new Topic, new Queue and default props', () => {
    // Initial Setup
    const stack = new Stack();
    const props: SnsToSqsProps = {};
    new SnsToSqs(stack, 'test-sns-sqs', props);
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    // Assertion 2
    expect(stack).toHaveResource("AWS::SNS::Topic", {
        KmsMasterKeyId: {
            "Ref": "EncryptionKey1B843E66"
        }
    });
    // Assertion 3
    expect(stack).toHaveResource("AWS::SQS::Queue", {
        KmsMasterKeyId: {
            "Fn::GetAtt": [
                "EncryptionKey1B843E66",
                "Arn"
            ]
        }
    });
    // Assertion 4
    expect(stack).toHaveResource("AWS::SNS::Subscription", {
        Protocol: "sqs",
        TopicArn: {
            "Ref": "testsnssqsSnsTopic2CD0065B"
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
    expect(stack).toHaveResource("AWS::SNS::Topic", {
        TopicName: "new-topic",
        KmsMasterKeyId: {
            "Ref": "EncryptionKey1B843E66"
        }
    });
    // Assertion 2
    expect(stack).toHaveResource("AWS::SQS::Queue", {
        QueueName: "new-queue.fifo",
        FifoQueue: true
    });
    // Assertion 3
    expect(stack).toHaveResource("AWS::KMS::Key", {
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

// --------------------------------------------------------------
// Test deployment with existing queue, and topic
// --------------------------------------------------------------
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
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    // Assertion 2
    expect(app.snsTopic !== null);
    // Assertion 3
    expect(stack).toHaveResource("AWS::SNS::Topic", {
        TopicName: "existing-topic-obj"
    });
    // Assertion 4
    expect(stack).toHaveResource("AWS::SQS::Queue", {
        QueueName: "existing-queue-obj"
    });
});

// --------------------------------------------------------------
// Test deployment with imported encryption key
// --------------------------------------------------------------
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
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    // Assertion 2
    expect(stack).toHaveResource("AWS::KMS::Key", {
        EnableKeyRotation: false
    });
    // Assertion 3
    expect(stack).toHaveResource("AWS::SNS::Topic", {
        KmsMasterKeyId: {
            "Ref": "importedkey38675D68"
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
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    // Assertion 2
    expect(stack).toHaveResource("AWS::SNS::Topic", {
        KmsMasterKeyId: "alias/aws/sns"
    });
    // Assertion 3
    expect(stack).toHaveResource("AWS::SQS::Queue", {
        KmsMasterKeyId: {
            "Fn::GetAtt": [
                "snstosqsstackqueueKey743636E7",
                "Arn"
            ]
        }
    });
});
