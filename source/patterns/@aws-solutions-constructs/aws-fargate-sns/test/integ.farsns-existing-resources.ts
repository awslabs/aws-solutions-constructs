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
import { Aws, App, Stack } from "aws-cdk-lib";
import { FargateToSns, FargateToSnsProps } from "../lib";
import { generateIntegStackName, getTestVpc, CreateFargateService, addCfnSuppressRules, suppressCustomHandlerCfnNagWarnings, SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as sns from 'aws-cdk-lib/aws-sns';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename), {
  env: { account: Aws.ACCOUNT_ID, region: 'us-east-1' },
});
SetConsistentFeatureFlags(stack);
stack.templateOptions.description = 'Integration Test with existing VPC, Service and Topic';

const existingVpc = getTestVpc(stack);
const existingTopic = new sns.Topic(stack, 'test-topic', {});
addCfnSuppressRules(existingTopic, [ { id: "W47", reason: "Stub topic for placeholder in Integration test" } ]);

const image = ecs.ContainerImage.fromRegistry('nginx');

const createFargateServiceResponse = CreateFargateService(stack, 'test', {
  constructVpc: existingVpc,
  clientContainerDefinitionProps: { image },
});

const testProps: FargateToSnsProps = {
  publicApi: true,
  existingVpc,
  existingTopicObject: existingTopic,
  existingContainerDefinitionObject: createFargateServiceResponse.containerDefinition,
  existingFargateServiceObject: createFargateServiceResponse.service,
  topicArnEnvironmentVariableName: 'CUSTOM_ARN',
  topicNameEnvironmentVariableName: 'CUSTOM_NAME',
};

new FargateToSns(stack, 'test-construct', testProps);

suppressCustomHandlerCfnNagWarnings(stack, 'Custom::VpcRestrictDefaultSGCustomResourceProvider');

// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
