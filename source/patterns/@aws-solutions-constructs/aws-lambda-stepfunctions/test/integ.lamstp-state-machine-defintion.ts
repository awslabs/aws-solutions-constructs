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
import * as sftasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import { generateIntegStackName, deployLambdaFunction, SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as defaults from '@aws-solutions-constructs/core';

// Setup the app and stack
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
SetConsistentFeatureFlags(stack);

const functionOne = deployLambdaFunction(stack, {
  runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
  handler: 'index.handler',
  code: lambda.Code.fromInline(`exports.handler = async (event) => { console.log("First Function");}`)
},
'first-function');

const taskOne = new sftasks.LambdaInvoke(stack, 'task-one', {
  lambdaFunction: functionOne,
});

const functionTwo = deployLambdaFunction(stack, {
  runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
  handler: 'index.handler',
  code: lambda.Code.fromInline(`exports.handler = async (event) => { console.log("Second Function");}`)
},
'second-function');

const taskTwo = new sftasks.LambdaInvoke(stack, 'task-two', {
  lambdaFunction: functionTwo,
});

// // Launch the construct
const startState = sfn.DefinitionBody.fromChainable(taskOne.next(taskTwo));

// Setup the pattern props
const props: LambdaToStepfunctionsProps = {
  lambdaFunctionProps: {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`)
  },
  stateMachineProps: {
    definitionBody: startState
  },
  logGroupProps: {
    removalPolicy: RemovalPolicy.DESTROY,
  }
};

// Add the pattern
new LambdaToStepfunctions(stack, 'test-lambda-stepfunctions-construct', props);

// Synth the app
new IntegTest(stack, 'Integ', {
  testCases: [
    stack
  ]
});
