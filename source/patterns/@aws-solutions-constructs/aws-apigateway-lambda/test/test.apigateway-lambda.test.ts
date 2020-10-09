/**
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { Stack } from "@aws-cdk/core";
import { ApiGatewayToLambda, ApiGatewayToLambdaProps } from "../lib";
import * as lambda from '@aws-cdk/aws-lambda';
import * as api from '@aws-cdk/aws-apigateway';
import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';

// --------------------------------------------------------------
// Pattern deployment with new Lambda function
// --------------------------------------------------------------
test('Pattern deployment with new Lambda function', () => {
    // Initial Setup
    const stack = new Stack();
    const props: ApiGatewayToLambdaProps = {
        lambdaFunctionProps: {
            runtime: lambda.Runtime.NODEJS_10_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(`${__dirname}/lambda`)
        }
    };
    new ApiGatewayToLambda(stack, 'test-apigateway-lambda', props);
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Pattern deployment with existing Lambda function
// --------------------------------------------------------------
test('Pattern deployment with existing Lambda function', () => {
    // Initial Setup
    const stack = new Stack();
    const fn = new lambda.Function(stack, 'ExistingLambdaFunction', {
        runtime: lambda.Runtime.NODEJS_10_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    });
    const props: ApiGatewayToLambdaProps = {
        existingLambdaObj: fn
    };
    new ApiGatewayToLambda(stack, 'test-apigateway-lambda', props);
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test for error with existingLambdaObj=undefined (not supplied by user).
// --------------------------------------------------------------
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

// --------------------------------------------------------------
// Test with lambdaFunctionProps.
// --------------------------------------------------------------
test('Test with lambdaFunctionProps', () => {
  // Initial Setup
  const stack = new Stack();
  const props: ApiGatewayToLambdaProps = {
      lambdaFunctionProps: {
          runtime: lambda.Runtime.NODEJS_10_X,
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

  expect(stack).toHaveResource('AWS::Lambda::Function', {
    Environment: {
        Variables: {
          OVERRIDE_STATUS: "true",
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1"
        }
    }
  });
});

// --------------------------------------------------------------
// Test getter methods
// --------------------------------------------------------------
test('Test properties', () => {
    // Initial Setup
    const stack = new Stack();
    const props: ApiGatewayToLambdaProps = {
        lambdaFunctionProps: {
            runtime: lambda.Runtime.NODEJS_10_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(`${__dirname}/lambda`)
        }
    };
    const app = new ApiGatewayToLambda(stack, 'test-apigateway-lambda', props);
    // Assertion 1
    expect(app.lambdaFunction !== null);
    // Assertion 2
    expect(app.apiGateway !== null);
    expect(app.apiGatewayCloudWatchRole !== null);
    expect(app.apiGatewayLogGroup !== null);
});

// --------------------------------------------------------------
// Test for error with lambdaFunctionProps=undefined (not supplied by user).
// --------------------------------------------------------------
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

// --------------------------------------------------------------
// Pattern deployment with two ApiGatewayToLambda constructs
// --------------------------------------------------------------
test('Pattern deployment with two ApiGatewayToLambda constructs', () => {
    // Initial Setup
    const stack = new Stack();
    const props1: ApiGatewayToLambdaProps = {
        lambdaFunctionProps: {
            runtime: lambda.Runtime.NODEJS_10_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(`${__dirname}/lambda`)
        }
    };
    new ApiGatewayToLambda(stack, 'pattern1', props1);

    const props2: ApiGatewayToLambdaProps = {
        lambdaFunctionProps: {
            runtime: lambda.Runtime.NODEJS_10_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(`${__dirname}/lambda`)
        }
    };
    new ApiGatewayToLambda(stack, 'pattern2', props2);

    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// -----------------------------------------------------------------
// Test deployment for override ApiGateway AuthorizationType to NONE
// -----------------------------------------------------------------
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
            runtime: lambda.Runtime.NODEJS_10_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(`${__dirname}/lambda`)
        }
    });
    // Assertion 1
    expect(stack).toHaveResourceLike("AWS::ApiGateway::Method", {
        HttpMethod: "ANY",
        AuthorizationType: "NONE"
    });
});

// -----------------------------------------------------------------
// Test deployment for override ApiGateway cloudWatchRole = false
// -----------------------------------------------------------------
test('Test deployment ApiGateway override cloudWatchRole = false', () => {
    // Stack
    const stack = new Stack();
    // Helper declaration
    new ApiGatewayToLambda(stack, 'api-gateway-lambda', {
        apiGatewayProps: {
            cloudWatchRole: false
        },
        lambdaFunctionProps: {
            runtime: lambda.Runtime.NODEJS_10_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(`${__dirname}/lambda`)
        }
    });
    // Assertion 1
    expect(stack).toHaveResourceLike("AWS::ApiGateway::Account", {
        CloudWatchRoleArn: {
          "Fn::GetAtt": [
            "apigatewaylambdaLambdaRestApiCloudWatchRoleA759E8AC",
            "Arn"
          ]
        }
      });
});