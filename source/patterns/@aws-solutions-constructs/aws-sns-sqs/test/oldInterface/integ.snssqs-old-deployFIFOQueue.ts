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
import { App, RemovalPolicy, Stack } from "aws-cdk-lib";
import { SnsToSqs, SnsToSqsProps } from "../../lib";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as kms from 'aws-cdk-lib/aws-kms';
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-sns-sqs FIFO Queue';
stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

// Definitions
const snsManagedKey = kms.Alias.fromAliasName(stack, 'sns-managed-key', 'alias/aws/sns');

const topic = new sns.Topic(stack, 'TestTopic', {
  contentBasedDeduplication: true,
  displayName: 'Customer subscription topic',
  fifo: true,
  masterKey: snsManagedKey
});

const encryptionKeyProps: kms.KeyProps = {
  enableKeyRotation: true,
  removalPolicy:  RemovalPolicy.DESTROY
};

const key = new kms.Key(stack, 'ImportedEncryptionKey', encryptionKeyProps);

const deadLetterQueueKey = new kms.Key(stack, 'ImportedDLQEncryptionKey', encryptionKeyProps);

const props: SnsToSqsProps = {
  enableEncryptionWithCustomerManagedKey: true,
  existingTopicObj: topic,
  queueProps: {
    fifo: true,
  },
  deadLetterQueueProps: {
    encryption: sqs.QueueEncryption.KMS,
    fifo: true,
    encryptionMasterKey: deadLetterQueueKey
  },
  encryptionKey: key
};

new SnsToSqs(stack, 'test-sns-sqs', props);

new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
