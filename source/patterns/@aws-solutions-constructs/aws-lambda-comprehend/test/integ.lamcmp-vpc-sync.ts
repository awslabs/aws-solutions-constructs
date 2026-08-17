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
import { App, Stack } from 'aws-cdk-lib';
import { LambdaToComprehend, LambdaToComprehendProps } from '../lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { generateIntegStackName, SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as defaults from '@aws-solutions-constructs/core';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
SetConsistentFeatureFlags(stack);
stack.templateOptions.description = 'Integration Test for aws-lambda-comprehend with a synchronous deployment in a VPC';

const props: LambdaToComprehendProps = {
  lambdaFunctionProps: {
    code: new lambda.InlineCode('exports.handler = async (event) => { console.log(event); return {\'statusCode\': 200, \'body\': \'\'}; }'),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  },
  deployVpc: true
};

new LambdaToComprehend(stack, 'test-lambda-comprehend-vpc-sync', props);

defaults.suppressCustomHandlerCfnNagWarnings(stack, 'Custom::VpcRestrictDefaultSGCustomResourceProvider');

/*
 * Stack verification steps:
 * * Confirm the Lambda function is attached to the isolated subnets of the deployed VPC
 * * Confirm the VPC holds exactly one endpoint, the Comprehend interface endpoint - no S3 gateway endpoint is
 *   created, because no asynchronous use case was selected and so no bucket traffic exists
 */

new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
