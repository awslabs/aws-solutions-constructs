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
import { App, Stack } from "@aws-cdk/core";
import { KinesisStreamsToKinesisFirehoseToS3 } from '../lib';
import { KinesisStreamsToLambda } from '@aws-solutions-constructs/aws-kinesisstreams-lambda';
import * as lambda from '@aws-cdk/aws-lambda';

// Setup
const app = new App();
const stack = new Stack(app, 'test-existing-stream-firehose-s3-stack');
stack.templateOptions.description = 'Integration Test for aws-kinesisstreams-kinesisfirehose-s3';

const construct = new KinesisStreamsToLambda(stack, 'test-kinesis-lambda', {
    lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_10_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    }
});

new KinesisStreamsToKinesisFirehoseToS3(stack, 'test-existing-stream-firehose-s3-stack', {
    existingStreamObj: construct.kinesisStream,
    createCloudWatchAlarms: false
});

// Synth
app.synth();
