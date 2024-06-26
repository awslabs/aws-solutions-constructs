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
import { Stack, Duration } from "aws-cdk-lib";
import { KinesisStreamsToLambda, KinesisStreamsToLambdaProps } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import { Template } from 'aws-cdk-lib/assertions';
import * as defaults from '@aws-solutions-constructs/core';

test('Test properties', () => {
  // Initial Setup
  const stack = new Stack();
  const props: KinesisStreamsToLambdaProps = {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    }
  };
  const app = new KinesisStreamsToLambda(stack, 'test-kinesis-streams-lambda', props);
  // Assertion 1
  expect(app.lambdaFunction).toBeDefined();
  // Assertion 2
  expect(app.kinesisStream).toBeDefined();
  // Assertion 3
  expect(app.cloudwatchAlarms).toBeDefined();
});

test('Test existing resources', () => {
  // Initial Setup
  const stack = new Stack();

  const fn = new lambda.Function(stack, 'test-fn', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
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

  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Kinesis::Stream', {
    Name: 'existing-stream',
    ShardCount: 5,
    RetentionPeriodHours: 48,
  });

  template.hasResourceProperties('AWS::Lambda::Function', {
    Handler: 'index.handler',
    Runtime:  defaults.COMMERCIAL_REGION_LAMBDA_NODE_STRING,
  });
});

test('test sqsDlqQueueProps override', () => {
  const stack = new Stack();
  const props: KinesisStreamsToLambdaProps = {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    sqsDlqQueueProps: {
      queueName: 'hello-world',
      visibilityTimeout: Duration.seconds(50)
    }
  };
  new KinesisStreamsToLambda(stack, 'test-kinesis-streams-lambda', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    QueueName: "hello-world",
    VisibilityTimeout: 50
  });
});

test('Test properties with no CW Alarms', () => {
  // Initial Setup
  const stack = new Stack();
  const props: KinesisStreamsToLambdaProps = {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    createCloudWatchAlarms: false
  };
  const app = new KinesisStreamsToLambda(stack, 'test-kinesis-streams-lambda', props);
  // Assertion 1
  expect(app.lambdaFunction).toBeDefined();
  // Assertion 2
  expect(app.kinesisStream).toBeDefined();
  // Assertion 3
  expect(app.cloudwatchAlarms).not.toBeDefined();
});

test('Confirm call to CheckLambdaProps', () => {
  // Initial Setup
  const stack = new Stack();
  const lambdaFunction = new lambda.Function(stack, 'a-function', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  const props: KinesisStreamsToLambdaProps = {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    existingLambdaObj: lambdaFunction,
  };
  const app = () => {
    new KinesisStreamsToLambda(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n');
});

test('Confirm call to CheckKinesisStreamProps', () => {
  // Initial Setup
  const stack = new Stack();

  const props: KinesisStreamsToLambdaProps = {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    existingStreamObj: new kinesis.Stream(stack, 'test', {}),
    kinesisStreamProps: {}
  };
  const app = () => {
    new KinesisStreamsToLambda(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide existingStreamObj or kinesisStreamProps, but not both.\n');
});
