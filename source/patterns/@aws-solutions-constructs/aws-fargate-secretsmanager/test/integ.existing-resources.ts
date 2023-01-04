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
import { FargateToSecretsmanager, FargateToSecretsmanagerProps } from "../lib";
import { generateIntegStackName, getTestVpc, CreateFargateService } from '@aws-solutions-constructs/core';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as defaults from '@aws-solutions-constructs/core';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename), {
  env: { account: Aws.ACCOUNT_ID, region: 'us-east-1' },
});
stack.templateOptions.description = 'Integration Test with existing VPC, Service and a Secret';

const existingVpc = getTestVpc(stack);
const existingSecretObj = defaults.buildSecretsManagerSecret(stack, 'secret', {});

const image = ecs.ContainerImage.fromRegistry('nginx');

const [testService, testContainer] = CreateFargateService(stack,
  'test',
  existingVpc,
  undefined,
  undefined,
  undefined,
  undefined,
  { image },
);

const constructProps: FargateToSecretsmanagerProps = {
  publicApi: true,
  existingVpc,
  existingSecretObj,
  existingContainerDefinitionObject: testContainer,
  existingFargateServiceObject: testService,
};

new FargateToSecretsmanager(stack, 'test-construct', constructProps);

// Synth
app.synth();