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
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';

// Setup
const app = new App();
const stack = new Stack(app, defaults.generateIntegStackName(__filename), {
  env: { account: Aws.ACCOUNT_ID, region: 'us-east-1' },
});
stack.templateOptions.description = 'Integration Test with existing VPC and Service and a new state machine with no CloudWatch alarms';

const existingVpc = defaults.getTestVpc(stack);
const startState = new stepfunctions.Pass(stack, 'StartState');
const image = ecs.ContainerImage.fromRegistry('nginx');

const createFargateServiceResponse = defaults.CreateFargateService(stack,
  'test',
  existingVpc,
  undefined,
  undefined,
  undefined,
  undefined,
  { image },
);

const constructProps: FargateToStepfunctionsProps = {
  publicApi: true,
  existingVpc,
  stateMachineProps: {
    definition: startState
  },
  existingContainerDefinitionObject: createFargateServiceResponse.containerDefinition,
  existingFargateServiceObject: createFargateServiceResponse.service,
  createCloudWatchAlarms: false,
  logGroupProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    logGroupName: "with-lambda"
  }
};

new FargateToStepfunctions(stack, 'test-construct', constructProps);

// Synth
app.synth();