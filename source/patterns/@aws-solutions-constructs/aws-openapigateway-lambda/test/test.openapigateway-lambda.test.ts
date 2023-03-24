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
import { Stack } from "aws-cdk-lib";
import { OpenApiGatewayToLambda } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import '@aws-cdk/assert/jest';
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import * as path from 'path';

test('Simple deployment works', () => {
  const stack = new Stack();

  const apiDefinitionAsset = new Asset(stack, 'OpenApiAsset', {
    path: path.join(__dirname, 'openapi/apiDefinition.yaml')
  });

  new OpenApiGatewayToLambda(stack, 'test-apigateway-lambda', {
    apiDefinitionAsset,
    apiIntegrations: [
      {
        id: 'MessagesHandler',
        lambdaFunctionProps: {
          runtime: lambda.Runtime.NODEJS_18_X,
          handler: 'index.handler',
          code: lambda.Code.fromAsset(`${__dirname}/messages-lambda`),
        }
      }
    ]
  });
});

test('Throws error when both api definition asset and s3 object are specified', () => {
  const stack = new Stack();

  const apiDefinitionAsset = new Asset(stack, 'OpenApiAsset', {
    path: path.join(__dirname, 'openapi/apiDefinition.yaml')
  });

  const app = () => {
    new OpenApiGatewayToLambda(stack, 'test-apigateway-lambda', {
      apiDefinitionAsset,
      apiDefinitionBucket: 'bucket',
      apiDefinitionKey: 'key',
      apiIntegrations: [
        {
          id: 'MessagesHandler',
          lambdaFunctionProps: {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(`${__dirname}/messages-lambda`),
          }
        }
      ]
    });
  };
  expect(app).toThrowError('Either apiDefinitionBucket/apiDefinitionKey or apiDefinitionAsset must be specified, but not both');
});

test('Throws error when no api definition is specified', () => {
  const stack = new Stack();

  const app = () => {
    new OpenApiGatewayToLambda(stack, 'test-apigateway-lambda', {
      apiIntegrations: [
        {
          id: 'MessagesHandler',
          lambdaFunctionProps: {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(`${__dirname}/messages-lambda`),
          }
        }
      ]
    });
  };
  expect(app).toThrowError('Either apiDefinitionBucket/apiDefinitionKey or apiDefinitionAsset must be specified');
});

test('Throws error when no api integration is specified', () => {
  const stack = new Stack();

  const apiDefinitionAsset = new Asset(stack, 'OpenApiAsset', {
    path: path.join(__dirname, 'openapi/apiDefinition.yaml')
  });

  const app = () => {
    new OpenApiGatewayToLambda(stack, 'test-apigateway-lambda', {
      apiDefinitionAsset,
      apiIntegrations: []
    });
  };
  expect(app).toThrowError('At least one ApiIntegration must be specified in the apiIntegrations property');
});