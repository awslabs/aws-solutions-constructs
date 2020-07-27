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
import * as kms from "@aws-cdk/aws-kms";
import * as lambda from "@aws-cdk/aws-lambda";
import { LambdaToSns } from '../lib';
import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';

// --------------------------------------------------------------
// Test deployment with new Lambda function
// --------------------------------------------------------------
test('Test deployment with new Lambda function', () => {
    // Stack
    const stack = new Stack();
    // Helper declaration
    new LambdaToSns(stack, 'lambda-to-sns-stack', {
        lambdaFunctionProps: {
            runtime: lambda.Runtime.NODEJS_10_X,
            handler: 'index.handler',
            code: lambda.Code.asset(`${__dirname}/lambda`),
            environment: {
                LAMBDA_NAME: 'deployed-function'
            }
        }
    });
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    // Assertion 2
    expect(stack).toHaveResourceLike("AWS::Lambda::Function", {
        Environment: {
            Variables: {
                LAMBDA_NAME: 'deployed-function'
            }
        }
    });
    // Assertion 3
    expect(stack).toHaveResource("AWS::KMS::Key", {
        EnableKeyRotation: true
    });
});

// --------------------------------------------------------------
// Test deployment with existing Lambda function
// --------------------------------------------------------------
test('Test deployment with existing Lambda function', () => {
    // Stack
    const stack = new Stack();
    // Helper declaration
    new LambdaToSns(stack, 'lambda-to-sns-stack', {
        lambdaFunctionProps: {
            runtime: lambda.Runtime.NODEJS_10_X,
            handler: 'index.handler',
            code: lambda.Code.asset(`${__dirname}/lambda`),
            environment: {
                LAMBDA_NAME: 'override-function'
            }
        }
    });
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    // Assertion 2
    expect(stack).toHaveResourceLike("AWS::Lambda::Function", {
        Environment: {
            Variables: {
                LAMBDA_NAME: 'override-function'
            }
        }
    });
    // Assertion 3
    expect(stack).toHaveResource("AWS::KMS::Key", {
        EnableKeyRotation: true
    });
});

// --------------------------------------------------------------
// Test deployment with imported encryption key
// --------------------------------------------------------------
test('Test deployment with imported encryption key', () => {
    // Stack
    const stack = new Stack();
    // Setup
    const kmsKey = new kms.Key(stack, 'imported-key', {
        enableKeyRotation: false
    });
    // Helper declaration
    new LambdaToSns(stack, 'lambda-to-sns-stack', {
        lambdaFunctionProps: {
            runtime: lambda.Runtime.NODEJS_10_X,
            handler: 'index.handler',
            code: lambda.Code.asset(`${__dirname}/lambda`),
            environment: {
                LAMBDA_NAME: 'deployed-function-no-enc'
            }
        },
        enableEncryption: true,
        encryptionKey: kmsKey
    });
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    // Assertion 2
    expect(stack).toHaveResourceLike("AWS::Lambda::Function", {
        Environment: {
            Variables: {
                LAMBDA_NAME: 'deployed-function-no-enc'
            }
        }
    });
    // Assertion 3
    expect(stack).toHaveResource("AWS::KMS::Key", {
        EnableKeyRotation: false
    });
});

// --------------------------------------------------------------
// Test the getter methods
// --------------------------------------------------------------
test('Test the properties', () => {
    // Stack
    const stack = new Stack();
    // Helper declaration
    const pattern = new LambdaToSns(stack, 'lambda-to-sns-stack', {
        lambdaFunctionProps: {
            runtime: lambda.Runtime.NODEJS_10_X,
            handler: 'index.handler',
            code: lambda.Code.asset(`${__dirname}/lambda`)
        }
    });
    // Assertion 1
    const func = pattern.lambdaFunction;
    expect(func !== null);
    // Assertion 2
    const topic = pattern.snsTopic;
    expect(topic !== null);
    expect(pattern.encryptionKey != null);
});