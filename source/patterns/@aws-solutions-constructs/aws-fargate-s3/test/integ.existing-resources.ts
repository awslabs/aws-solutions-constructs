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
import { Aws, App, Stack, RemovalPolicy } from "@aws-cdk/core";
import { FargateToS3, FargateToS3Props } from "../lib";
import { generateIntegStackName, getTestVpc, CreateFargateService } from '@aws-solutions-constructs/core';
import * as ecs from '@aws-cdk/aws-ecs';
import * as defaults from '@aws-solutions-constructs/core';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename), {
  env: { account: Aws.ACCOUNT_ID, region: 'us-east-1' },
});
stack.templateOptions.description = 'Integration Test with new VPC, Service and Bucket';

const existingVpc = getTestVpc(stack);
const existingBucket = defaults.CreateScrapBucket(stack, { 
  removalPolicy: RemovalPolicy.DESTROY,
  autoDeleteObjects: true
});

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

const testProps: FargateToS3Props = {
  publicApi: true,
  existingVpc,
  existingBucketObj: existingBucket,
  existingContainerDefinitionObject: testContainer,
  existingFargateServiceObject: testService,
  bucketArnEnvironmentVariableName: 'CUSTOM_ARN',
  bucketEnvironmentVariableName: 'CUSTOM_NAME',
  bucketPermissions: ['Read', 'Write', 'Delete'],
};

new FargateToS3(stack, 'test-construct', testProps);

// Synth
app.synth();