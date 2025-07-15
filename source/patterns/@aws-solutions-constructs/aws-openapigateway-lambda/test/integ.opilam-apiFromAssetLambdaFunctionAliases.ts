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
import { OpenApiGatewayToLambda } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as defaults from '@aws-solutions-constructs/core';
import { SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import * as path from 'path';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as logs from 'aws-cdk-lib/aws-logs';

const app = new App();
const stack = new Stack(app, defaults.generateIntegStackName(__filename));
SetConsistentFeatureFlags(stack);
stack.templateOptions.description = 'Integration Test for aws-openapigateway-lambda';

const apiDefinitionAsset = new Asset(stack, 'ApiDefinitionAsset', {
  path: path.join(__dirname, 'openapi/apiDefinition.yaml')
});

const messagesLambda = defaults.buildLambdaFunction(stack, {
  lambdaFunctionProps: {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/messages-lambda`),
    currentVersionOptions: {
      removalPolicy: RemovalPolicy.RETAIN,
    },
  }
});

// We need a different log group, because using the function name
// causes CDK to create a log group with the same name (that is not destroyed)
// so there's a collision with the default log group
const replacementLogGroup = new logs.LogGroup(stack, 'our-log-group', {
  removalPolicy: RemovalPolicy.DESTROY
});
defaults.addCfnSuppressRules( replacementLogGroup, [
  {
    id: 'W84',
    reason: 'By default CloudWatchLogs LogGroups data is encrypted using the CloudWatch server-side encryption keys (AWS Managed Keys)'
  }
]);
const photosLambda = defaults.buildLambdaFunction(stack, {
  lambdaFunctionProps: {
    functionName: 'PhotosLambdaAliasTestFromAsset',
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/photos-lambda`),
    logGroup: replacementLogGroup,
  }
});

const messagesAlias = new lambda.Alias(stack, 'messages-alias', {
  version: messagesLambda.currentVersion,
  aliasName: 'messagesAlias',
});

new OpenApiGatewayToLambda(stack, 'OpenApiGatewayToLambda', {
  apiDefinitionAsset,
  apiIntegrations: [
    {
      id: 'MessagesHandler',
      existingLambdaObj: messagesAlias
    },
    {
      id: 'PhotosHandler',
      existingLambdaObj: photosLambda
    }
  ]
});

// Synth
new IntegTest(stack, 'Integ', {
  testCases: [
    stack
  ]
});
