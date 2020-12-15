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
import { Stack, Duration } from "@aws-cdk/core";
import { KinesisStreamsToLambda, KinesisStreamsToLambdaProps } from "../lib";
import { SynthUtils } from '@aws-cdk/assert';
import * as lambda from '@aws-cdk/aws-lambda';
import * as kinesis from '@aws-cdk/aws-kinesis';
import '@aws-cdk/assert/jest';

// --------------------------------------------------------------
// Pattern minimal deployment
// --------------------------------------------------------------
test('Pattern minimal deployment', () => {
  // Initial setup
  const stack = new Stack();
  const props: KinesisStreamsToLambdaProps = {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    }
  };
  new KinesisStreamsToLambda(stack, 'test-kinesis-streams-lambda', props);
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test properties
// --------------------------------------------------------------
test('Test properties', () => {
  // Initial Setup
  const stack = new Stack();
  const props: KinesisStreamsToLambdaProps = {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    }
  };
  const app = new KinesisStreamsToLambda(stack, 'test-kinesis-streams-lambda', props);
  // Assertion 1
  expect(app.lambdaFunction !== null);
  // Assertion 2
  expect(app.kinesisStream !== null);
  // Assertion 3
  expect(app.cloudwatchAlarms !== null);
});

// --------------------------------------------------------------
// Test existing resources
// --------------------------------------------------------------
test('Test existing resources', () => {
  // Initial Setup
  const stack = new Stack();

  const fn = new lambda.Function(stack, 'test-fn', {
    runtime: lambda.Runtime.NODEJS_10_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`)
  });

  const stream = new kinesis.Stream(stack, 'test-stream', {
    streamName: 'existing-stream',
    shardCount: 5,
    retentionPeriod: Duration.hours(48),
    encryption: kinesis.StreamEncryption.UNENCRYPTED
  });

  new KinesisStreamsToLambda(stack, 'test-kinesis-streams-lambda', {
    existingLambdaObj: fn,
    existingStreamObj: stream,

    // These properties will be ignored as existing objects were provided
    lambdaFunctionProps: {
      runtime: lambda.Runtime.PYTHON_3_8,
      handler: 'lambda_function.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    kinesisStreamProps: {
      streamName: 'other-name-stream',
      shardCount: 1,
      retentionPeriod: Duration.hours(24)
    }
  });

  // Assertions
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();

  expect(stack).toHaveResource('AWS::Kinesis::Stream', {
    Name: 'existing-stream',
    ShardCount: 5,
    RetentionPeriodHours: 48,
  });

  expect(stack).toHaveResource('AWS::Lambda::Function', {
    Handler: 'index.handler',
    Runtime: 'nodejs10.x',
  });
});

// --------------------------------------------------------------
// Test sqsDlqQueueProps override
// --------------------------------------------------------------
test('test sqsDlqQueueProps override', () => {
  const stack = new Stack();
  const props: KinesisStreamsToLambdaProps = {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    sqsDlqQueueProps: {
      queueName: 'hello-world',
      visibilityTimeout: Duration.seconds(50)
    }
  };
  new KinesisStreamsToLambda(stack, 'test-kinesis-streams-lambda', props);

  expect(stack).toHaveResource("AWS::SQS::Queue", {
    QueueName: "hello-world",
    VisibilityTimeout: 50
  });
});

// --------------------------------------------------------------
// Test properties with no CW Alarms
// --------------------------------------------------------------
test('Test properties with no CW Alarms', () => {
  // Initial Setup
  const stack = new Stack();
  const props: KinesisStreamsToLambdaProps = {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    createCloudWatchAlarms: false
  };
  const app = new KinesisStreamsToLambda(stack, 'test-kinesis-streams-lambda', props);
  // Assertion 1
  expect(app.lambdaFunction !== null);
  // Assertion 2
  expect(app.kinesisStream !== null);
  // Assertion 3
  expect(app.cloudwatchAlarms === null);
});