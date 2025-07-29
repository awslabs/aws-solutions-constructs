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
import { IotToSqs, IotToSqsProps } from "../lib";
import * as iam from 'aws-cdk-lib/aws-iam';
import { generateIntegStackName, SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
SetConsistentFeatureFlags(stack);
stack.templateOptions.description = 'Integration Test for aws-iot-sqs';

// Definitions
const props: IotToSqsProps = {
  deadLetterQueueProps: {
    queueName: 'max-receive-count-test-dlq-name'
  },
  deployDeadLetterQueue: true,
  maxReceiveCount: 1,
  queueProps: {
    queueName: 'max-receive-count-test-queue-name'
  },
  iotTopicRuleProps: {
    topicRulePayload: {
      ruleDisabled: false,
      description: "Processing messages from IoT devices or factory machines",
      sql: "SELECT * FROM 'test/topic/#'",
      actions: []
    }
  }
};

const iotToSqsStack = new IotToSqs(stack, 'test-iot-sqs-stack', props);

// Grant yourself permissions to use the Customer Managed KMS Key
const policyStatement = new iam.PolicyStatement({
  actions: ["kms:Encrypt", "kms:Decrypt"],
  effect: iam.Effect.ALLOW,
  principals: [new iam.AccountRootPrincipal()],
  resources: ["*"]
});

iotToSqsStack.encryptionKey?.addToResourcePolicy(policyStatement);

// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
