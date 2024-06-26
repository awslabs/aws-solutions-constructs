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
import { ApiGatewayToLambda, ApiGatewayToLambdaProps } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as api from 'aws-cdk-lib/aws-apigateway';
import { Template } from "aws-cdk-lib/assertions";
import * as defaults from '@aws-solutions-constructs/core';

test('Error on existingLambdaObj=undefined', () => {
  // Initial Setup
  const stack = new Stack();
  const props: ApiGatewayToLambdaProps = {
  };
  const app = () => {
    new ApiGatewayToLambda(stack, 'test-apigateway-lambda', props);
  };
    // Assertion 1
  expect(app).toThrowError();
});

test('Test with lambdaFunctionProps', () => {
  // Initial Setup
  const stack = new Stack();
  const props: ApiGatewayToLambdaProps = {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      environment: {
        OVERRIDE_STATUS: 'true'
      }
    },
    apiGatewayProps: {
      description: "sampleApiProp"
    }
  };
  new ApiGatewayToLambda(stack, 'test-apigateway-lambda', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Environment: {
      Variables: {
        OVERRIDE_STATUS: "true",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1"
      }
    }
  });
});

test('Test properties', () => {
  // Initial Setup
  const stack = new Stack();
  const props: ApiGatewayToLambdaProps = {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    }
  };
  const app = new ApiGatewayToLambda(stack, 'test-apigateway-lambda', props);
  // Assertion 1
  expect(app.lambdaFunction).toBeDefined();
  // Assertion 2
  expect(app.apiGateway).toBeDefined();
  expect(app.apiGatewayCloudWatchRole).toBeDefined();
  expect(app.apiGatewayLogGroup).toBeDefined();
});

test('Error on lambdaFunctionProps=undefined', () => {
  // Initial Setup
  const stack = new Stack();
  const props: ApiGatewayToLambdaProps = {
  };
  const app = () => {
    new ApiGatewayToLambda(stack, 'test-apigateway-lambda', props);
  };
    // Assertion 1
  expect(app).toThrowError();
});

test('Test deployment ApiGateway AuthorizationType override', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new ApiGatewayToLambda(stack, 'api-gateway-lambda', {
    apiGatewayProps: {
      defaultMethodOptions: {
        authorizationType: api.AuthorizationType.NONE
      }
    },
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    }
  });
  // Assertion 1
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ApiGateway::Method", {
    HttpMethod: "ANY",
    AuthorizationType: "NONE"
  });
});

test('Test deployment ApiGateway override cloudWatchRole = false', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new ApiGatewayToLambda(stack, 'api-gateway-lambda', {
    apiGatewayProps: {
      cloudWatchRole: false
    },
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    }
  });
  // Assertion 1
  defaults.expectNonexistence(stack, "AWS::ApiGateway::Account", {});
});

test('Confirm call to CheckLambdaProps', () => {
  // Initial Setup
  const stack = new Stack();
  const lambdaFunction = new lambda.Function(stack, 'a-function', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  const props: ApiGatewayToLambdaProps = {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      environment: {
        OVERRIDE_STATUS: 'true'
      }
    },
    existingLambdaObj: lambdaFunction,
    apiGatewayProps: {
      description: "sampleApiProp"
    }
  };
  const app = () => {
    new ApiGatewayToLambda(stack, 'test-apigateway-lambda', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n');
});
