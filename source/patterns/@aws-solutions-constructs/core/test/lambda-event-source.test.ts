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

import * as defaults from '../index';
import { DynamoEventSourceProps, KinesisEventSourceProps, SqsDlq } from '@aws-cdk/aws-lambda-event-sources';
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import '@aws-cdk/assert/jest';
import { Duration, Stack } from '@aws-cdk/core';

test('test DynamoEventSourceProps with defaults', () => {
  const stack = new Stack();
  const props = defaults.DynamoEventSourceProps(stack);

  expect(props.onFailure).toBeInstanceOf(SqsDlq);
  expect(props.startingPosition).toEqual("TRIM_HORIZON");
  expect(props.bisectBatchOnError).toEqual(true);
  expect(props.retryAttempts).toEqual(500);
  expect(props.maxRecordAge).toEqual(Duration.hours(24));
});

test('test DynamoEventSourceProps with deployDeadLetterQueue: false', () => {
  const stack = new Stack();
  const props = defaults.DynamoEventSourceProps(stack, {
    deploySqsDlqQueue: false
  });

  expect(props).toEqual({
    startingPosition: "TRIM_HORIZON",
    bisectBatchOnError: true,
    maxRecordAge: Duration.hours(24),
    retryAttempts: 500
  });
});

test('test DynamoEventSourceProps override', () => {
  const stack = new Stack();
  const myProps: DynamoEventSourceProps = {
    startingPosition: lambda.StartingPosition.LATEST,
    batchSize: 5,
    retryAttempts: 3
  };

  const props = defaults.DynamoEventSourceProps(stack, {
    eventSourceProps: myProps,
    deploySqsDlqQueue: false
  });

  expect(props).toEqual({
    batchSize: 5,
    startingPosition: "LATEST",
    maxRecordAge: Duration.hours(24),
    bisectBatchOnError: true,
    retryAttempts: 3
  });
});

test('test S3EventSourceProps w/ default props', () => {
  const props = defaults.S3EventSourceProps();
  expect(props).toEqual({
    events: ["s3:ObjectCreated:*"]
  });
});

test('test S3EventSourceProps w/ user props', () => {
  const s3EventSourceProps = {
    events: [
      s3.EventType.OBJECT_CREATED_POST
    ]
  };
  const props = defaults.S3EventSourceProps(s3EventSourceProps);
  expect(props).toEqual({
    events: ["s3:ObjectCreated:Post"]
  });
});

test('test KinesisEventSourceProps with defaults', () => {
  const stack = new Stack();
  const props = defaults.KinesisEventSourceProps(stack);

  expect(props.onFailure).toBeInstanceOf(SqsDlq);
  expect(props.startingPosition).toEqual("TRIM_HORIZON");
  expect(props.bisectBatchOnError).toEqual(true);
  expect(props.retryAttempts).toEqual(500);
  expect(props.maxRecordAge).toEqual(Duration.hours(24));
});

test('test KinesisEventSourceProps with deployDeadLetterQueue: false', () => {
  const stack = new Stack();
  const props = defaults.KinesisEventSourceProps(stack, {
    deploySqsDlqQueue: false
  });

  expect(props).toEqual({
    startingPosition: "TRIM_HORIZON",
    bisectBatchOnError: true,
    maxRecordAge: Duration.hours(24),
    retryAttempts: 500
  });
});

test('test KinesisEventSourceProps override', () => {
  const stack = new Stack();
  const myProps: KinesisEventSourceProps = {
    startingPosition: lambda.StartingPosition.LATEST,
    batchSize: 5,
    retryAttempts: 3
  };

  const props = defaults.KinesisEventSourceProps(stack, {
    eventSourceProps: myProps,
    deploySqsDlqQueue: false
  });

  expect(props).toEqual({
    batchSize: 5,
    startingPosition: "LATEST",
    maxRecordAge: Duration.hours(24),
    bisectBatchOnError: true,
    retryAttempts: 3
  });
});

test('test sqsDlqQueueProps override', () => {
  const stack = new Stack();

  defaults.KinesisEventSourceProps(stack, {
    sqsDlqQueueProps: {
      queueName: 'hello-world',
      visibilityTimeout: Duration.seconds(50)
    }
  });

  expect(stack).toHaveResource("AWS::SQS::Queue", {
    QueueName: "hello-world",
    VisibilityTimeout: 50
  });
});