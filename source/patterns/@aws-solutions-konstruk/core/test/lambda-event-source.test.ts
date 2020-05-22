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

import * as defaults from '../index';
import { DynamoEventSourceProps } from '@aws-cdk/aws-lambda-event-sources';
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import '@aws-cdk/assert/jest';

test('test DynamoEventSourceProps', () => {
  const props = defaults.DynamoEventSourceProps();

  expect(props).toEqual({
    startingPosition: "TRIM_HORIZON"
  });
});

test('test DynamoEventSourceProps override', () => {
  const myProps: DynamoEventSourceProps = {
    startingPosition: lambda.StartingPosition.LATEST,
    batchSize: 1
  };

  const props = defaults.DynamoEventSourceProps(myProps);

  expect(props).toEqual({
    batchSize: 1,
    startingPosition: "LATEST"
  });
});

test('test KinesisEventSourceProps', () => {
  const streamArn = 'xyz';
  const props = defaults.DefaultKinesisEventSourceProps(streamArn);
  expect(props).toEqual({
      eventSourceArn: "xyz"
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