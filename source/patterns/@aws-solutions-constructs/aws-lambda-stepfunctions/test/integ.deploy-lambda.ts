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
import { App, Stack, RemovalPolicy } from "aws-cdk-lib";
import { LambdaToStepfunctions, LambdaToStepfunctionsProps } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import { generateIntegStackName } from '@aws-solutions-constructs/core';

// Setup the app and stack
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));

// Create a start state for the state machine
const startState = new stepfunctions.Pass(stack, 'StartState');

// Setup the pattern props
const props: LambdaToStepfunctionsProps = {
  lambdaFunctionProps: {
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`)
  },
  stateMachineProps: {
    definition: startState
  },
  logGroupProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    logGroupName: "with-lambda"
  }
};

// Add the pattern
new LambdaToStepfunctions(stack, 'test-lambda-stepfunctions-construct', props);

// Synth the app
app.synth();
