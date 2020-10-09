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

import * as lambda from '@aws-cdk/aws-lambda';
import { overrideProps } from './utils';
import { DynamoEventSourceProps, S3EventSourceProps, KinesisEventSourceProps,  StreamEventSourceProps, SqsDlq } from '@aws-cdk/aws-lambda-event-sources';
import * as s3 from '@aws-cdk/aws-s3';
import { Construct, Duration } from '@aws-cdk/core';
import * as sqs from '@aws-cdk/aws-sqs';
import { buildQueue } from './sqs-helper';

export interface EventSourceProps {
    readonly eventSourceProps?: StreamEventSourceProps,
    readonly deploySqsDlqQueue?: boolean,
    readonly sqsDlqQueueProps?: sqs.QueueProps
}

export function DynamoEventSourceProps(scope: Construct, _dynamoEventSourceProps?: EventSourceProps): DynamoEventSourceProps {

    const baseProps: DynamoEventSourceProps = {
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        bisectBatchOnError: true,
        maxRecordAge: Duration.hours(24),
        retryAttempts: 500
    };

    let extraProps = {};

    if (_dynamoEventSourceProps === undefined || _dynamoEventSourceProps?.deploySqsDlqQueue === undefined
        || _dynamoEventSourceProps.deploySqsDlqQueue ) {
        const [sqsQueue] = buildQueue(scope, 'SqsDlqQueue', {
            queueProps: _dynamoEventSourceProps?.sqsDlqQueueProps
        });

        extraProps = {
            onFailure: new SqsDlq(sqsQueue),
        };
    }

    const defaultDynamoEventSourceProps = Object.assign(baseProps, extraProps);

    if (_dynamoEventSourceProps?.eventSourceProps) {
        return overrideProps(defaultDynamoEventSourceProps, _dynamoEventSourceProps.eventSourceProps as DynamoEventSourceProps);
    } else {
        return defaultDynamoEventSourceProps;
    }
}

export function S3EventSourceProps(_s3EventSourceProps?: S3EventSourceProps) {

    const defaultS3EventSourceProps: S3EventSourceProps = {
        events: [s3.EventType.OBJECT_CREATED]
    };

    if (_s3EventSourceProps) {
        return overrideProps(defaultS3EventSourceProps, _s3EventSourceProps, false);
    } else {
        return defaultS3EventSourceProps;
    }
}

export function KinesisEventSourceProps(scope: Construct, _kinesisEventSourceProps?: EventSourceProps): KinesisEventSourceProps {
    const baseProps: KinesisEventSourceProps = {
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        bisectBatchOnError: true,
        maxRecordAge: Duration.hours(24),
        retryAttempts: 500
    };

    let extraProps = {};

    if (_kinesisEventSourceProps === undefined || _kinesisEventSourceProps?.deploySqsDlqQueue === undefined
        || _kinesisEventSourceProps.deploySqsDlqQueue ) {
        const [sqsQueue] = buildQueue(scope, 'SqsDlqQueue', {
            queueProps: _kinesisEventSourceProps?.sqsDlqQueueProps
        });

        extraProps = {
            onFailure: new SqsDlq(sqsQueue),
        };
    }

    const defaultKinesisEventSourceProps = Object.assign(baseProps, extraProps);

    if (_kinesisEventSourceProps?.eventSourceProps) {
        return overrideProps(defaultKinesisEventSourceProps, _kinesisEventSourceProps.eventSourceProps as KinesisEventSourceProps);
    } else {
        return defaultKinesisEventSourceProps;
    }
}
