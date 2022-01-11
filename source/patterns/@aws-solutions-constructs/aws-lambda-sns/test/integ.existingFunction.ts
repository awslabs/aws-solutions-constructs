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
import { App, Stack } from "@aws-cdk/core";
import { LambdaToSns, LambdaToSnsProps } from "../lib";
import * as lambda from '@aws-cdk/aws-lambda';
import * as defaults from '@aws-solutions-constructs/core';
import { generateIntegStackName } from '@aws-solutions-constructs/core';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-lambda-sns';

// Definitions
const lambdaFunctionProps = {
  runtime: lambda.Runtime.NODEJS_14_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset(`${__dirname}/lambda`)
};

const func = defaults.deployLambdaFunction(stack, lambdaFunctionProps);

const props: LambdaToSnsProps = {
  existingLambdaObj: func
};

new LambdaToSns(stack, 'test-lambda-sns', props);

// Synth
app.synth();
