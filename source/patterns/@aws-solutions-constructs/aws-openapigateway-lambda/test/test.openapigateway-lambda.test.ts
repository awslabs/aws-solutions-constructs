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
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import * as path from 'path';
import { Template } from "aws-cdk-lib/assertions";

test('Simple deployment works', () => {
  const stack = new Stack();

  const apiDefinitionAsset = new Asset(stack, 'OpenApiAsset', {
    path: path.join(__dirname, 'openapi/apiDefinition.yaml')
  });

  const construct = new OpenApiGatewayToLambda(stack, 'test-apigateway-lambda', {
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

  expect(construct).toBeDefined();
});

test('Throws error when both api definition asset and s3 object are specified', () => {
  const stack = new Stack();

  const apiDefinitionAsset = new Asset(stack, 'OpenApiAsset', {
    path: path.join(__dirname, 'openapi/apiDefinition.yaml')
  });

  const app = () => {
    new OpenApiGatewayToLambda(stack, 'test-apigateway-lambda', {
      apiDefinitionAsset,
      apiDefinitionBucket: new s3.Bucket(stack, 'ApiDefinitionBucket'),
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

test('Multiple Lambda Functions can be specified', () => {
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
      }, {
        id: 'PhotosHandler',
        lambdaFunctionProps: {
          runtime: lambda.Runtime.NODEJS_18_X,
          handler: 'index.handler',
          code: lambda.Code.fromAsset(`${__dirname}/photos-lambda`),
        }
      }
    ]
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Lambda::Function', 4);
});

test('Existing lambda function can be specified', () => {
  const stack = new Stack();

  const apiDefinitionAsset = new Asset(stack, 'OpenApiAsset', {
    path: path.join(__dirname, 'openapi/apiDefinition.yaml')
  });

  const existingLambdaObj = new lambda.Function(stack, 'ExistingLambda', {
    runtime: lambda.Runtime.NODEJS_18_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/messages-lambda`),
  });

  new OpenApiGatewayToLambda(stack, 'test-apigateway-lambda', {
    apiDefinitionAsset,
    apiIntegrations: [
      {
        id: 'MessagesHandler',
        existingLambdaObj
      }, {
        id: 'PhotosHandler',
        lambdaFunctionProps: {
          runtime: lambda.Runtime.NODEJS_18_X,
          handler: 'index.handler',
          code: lambda.Code.fromAsset(`${__dirname}/photos-lambda`),
        }
      }
    ]
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Lambda::Function', 4);
});

test('Throws error when neither existingLambdaObj or lambdaFunctionProps is specified', () => {
  const stack = new Stack();

  const apiDefinitionAsset = new Asset(stack, 'OpenApiAsset', {
    path: path.join(__dirname, 'openapi/apiDefinition.yaml')
  });

  const app = () => {
    new OpenApiGatewayToLambda(stack, 'test-apigateway-lambda', {
      apiDefinitionAsset,
      apiIntegrations: [
        {
          id: 'MessagesHandler'
        }
      ]
    });
  };
  expect(app).toThrowError('One of existingLambdaObj or lambdaFunctionProps must be specified for the api integration with id: MessagesHandler');
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