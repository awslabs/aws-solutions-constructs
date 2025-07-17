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

import { App, Stack } from "aws-cdk-lib";
import { FargateToKinesisStreams } from "../lib";
import { generateIntegStackName, suppressCustomHandlerCfnNagWarnings, SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as ecs from "aws-cdk-lib/aws-ecs";

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
SetConsistentFeatureFlags(stack);

new FargateToKinesisStreams(stack, 'test-fargate-kinesisstreams', {
  publicApi: true,
  containerDefinitionProps: {
    image: ecs.ContainerImage.fromRegistry('nginx')
  },
  fargateServiceProps: {
    serviceName: 'my-service',
    desiredCount: 7
  }
});

suppressCustomHandlerCfnNagWarnings(stack, 'Custom::VpcRestrictDefaultSGCustomResourceProvider');
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
