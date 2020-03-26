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
import { SqsToLambda, SqsToLambdaProps } from "../lib";
import * as lambda from '@aws-cdk/aws-lambda';
import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';

// --------------------------------------------------------------
// Pattern deployment w/ new Lambda function and
// default properties
// --------------------------------------------------------------
test('Pattern deployment w/ new Lambda function and default props', () => {
    // Initial Setup
    const stack = new Stack();
    const props: SqsToLambdaProps = {
        deployLambda: true,
        lambdaFunctionProps: {
            runtime: lambda.Runtime.NODEJS_10_X,
            handler: 'index.handler',
            code: lambda.Code.asset(`${__dirname}/lambda`)
        },
        deployDeadLetterQueue: true,
        maxReceiveCount: 15,
        queueProps: {},
        encryptionKeyProps: {},
    };
    new SqsToLambda(stack, 'test-sqs-lambda', props);
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Pattern deployment w/ new Lambda function and
// overridden properties
// --------------------------------------------------------------
test('Pattern deployment w/ new Lambda function and overridden props', () => {
    // Initial Setup
    const stack = new Stack();
    const props: SqsToLambdaProps = {
        deployLambda: true,
        lambdaFunctionProps: {
            runtime: lambda.Runtime.NODEJS_10_X,
            handler: 'index.handler',
            code: lambda.Code.asset(`${__dirname}/lambda`),
            environment: {
                OVERRIDE: "TRUE"
            }
        },
        queueProps: {
            fifo: true
        },
        encryptionKeyProps: {},
        deployDeadLetterQueue: false,
        maxReceiveCount: 0
    };
    const app = new SqsToLambda(stack, 'test-sqs-lambda', props);
    // Assertion 1
    expect(app.lambdaFunction()).toHaveProperty('environment.OVERRIDE', 'TRUE');
    // Assertion 2
    expect(app.sqsQueue()).toHaveProperty('fifo', true);
});

// --------------------------------------------------------------
// Pattern Deployment w/ Existing Lambda function
// --------------------------------------------------------------
test('Pattern deployment w/ Existing Lambda Function', () => {
    // Initial Setup
    const stack = new Stack();
    const fn = new lambda.Function(stack, 'ExistingLambdaFunction', {
        runtime: lambda.Runtime.NODEJS_10_X,
        handler: 'index.handler',
        code: lambda.Code.asset(`${__dirname}/lambda`)
    });
    const props: SqsToLambdaProps = {
        deployLambda: false,
        existingLambdaObj: fn,
        deployDeadLetterQueue: false,
        encryptionKeyProps: {},
        maxReceiveCount: 0,
        queueProps: {}
    };
    new SqsToLambda(stack, 'test-apigateway-lambda', props);
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test the getter methods
// --------------------------------------------------------------
test('Test getter methods', () => {
    // Initial Setup
    const stack = new Stack();
    const props: SqsToLambdaProps = {
        deployLambda: true,
        lambdaFunctionProps: {
            runtime: lambda.Runtime.NODEJS_10_X,
            handler: 'index.handler',
            code: lambda.Code.asset(`${__dirname}/lambda`)
        },
        deployDeadLetterQueue: false,
        encryptionKeyProps: {},
        maxReceiveCount: 0,
        queueProps: {}
    };
    const app = new SqsToLambda(stack, 'test-apigateway-lambda', props);
    // Assertion 1
    expect(app.lambdaFunction()).toBeDefined();
    // Assertion 2
    expect(app.sqsQueue()).toBeDefined();
});

// --------------------------------------------------------------
// Test error handling for existing Lambda function
// --------------------------------------------------------------
test('Test error handling for existing Lambda function', () => {
    // Initial Setup
    const stack = new Stack();
    const props: SqsToLambdaProps = {
        deployLambda: false,
        existingLambdaObj: undefined,
        deployDeadLetterQueue: false,
        encryptionKeyProps: {},
        maxReceiveCount: 0,
        queueProps: {}
    };
    // Assertion 1
    expect(() => {
        new SqsToLambda(stack, 'test-sqs-lambda', props);
    }).toThrowError();
});

// --------------------------------------------------------------
// Test error handling for new Lambda function
// w/o required properties
// --------------------------------------------------------------
test('Test error handling for new Lambda function w/o required properties', () => {
    // Initial Setup
    const stack = new Stack();
    const props: SqsToLambdaProps = {
        deployLambda: true,
        deployDeadLetterQueue: false,
        encryptionKeyProps: {},
        maxReceiveCount: 0,
        queueProps: {}
    };
    // Assertion 1
    expect(() => {
        new SqsToLambda(stack, 'test-sqs-lambda', props);
    }).toThrowError();
});