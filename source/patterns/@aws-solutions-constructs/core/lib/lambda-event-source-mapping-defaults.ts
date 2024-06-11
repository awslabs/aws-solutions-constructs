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

/*
 *  The functions found here in the core library are for internal use and can be changed
 *  or removed outside of a major release. We recommend against calling them directly from client code.
 */

import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { consolidateProps } from './utils';
import { DynamoEventSourceProps, S3EventSourceProps, KinesisEventSourceProps, StreamEventSourceProps, SqsDlq } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Duration } from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { buildQueue } from './sqs-helper';

export interface EventSourceProps {
  readonly eventSourceProps?: StreamEventSourceProps,
  readonly deploySqsDlqQueue?: boolean,
  readonly sqsDlqQueueProps?: sqs.QueueProps
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function DynamoEventSourceProps(scope: Construct, _dynamoEventSourceProps?: EventSourceProps): DynamoEventSourceProps {

  const baseProps: DynamoEventSourceProps = {
    startingPosition: lambda.StartingPosition.TRIM_HORIZON,
    bisectBatchOnError: true,
    maxRecordAge: Duration.hours(24),
    retryAttempts: 500
  };

  let extraProps = {};

  if (_dynamoEventSourceProps === undefined || _dynamoEventSourceProps?.deploySqsDlqQueue === undefined
    || _dynamoEventSourceProps.deploySqsDlqQueue) {
    const buildQueueResponse = buildQueue(scope, 'SqsDlqQueue', {
      queueProps: _dynamoEventSourceProps?.sqsDlqQueueProps,
      deployDeadLetterQueue: false   // This is already a DLQ for the stream, it doesn't need it's own DLQS
    });

    extraProps = {
      onFailure: new SqsDlq(buildQueueResponse.queue),
    };
  }

  const defaultDynamoEventSourceProps = Object.assign(baseProps, extraProps);

  return consolidateProps(defaultDynamoEventSourceProps, _dynamoEventSourceProps?.eventSourceProps);
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function S3EventSourceProps(_s3EventSourceProps?: S3EventSourceProps) {

  const defaultS3EventSourceProps: S3EventSourceProps = {
    events: [s3.EventType.OBJECT_CREATED]
  };

  return consolidateProps(defaultS3EventSourceProps, _s3EventSourceProps);
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function KinesisEventSourceProps(scope: Construct, _kinesisEventSourceProps?: EventSourceProps): KinesisEventSourceProps {
  const baseProps: KinesisEventSourceProps = {
    startingPosition: lambda.StartingPosition.TRIM_HORIZON,
    bisectBatchOnError: true,
    maxRecordAge: Duration.hours(24),
    retryAttempts: 500
  };

  let extraProps = {};

  if (_kinesisEventSourceProps === undefined || _kinesisEventSourceProps?.deploySqsDlqQueue === undefined
    || _kinesisEventSourceProps.deploySqsDlqQueue) {
    const buildQueueResponse = buildQueue(scope, 'SqsDlqQueue', {
      queueProps: _kinesisEventSourceProps?.sqsDlqQueueProps,
      deployDeadLetterQueue: false // Don't create SQS DLQ for Kinesis DLQ
    });

    extraProps = {
      onFailure: new SqsDlq(buildQueueResponse.queue),
    };
  }

  const defaultKinesisEventSourceProps = Object.assign(baseProps, extraProps);

  return consolidateProps(defaultKinesisEventSourceProps, _kinesisEventSourceProps?.eventSourceProps);
}
