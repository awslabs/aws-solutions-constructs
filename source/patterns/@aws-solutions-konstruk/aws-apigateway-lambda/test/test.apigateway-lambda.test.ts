/**
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';

// --------------------------------------------------------------
// Pattern deployment with new Lambda function
// --------------------------------------------------------------
test('Pattern deployment with new Lambda function', () => {
    // Initial Setup
    const stack = new Stack();
    const props: ApiGatewayToLambdaProps = {
        deployLambda: true,
        lambdaFunctionProps: {
            runtime: lambda.Runtime.NODEJS_10_X,
            handler: 'index.handler',
            code: lambda.Code.asset(`${__dirname}/lambda`)
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
        code: lambda.Code.asset(`${__dirname}/lambda`)
    });
    const props: ApiGatewayToLambdaProps = {
        deployLambda: false,
        existingLambdaObj: fn
    };
    new ApiGatewayToLambda(stack, 'test-apigateway-lambda', props);
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test for error with deployLambda=false and
// existingLambdaObj=undefined (not supplied by user).
// --------------------------------------------------------------
test('Error on deployLambda=false and existingLambdaObj=undefined', () => {
    // Initial Setup
    const stack = new Stack();
    const props: ApiGatewayToLambdaProps = {
        deployLambda: false
    };
    const app = () => {
        new ApiGatewayToLambda(stack, 'test-apigateway-lambda', props);
    };
    // Assertion 1
    expect(app).toThrowError();
});

// --------------------------------------------------------------
// Test deployLambda=true with lambdaFunctionProps.
// --------------------------------------------------------------
test('Test deployLambda=true with lambdaFunctionProps', () => {
  // Initial Setup
  const stack = new Stack();
  const props: ApiGatewayToLambdaProps = {
      deployLambda: true,
      lambdaFunctionProps: {
          runtime: lambda.Runtime.NODEJS_10_X,
          handler: 'index.handler',
          code: lambda.Code.asset(`${__dirname}/lambda`),
          environment: {
              OVERRIDE_STATUS: 'true'
          }
    },
    apiGatewayProps: {
        description: "sampleApiProp"
    }
  };
  const app = new ApiGatewayToLambda(stack, 'test-apigateway-lambda', props);
  // Assertion 1
  expect(app.lambdaFunction()).toHaveProperty('environment.OVERRIDE_STATUS', 'true');
});

// --------------------------------------------------------------
// Test getter methods
// --------------------------------------------------------------
test('Test getter methods', () => {
    // Initial Setup
    const stack = new Stack();
    const props: ApiGatewayToLambdaProps = {
        deployLambda: true,
        lambdaFunctionProps: {
            runtime: lambda.Runtime.NODEJS_10_X,
            handler: 'index.handler',
            code: lambda.Code.asset(`${__dirname}/lambda`)
        }
    };
    const app = new ApiGatewayToLambda(stack, 'test-apigateway-lambda', props);
    // Assertion 1
    expect(app.lambdaFunction()).toBeDefined();
    // Assertion 2
    expect(app.restApi()).toBeDefined();
});

// --------------------------------------------------------------
// Test for error with deployLambda=true and
// lambdaFunctionProps=undefined (not supplied by user).
// --------------------------------------------------------------
test('Error on deployLambda=true and lambdaFunctionProps=undefined', () => {
    // Initial Setup
    const stack = new Stack();
    const props: ApiGatewayToLambdaProps = {
        deployLambda: true
    };
    const app = () => {
        new ApiGatewayToLambda(stack, 'test-apigateway-lambda', props);
    };
    // Assertion 1
    expect(app).toThrowError();
});