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
import * as events from 'aws-cdk-lib/aws-events';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import { deployLambdaFunction } from '@aws-solutions-constructs/core';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as defaults from '@aws-solutions-constructs/core';

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));

const submitLambda = deployLambdaFunction(stack, {
  runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
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
    definitionBody: sfn.DefinitionBody.fromChainable(startState),
    timeout: Duration.minutes(5)
  },
  eventRuleProps: {
    schedule: events.Schedule.rate(Duration.minutes(5))
  },
  logGroupProps: {
    removalPolicy: RemovalPolicy.DESTROY,
  },
};

new EventbridgeToStepfunctions(stack, 'test-eventbridge-stepfunctions-and-lambda-construct', props);
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
