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
import { LambdaToOpenSearch } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as defaults from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

// Setup
const app = new App();
const stack = new Stack(app, defaults.generateIntegStackName(__filename), {});

const lambdaProps: lambda.FunctionProps = {
  code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
  handler: 'index.handler',
};

const openSearchDomainProps = {
  clusterConfig: {
    dedicatedMasterCount: 3,
    dedicatedMasterEnabled: true,
    instanceCount: 3,
    zoneAwarenessEnabled: false,
  }
};

new LambdaToOpenSearch(stack, 'test-lambda-opensearch', {
  lambdaFunctionProps: lambdaProps,
  openSearchDomainName: defaults.CreateShortUniqueTestName("dmn"),
  openSearchDomainProps,
  deployVpc: true,
  vpcProps: {
    maxAzs: 1
  }
});

defaults.suppressCustomHandlerCfnNagWarnings(stack, 'Custom::VpcRestrictDefaultSGCustomResourceProvider');

// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
