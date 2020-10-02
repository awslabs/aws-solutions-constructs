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
import { KinesisStreamsToLambda, KinesisStreamsToLambdaProps } from '../lib';
import { Stack, App } from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';

// Setup
const app = new App();
const stack = new Stack(app, 'test-ks-lambda-stack');
stack.templateOptions.description = 'Integration Test for aws-kinesisstreams-lambda';

// Definitions
const props: KinesisStreamsToLambdaProps = {
    kinesisStreamProps: {},
    kinesisEventSourceProps: {
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        batchSize: 1
    },
    lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_10_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
};

new KinesisStreamsToLambda(stack, 'test-ks-lambda', props);

// Synth
app.synth();