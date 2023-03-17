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
import { EventbridgeToStepfunctions, EventbridgeToStepfunctionsProps } from "../lib";
import { Duration } from 'aws-cdk-lib';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { deployLambdaFunction } from '@aws-solutions-constructs/core';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import { generateIntegStackName } from '@aws-solutions-constructs/core';

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));

const submitLambda = deployLambdaFunction(stack, {
  runtime: lambda.Runtime.NODEJS_14_X,
  code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  handler: 'index.handler'
});

const submitJob = new tasks.LambdaInvoke(stack, 'LambdaTask', {
  lambdaFunction: submitLambda
});
const startState = new stepfunctions.Pass(stack, 'StartState');
startState.next(submitJob);

const props: EventbridgeToStepfunctionsProps = {
  stateMachineProps: {
    definition: startState,
    timeout: Duration.minutes(5)
  },
  eventRuleProps: {
    eventPattern: {
      source: ['solutionsconstructs']
    }
  },
  eventBusProps: { eventBusName: 'test' },
  logGroupProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    logGroupName: "integ-test-new-eventbus"
  },
};

new EventbridgeToStepfunctions(stack, 'test-eventbridge-stepfunctions-new-eventbus-construct', props);
app.synth();
