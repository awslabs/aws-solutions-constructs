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
import { KinesisStreamsToLambda, KinesisStreamsToLambdaProps } from "../lib";
import { StartingPosition } from '@aws-cdk/aws-lambda';
import { SynthUtils } from '@aws-cdk/assert';
import * as lambda from '@aws-cdk/aws-lambda';
import '@aws-cdk/assert/jest';

// --------------------------------------------------------------
// Pattern minimal deployment
// --------------------------------------------------------------
test('Pattern minimal deployment', () => {
    // Initial setup
    const stack = new Stack();
    const props: KinesisStreamsToLambdaProps = {
        deployLambda: true,
        lambdaFunctionProps: {
            runtime: lambda.Runtime.NODEJS_10_X,
            handler: 'index.handler',
            code: lambda.Code.asset(`${__dirname}/lambda`)
        }
    };
    new KinesisStreamsToLambda(stack, 'test-kinesis-streams-lambda', props);
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test getter methods
// --------------------------------------------------------------
test('Test getter methods', () => {
    // Initial Setup
    const stack = new Stack();
    const props: KinesisStreamsToLambdaProps = {
        encryptionKeyProps: {},
        kinesisStreamProps: {},
        deployLambda: true,
        lambdaFunctionProps: {
            runtime: lambda.Runtime.NODEJS_10_X,
            handler: 'index.handler',
            code: lambda.Code.asset(`${__dirname}/lambda`)
        },
        eventSourceProps: {
            startingPosition: StartingPosition.TRIM_HORIZON,
            batchSize: 1
        }
    };
    const app = new KinesisStreamsToLambda(stack, 'test-kinesis-streams-lambda', props);
    // Assertion 1
    expect(app.lambdaFunction()).toBeDefined();
    // Assertion 2
    expect(app.stream()).toBeDefined();
});