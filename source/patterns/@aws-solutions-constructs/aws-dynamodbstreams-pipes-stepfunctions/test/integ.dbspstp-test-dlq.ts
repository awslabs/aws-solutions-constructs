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

import { App, Stack } from "aws-cdk-lib";
import { DynamoDBStreamsToPipesToStepfunctions, DynamoDBStreamsToPipesToStepfunctionsProps } from "../lib";
import { generateIntegStackName, SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as defaults from '@aws-solutions-constructs/core';
import * as lambda from 'aws-cdk-lib/aws-lambda';

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
SetConsistentFeatureFlags(stack);

// This function fails ON PURPOSE so that we can test the DLQ functionality in this stack
const badFunction = new lambda.Function(stack, 'bad-function', {
  code: new lambda.InlineCode('exports.handler = async (event) => { console.log(event); throw new Error("JUST BREAK");'),
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
}
);
const props: DynamoDBStreamsToPipesToStepfunctionsProps = {
  stateMachineProps: {
    definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'dbsstp-test')
  },
  enrichmentFunction: badFunction,
  logLevel: defaults.PipesLogLevel.TRACE,
  pipeProps: {
    sourceParameters: {
      dynamoDbStreamParameters: {
        maximumRecordAgeInSeconds: 60,
        maximumRetryAttempts: 1,
      }
    }
  }
};

new DynamoDBStreamsToPipesToStepfunctions(stack, 'test-dbs-pipes-states-construct', props);

new IntegTest(stack, 'Integ', {
  testCases: [
    stack
  ]
});
