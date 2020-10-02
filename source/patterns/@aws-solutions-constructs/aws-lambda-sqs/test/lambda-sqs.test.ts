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
import * as sqs from "@aws-cdk/aws-sqs";
import { LambdaToSqs } from '../lib';
import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';

// --------------------------------------------------------------
// Test minimal deployment with new Lambda function
// --------------------------------------------------------------
test('Test minimal deployment with new Lambda function', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToSqs(stack, 'lambda-to-sqs-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    }
  });
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test deployment w/ DLQ and purging explicitly enabled
// --------------------------------------------------------------
test('Test deployment w/ DLQ and purging enabled', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToSqs(stack, 'lambda-to-sqs-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    enableQueuePurging: true,
    deployDeadLetterQueue: true
  });
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test deployment w/ purging explicitly disabled
// --------------------------------------------------------------
test('Test deployment w/ purging disabled', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToSqs(stack, 'lambda-to-sqs-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    enableQueuePurging: false
  });
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test the getter methods
// --------------------------------------------------------------
test('Test the properties', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const pattern = new LambdaToSqs(stack, 'lambda-to-sqs-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
  });
  // Assertion 1
  const func = pattern.lambdaFunction;
  expect(func !== null);
  // Assertion 2
  const queue = pattern.sqsQueue;
  expect(queue !== null);
  // Assertion 3
  const dlq = pattern.deadLetterQueue;
  expect(dlq !== null);
});

// --------------------------------------------------------------
// Test deployment w/ DLQ disabled
// --------------------------------------------------------------
test('Test deployment w/ DLQ disabled', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToSqs(stack, 'lambda-to-sqs-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    enableQueuePurging: true,
    deployDeadLetterQueue: false,
    queueProps: {
      queueName: 'queue-with-dlq-disabled'
    }
  });
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
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
  new LambdaToSqs(stack, 'lambda-to-sqs-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    enableQueuePurging: true,
    existingQueueObj: queue
  });
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});