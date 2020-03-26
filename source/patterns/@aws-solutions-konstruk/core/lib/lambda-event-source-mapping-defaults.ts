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

import * as lambda from '@aws-cdk/aws-lambda';
import { overrideProps } from './utils';
import { DynamoEventSourceProps, S3EventSourceProps } from '@aws-cdk/aws-lambda-event-sources';
import * as s3 from '@aws-cdk/aws-s3';

export function DefaultKinesisEventSourceProps(_eventSourceArn: string) {
    const defaultEventSourceProps: lambda.EventSourceMappingOptions = {
        eventSourceArn: _eventSourceArn
    };
    return defaultEventSourceProps;
}

export function DynamoEventSourceProps(_dynamoEventSourceProps?: DynamoEventSourceProps) {

    const defaultDynamoEventSourceProps = {
        startingPosition: lambda.StartingPosition.TRIM_HORIZON
    };

    if (_dynamoEventSourceProps) {
        return overrideProps(defaultDynamoEventSourceProps, _dynamoEventSourceProps);
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