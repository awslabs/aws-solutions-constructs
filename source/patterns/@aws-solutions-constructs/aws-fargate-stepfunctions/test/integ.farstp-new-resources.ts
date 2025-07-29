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
import { Aws, App, Stack, RemovalPolicy } from "aws-cdk-lib";
import { FargateToStepfunctions, FargateToStepfunctionsProps } from "../lib";
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as defaults from '@aws-solutions-constructs/core';
import { SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

// Setup
const app = new App();
const stack = new Stack(app, defaults.generateIntegStackName(__filename), {
  env: { account: Aws.ACCOUNT_ID, region: 'us-east-1' },
});
SetConsistentFeatureFlags(stack);
stack.templateOptions.description = 'Integration Test with new VPC, Service and a state machine';

const existingVpc = defaults.getTestVpc(stack);
const image = ecs.ContainerImage.fromRegistry('nginx');

const createFargateServiceResponse = defaults.CreateFargateService(stack, 'test', {
  constructVpc: existingVpc,
  clientContainerDefinitionProps: {
    image
  },
});

const constructProps: FargateToStepfunctionsProps = {
  publicApi: true,
  existingVpc,
  stateMachineProps: {
    definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'farstp-test')
  },
  existingContainerDefinitionObject: createFargateServiceResponse.containerDefinition,
  existingFargateServiceObject: createFargateServiceResponse.service,
  stateMachineEnvironmentVariableName: 'CUSTOM_NAME',
  logGroupProps: {
    removalPolicy: RemovalPolicy.DESTROY,
  }
};

new FargateToStepfunctions(stack, 'test-construct', constructProps);

defaults.suppressCustomHandlerCfnNagWarnings(stack, 'Custom::VpcRestrictDefaultSGCustomResourceProvider');

// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
