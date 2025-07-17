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

import { App, Stack, RemovalPolicy } from "aws-cdk-lib";
import { LambdaToStepfunctions, LambdaToStepfunctionsProps } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as defaults from '@aws-solutions-constructs/core';
import { generateIntegStackName, SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

// Setup the app and stack
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
SetConsistentFeatureFlags(stack);

// Setup the "existing" Lambda function props
const lambdaFunctionProps = {
  runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
  handler: 'index.handler',
  code: lambda.Code.fromAsset(`${__dirname}/lambda`)
};

// Setup the "existing" Lambda function
const fn = defaults.deployLambdaFunction(stack, lambdaFunctionProps);

// Setup the pattern props
const props: LambdaToStepfunctionsProps = {
  existingLambdaObj: fn,
  stateMachineProps: {
    definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'lamstp-test')
  },
  logGroupProps: {
    removalPolicy: RemovalPolicy.DESTROY,
  }
};

// Add the pattern
new LambdaToStepfunctions(stack, 'test-lambda-stepfunctions-construct', props);

// Synth the app
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
