/**
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { App, Stack } from "@aws-cdk/core";
import { LambdaToStepFunction, LambdaToStepFunctionProps } from "../lib";
import * as lambda from '@aws-cdk/aws-lambda';
import * as stepfunctions from '@aws-cdk/aws-stepfunctions';
import * as defaults from '@aws-solutions-constructs/core';

// Setup the app and stack
const app = new App();
const stack = new Stack(app, 'test-lambda-step-function-stack');

// Create a start state for the state machine
const startState = new stepfunctions.Pass(stack, 'StartState');

// Setup the "existing" Lambda function props
const lambdaFunctionProps = {
  runtime: lambda.Runtime.NODEJS_10_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset(`${__dirname}/lambda`)
};

// Setup the "existing" Lambda function
const fn = defaults.deployLambdaFunction(stack, lambdaFunctionProps);

// Setup the pattern props
const props: LambdaToStepFunctionProps = {
  existingLambdaObj: fn,
  stateMachineProps: {
    definition: startState
  }
};

// Add the pattern
new LambdaToStepFunction(stack, 'test-lambda-step-function-stack', props);

// Synth the app
app.synth();
