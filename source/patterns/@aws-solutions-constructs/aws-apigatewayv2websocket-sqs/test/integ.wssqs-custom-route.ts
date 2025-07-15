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
import { App, Stack } from "aws-cdk-lib";
import { ApiGatewayV2WebSocketToSqs } from "../lib";
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { WebSocketLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as defaults from '@aws-solutions-constructs/core';
import { SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';

// Setup
const app = new App();
const stack = new Stack(app, defaults.generateIntegStackName(__filename));
SetConsistentFeatureFlags(stack);
stack.templateOptions.description = 'Integration Test for aws-apigateway-sqs';

const mockDisconnectLambda = defaults.deployLambdaFunction(stack, {
  code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
  handler: 'disconnect.handler'
}, "disconnect");

new ApiGatewayV2WebSocketToSqs(stack, 'ApiGatewayV2WebSocketToSqs', {
  webSocketApiProps: {
    disconnectRouteOptions: {
      integration: new WebSocketLambdaIntegration('DisconnectIntegration', mockDisconnectLambda)
    }
  },
  customRouteName: 'custom-action'
});

// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
