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
import { App, Stack } from "aws-cdk-lib";
import { SnsToSqs, SnsToSqsProps } from "../lib";
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as kms from 'aws-cdk-lib/aws-kms';
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-sns-sqs';
stack.node.setContext("@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption", false);

const sqsEncryptionKey = new kms.Key(stack, 'ImportedSQSEncryptionKey', {
  enableKeyRotation: true
});
const dlq = new sqs.Queue(stack, 'existing-dlq-obj', {
  encryptionMasterKey: sqsEncryptionKey
});

// Definitions
const props: SnsToSqsProps = {
  sqsSubscriptionProps: {
    rawMessageDelivery: true,
    filterPolicy: {
      color: sns.SubscriptionFilter.stringFilter({
        allowlist: ['red', 'orange'],
        matchPrefixes: ['bl'],
      }),
      size: sns.SubscriptionFilter.stringFilter({
        denylist: ['small', 'medium'],
      }),
      price: sns.SubscriptionFilter.numericFilter({
        between: { start: 100, stop: 200 },
        greaterThan: 300,
      }),
      store: sns.SubscriptionFilter.existsFilter(),
    },
    deadLetterQueue: dlq
  }
};

const snsToSqsStack = new SnsToSqs(stack, 'test-sns-sqs-stack', props);

// Grant yourself permissions to use the Customer Managed KMS Key
const policyStatement = new iam.PolicyStatement({
  actions: ["kms:Encrypt", "kms:Decrypt"],
  effect: iam.Effect.ALLOW,
  principals: [new iam.AccountRootPrincipal()],
  resources: ["*"]
});

snsToSqsStack.encryptionKey?.addToResourcePolicy(policyStatement);

new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
