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

import { App, RemovalPolicy, Stack } from "aws-cdk-lib";
import { CloudFrontToApiGateway } from "../lib";
import * as defaults from '@aws-solutions-constructs/core';
import { generateIntegStackName, SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';
import * as iam from 'aws-cdk-lib/aws-iam';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
SetConsistentFeatureFlags(stack);
stack.templateOptions.description = 'Integration Test for aws-cloudfront-apigateway';

// Create Lambda function with fixed name
const lambdaFunction = new lambda.Function(stack, 'ApiLambdaFunction', {
  functionName: 'test-api-lambda',
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset(path.join(__dirname, 'lambda'))
});

// Create SpecRestApi with embedded OpenAPI spec
const specApi = new apigateway.SpecRestApi(stack, 'SpecRestApi', {
  apiDefinition: apigateway.ApiDefinition.fromInline({
    openapi: '3.0.1',
    info: {
      title: 'Test API',
      version: '1.0.0'
    },
    paths: {
      '/hello': {
        get: {
          'x-amazon-apigateway-integration': {
            type: 'aws_proxy',
            httpMethod: 'POST',
            uri: `arn:aws:apigateway:${stack.region}:lambda:path/2015-03-31/functions/arn:aws:lambda:${stack.region}:${stack.account}:function:test-api-lambda/invocations`
          },
          responses: {
            '200': {
              description: 'Success'
            }
          }
        }
      }
    }
  })
});

// Grant API Gateway permission to invoke Lambda
lambdaFunction.addPermission('ApiGatewayInvoke', {
  principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
  sourceArn: specApi.arnForExecuteApi()
});

new CloudFrontToApiGateway(stack, 'test-cloudfront-apigateway', {
  existingApiGatewayObj: specApi,
  cloudFrontLoggingBucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true
  },
});

defaults.suppressCustomHandlerCfnNagWarnings(stack, 'Custom::S3AutoDeleteObjectsCustomResourceProvider');
// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
