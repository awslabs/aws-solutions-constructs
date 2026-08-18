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
stack.templateOptions.description = 'Integration Test for aws-lambda-comprehend with default properties';

const props: LambdaToComprehendProps = {
  lambdaFunctionProps: {
    code: new lambda.InlineCode('exports.handler = async (event) => { console.log(event); return {\'statusCode\': 200, \'body\': \'\'}; }'),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  }
};

new LambdaToComprehend(stack, 'test-lambda-comprehend-defaults', props);

/*
 * Stack verification steps:
 * * Confirm the stack deploys a single Lambda function and no S3 buckets, IAM role for Comprehend, or VPC
 * * Retrieve the Lambda function's inline policy and confirm it grants the fourteen synchronous Comprehend
 *   actions - the six Detect* actions, the two PII actions, and the six BatchDetect* actions - and nothing else
 */

new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
