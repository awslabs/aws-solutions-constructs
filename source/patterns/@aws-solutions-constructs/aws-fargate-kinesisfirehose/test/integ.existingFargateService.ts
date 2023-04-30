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

/// !cdk-integ *
import { App, Stack } from "aws-cdk-lib";
import { FargateToKinesisFirehose } from "../lib";
import { CreateFargateService, generateIntegStackName, getTestVpc, suppressAutoDeleteHandlerWarnings } from '@aws-solutions-constructs/core';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { GetTestFirehoseDestination } from './test-helper';

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));

const existingVpc = getTestVpc(stack);

const image = ecs.ContainerImage.fromRegistry('nginx');

const destination = GetTestFirehoseDestination(stack, 'destination-firehose');

const createFargateServiceResponse = CreateFargateService(stack, 'test', {
  constructVpc: existingVpc,
  clientContainerDefinitionProps: { image },
});

new FargateToKinesisFirehose(stack, 'test-fargate-kinesisstreams', {
  publicApi: true,
  existingVpc,
  existingFargateServiceObject: createFargateServiceResponse.service,
  existingContainerDefinitionObject: createFargateServiceResponse.containerDefinition,
  existingKinesisFirehose: destination.kinesisFirehose
});

suppressAutoDeleteHandlerWarnings(stack);
app.synth();