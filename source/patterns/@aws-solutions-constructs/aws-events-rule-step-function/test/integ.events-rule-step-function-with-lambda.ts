/**
 *  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { EventsRuleToStepFunction, EventsRuleToStepFunctionProps } from "../lib";
import { Duration } from '@aws-cdk/core';
import * as tasks from '@aws-cdk/aws-stepfunctions-tasks';
import * as events from '@aws-cdk/aws-events';
import * as lambda from '@aws-cdk/aws-lambda';
import { deployLambdaFunction } from '@aws-solutions-constructs/core';
import * as stepfunctions from '@aws-cdk/aws-stepfunctions';

const app = new App();
const stack = new Stack(app, 'test-events-rule-step-function-and-lambda-stack');

const submitLambda = deployLambdaFunction(stack, {
  runtime: lambda.Runtime.NODEJS_12_X,
  code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  handler: 'index.handler'
});

const submitJob = new tasks.RunLambdaTask(submitLambda);
const startState = new stepfunctions.Pass(stack, 'StartState');
startState.next(new stepfunctions.Task(stack, 'LambdaTask', {
  task: submitJob
}));

const props: EventsRuleToStepFunctionProps = {
  stateMachineProps: {
    definition: startState,
    timeout: Duration.minutes(5)
  },
  eventRuleProps: {
    schedule: events.Schedule.rate(Duration.minutes(5))
  }
};

new EventsRuleToStepFunction(stack, 'test-events-rule-step-function-and-lambda-stack', props);
app.synth();
