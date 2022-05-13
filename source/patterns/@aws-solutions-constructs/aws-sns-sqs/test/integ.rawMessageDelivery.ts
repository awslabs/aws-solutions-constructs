/**
 *  Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { App, Stack } from "@aws-cdk/core";
import { SnsToSqs, SnsToSqsProps } from "../lib";
import * as iam from '@aws-cdk/aws-iam';
import * as sns from '@aws-cdk/aws-sns';
import * as sqs from '@aws-cdk/aws-sqs';
import { generateIntegStackName } from '@aws-solutions-constructs/core';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-sns-sqs';
const dlq = new sqs.Queue(stack, 'existing-dlq-obj', {});

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
  principals: [ new iam.AccountRootPrincipal() ],
  resources: [ "*" ]
});

snsToSqsStack.encryptionKey?.addToResourcePolicy(policyStatement);

// Synth
app.synth();
