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
import { LambdaToElasticSearchAndKibana } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as defaults from '@aws-solutions-constructs/core';
import { SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

// Setup
const app = new App();
const stack = new Stack(app, defaults.generateIntegStackName(__filename), {});
SetConsistentFeatureFlags(stack);

const lambdaProps: lambda.FunctionProps = {
  code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
  handler: 'index.handler',
};

const esDomainProps = {
  elasticsearchClusterConfig: {
    dedicatedMasterEnabled: true,
    dedicatedMasterCount: 3,
    instanceCount: 2,
    zoneAwarenessEnabled: true,
    zoneAwarenessConfig: {
      availabilityZoneCount: 2
    }
  }
};

new LambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-kibana5', {
  lambdaFunctionProps: lambdaProps,
  domainName: defaults.CreateShortUniqueTestName("dmn"),
  esDomainProps,
  deployVpc: true,
  vpcProps: {
    maxAzs: 2
  }
});

defaults.suppressCustomHandlerCfnNagWarnings(stack, 'Custom::VpcRestrictDefaultSGCustomResourceProvider');

// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
