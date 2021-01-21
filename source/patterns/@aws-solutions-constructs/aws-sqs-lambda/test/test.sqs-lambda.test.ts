/**
 *  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { SqsToLambda, SqsToLambdaProps } from "../lib";
import * as lambda from '@aws-cdk/aws-lambda';
import * as sqs from '@aws-cdk/aws-sqs';
import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';

// --------------------------------------------------------------
// Pattern deployment w/ new Lambda function and
// default properties
// --------------------------------------------------------------
test('Pattern deployment w/ new Lambda function and default props', () => {
  // Initial Setup
  const stack = new Stack();
  const props: SqsToLambdaProps = {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    }
  };
  new SqsToLambda(stack, 'test-sqs-lambda', props);
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Pattern deployment w/ new Lambda function and
// overridden properties
// --------------------------------------------------------------
test('Pattern deployment w/ new Lambda function and overridden props', () => {
  // Initial Setup
  const stack = new Stack();
  const props: SqsToLambdaProps = {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      environment: {
        OVERRIDE: "TRUE"
      }
    },
    queueProps: {
      fifo: true
    },
    deployDeadLetterQueue: false,
    maxReceiveCount: 0
  };
  const app = new SqsToLambda(stack, 'test-sqs-lambda', props);
  // Assertion 1
  expect(app.sqsQueue).toHaveProperty('fifo', true);
  // Assertion 2
  expect(stack).toHaveResource('AWS::Lambda::Function', {
    Environment: {
      Variables: {
        OVERRIDE: "TRUE",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1"
      }
    }
  });
});

// --------------------------------------------------------------
// Pattern Deployment w/ Existing Lambda function
// --------------------------------------------------------------
test('Pattern deployment w/ Existing Lambda Function', () => {
  // Initial Setup
  const stack = new Stack();
  const fn = new lambda.Function(stack, 'ExistingLambdaFunction', {
    runtime: lambda.Runtime.NODEJS_10_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`)
  });
  const props: SqsToLambdaProps = {
    existingLambdaObj: fn,
    deployDeadLetterQueue: false,
    maxReceiveCount: 0,
    queueProps: {}
  };
  new SqsToLambda(stack, 'test-apigateway-lambda', props);
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test the getter methods
// --------------------------------------------------------------
test('Test getter methods', () => {
  // Initial Setup
  const stack = new Stack();
  const props: SqsToLambdaProps = {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    deployDeadLetterQueue: true,
    maxReceiveCount: 0,
    queueProps: {}
  };
  const app = new SqsToLambda(stack, 'test-apigateway-lambda', props);
  // Assertion 1
  expect(app.lambdaFunction !== null);
  // Assertion 2
  expect(app.sqsQueue !== null);
  // Assertion 3
  expect(app.deadLetterQueue !== null);
});

// --------------------------------------------------------------
// Test error handling for existing Lambda function
// --------------------------------------------------------------
test('Test error handling for existing Lambda function', () => {
  // Initial Setup
  const stack = new Stack();
  const props: SqsToLambdaProps = {
    existingLambdaObj: undefined,
    deployDeadLetterQueue: false,
    maxReceiveCount: 0,
    queueProps: {}
  };
    // Assertion 1
  expect(() => {
    new SqsToLambda(stack, 'test-sqs-lambda', props);
  }).toThrowError();
});

// --------------------------------------------------------------
// Test error handling for new Lambda function
// w/o required properties
// --------------------------------------------------------------
test('Test error handling for new Lambda function w/o required properties', () => {
  // Initial Setup
  const stack = new Stack();
  const props: SqsToLambdaProps = {
    deployDeadLetterQueue: false,
    maxReceiveCount: 0,
    queueProps: {}
  };
    // Assertion 1
  expect(() => {
    new SqsToLambda(stack, 'test-sqs-lambda', props);
  }).toThrowError();
});

// --------------------------------------------------------------
// Test deployment w/ existing queue
// --------------------------------------------------------------
test('Test deployment w/ existing queue', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const queue = new sqs.Queue(stack, 'existing-queue-obj', {
    queueName: 'existing-queue-obj'
  });
  new SqsToLambda(stack, 'lambda-to-sqs-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    existingQueueObj: queue
  });
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Pattern deployment w/ batch size
// --------------------------------------------------------------
test('Pattern deployment w/ batch size', () => {
  const stack = new Stack();
  const props: SqsToLambdaProps = {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    sqsEventSourceProps: {
      batchSize: 5
    }
  };
  new SqsToLambda(stack, 'test-sqs-lambda', props);

  expect(stack).toHaveResource('AWS::Lambda::EventSourceMapping', {
    BatchSize: 5
  });
});