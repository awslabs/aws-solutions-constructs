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
import * as lambda from "@aws-cdk/aws-lambda";
import * as sns from "@aws-cdk/aws-sns";
import { LambdaToSns, LambdaToSnsProps } from '../lib';
import { SynthUtils, expect as expectCDK, haveResource } from '@aws-cdk/assert';
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
    expect(stack).toHaveResource("AWS::SNS::Topic", {
        KmsMasterKeyId: {
            "Fn::Join": [
              "",
              [
                "arn:",
                {
                  Ref: "AWS::Partition"
                },
                ":kms:",
                {
                  Ref: "AWS::Region"
                },
                ":",
                {
                  Ref: "AWS::AccountId"
                },
                ":alias/aws/sns"
              ]
            ]
          }
    });
});

// --------------------------------------------------------------
// Test deployment with existing existingTopicObj
// --------------------------------------------------------------
test('Test deployment with existing existingTopicObj', () => {
    // Stack
    const stack = new Stack();

    const topic = new sns.Topic(stack, 'MyTopic', {
        topicName: "custom-topic"
    });

    // Helper declaration
    new LambdaToSns(stack, 'lambda-to-sns-stack', {
        lambdaFunctionProps: {
            runtime: lambda.Runtime.NODEJS_10_X,
            handler: 'index.handler',
            code: lambda.Code.asset(`${__dirname}/lambda`),
            environment: {
                LAMBDA_NAME: 'override-function'
            }
        },
        existingTopicObj: topic
    });
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    // Assertion 2
    expectCDK(stack).to(haveResource("AWS::SNS::Topic", {
        TopicName: "custom-topic"
    }));
});

// --------------------------------------------------------------
// Test deployment with imported encryption key
// --------------------------------------------------------------
test('override topicProps', () => {
    const stack = new Stack();

    const props: LambdaToSnsProps = {
        lambdaFunctionProps: {
          code: lambda.Code.asset(`${__dirname}/lambda`),
          runtime: lambda.Runtime.NODEJS_12_X,
          handler: 'index.handler'
        },
        topicProps: {
            topicName: "custom-topic"
        }
    };

    new LambdaToSns(stack, 'test-sns-lambda', props);

    expectCDK(stack).to(haveResource("AWS::SNS::Topic", {
      TopicName: "custom-topic"
    }));
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
});