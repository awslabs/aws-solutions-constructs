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
import * as lambda from "@aws-cdk/aws-lambda";
import * as defaults from '@aws-solutions-constructs/core';
import * as stepfunctions from '@aws-cdk/aws-stepfunctions';
import { LambdaToStepFunction } from '../lib';
import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';

// --------------------------------------------------------------
// Test deployment with new Lambda function
// --------------------------------------------------------------
test('Test deployment with new Lambda function', () => {
    // Stack
    const stack = new Stack();
    // Helper declaration
    const startState = new stepfunctions.Pass(stack, 'StartState');
    new LambdaToStepFunction(stack, 'lambda-to-step-function-stack', {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_10_X,
        handler: 'index.handler',
        code: lambda.Code.asset(`${__dirname}/lambda`),
        environment: {
          LAMBDA_NAME: 'deploy-function'
        }
      },
      stateMachineProps: {
        definition: startState
      }
    });
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    // Assertion 2
    expect(stack).toHaveResourceLike("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          LAMBDA_NAME: 'deploy-function'
        }
      }
    });
});

// --------------------------------------------------------------
// Test deployment with existing Lambda function
// --------------------------------------------------------------
test('Test deployment with existing Lambda function', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const startState = new stepfunctions.Pass(stack, 'StartState');
  const lambdaFunctionProps = {
    runtime: lambda.Runtime.NODEJS_10_X,
    handler: 'index.handler',
    code: lambda.Code.asset(`${__dirname}/lambda`),
    environment: {
      LAMBDA_NAME: 'existing-function'
    }
  };
  const fn = defaults.deployLambdaFunction(stack, lambdaFunctionProps);
  // Add the pattern
  new LambdaToStepFunction(stack, 'test-lambda-step-function-stack', {
    existingLambdaObj: fn,
    stateMachineProps: {
      definition: startState
    }
  });
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  // Assertion 2
  expect(stack).toHaveResourceLike("AWS::Lambda::Function", {
    Environment: {
      Variables: {
        LAMBDA_NAME: 'existing-function'
      }
    }
  });
});

// --------------------------------------------------------------
// Test invocation permissions
// --------------------------------------------------------------
test('Test invocation permissions', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const startState = new stepfunctions.Pass(stack, 'StartState');
  const lambdaFunctionProps = {
    runtime: lambda.Runtime.NODEJS_10_X,
    handler: 'index.handler',
    code: lambda.Code.asset(`${__dirname}/lambda`),
    environment: {
      LAMBDA_NAME: 'existing-function'
    }
  };
  const fn = defaults.deployLambdaFunction(stack, lambdaFunctionProps);
  // Add the pattern
  new LambdaToStepFunction(stack, 'test-lambda-step-function-stack', {
    existingLambdaObj: fn,
    stateMachineProps: {
      definition: startState
    }
  });
  // Assertion 1
  expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "xray:PutTraceSegments",
            "xray:PutTelemetryRecords"
          ],
          Effect: "Allow",
          Resource: "*"
        },
        {
          Action: "states:StartExecution",
          Effect: "Allow",
          Resource: {
            Ref: "testlambdastepfunctionstackStateMachine373C0BB9"
          }
        }
      ],
      Version: "2012-10-17"
    }
  });
});

// --------------------------------------------------------------
// Test the getter methods
// --------------------------------------------------------------
test('Test the properties', () => {
    // Stack
    const stack = new Stack();
    // Helper declaration
    const startState = new stepfunctions.Pass(stack, 'StartState');
    const pattern = new LambdaToStepFunction(stack, 'lambda-to-step-function-stack', {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_10_X,
        handler: 'index.handler',
        code: lambda.Code.asset(`${__dirname}/lambda`),
        environment: {
          LAMBDA_NAME: 'existing-function'
        }
      },
      stateMachineProps: {
        definition: startState
      }
    });
    // Assertion 1
    const func = pattern.lambdaFunction;
    expect(func !== null);
    // Assertion 2
    const stateMachine = pattern.stateMachine;
    expect(stateMachine !== null);
    // Assertion 3
    const cwAlarm = pattern.cloudwatchAlarms;
    expect(cwAlarm !== null);
    expect(pattern.stateMachineLogGroup !== null);
});