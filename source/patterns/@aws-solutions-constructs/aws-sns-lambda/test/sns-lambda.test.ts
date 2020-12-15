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

import { SynthUtils, expect as expectCDK, haveResource } from '@aws-cdk/assert';
import { SnsToLambda, SnsToLambdaProps } from "../lib";
import * as lambda from '@aws-cdk/aws-lambda';
import * as sns from '@aws-cdk/aws-sns';
import * as cdk from "@aws-cdk/core";
import '@aws-cdk/assert/jest';

function deployNewFunc(stack: cdk.Stack) {
  const props: SnsToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler'
    },
  };

  return new SnsToLambda(stack, 'test-sns-lambda', props);
}

test('snapshot test SnsToLambda default params', () => {
  const stack = new cdk.Stack();
  deployNewFunc(stack);
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('check properties', () => {
  const stack = new cdk.Stack();

  const construct: SnsToLambda = deployNewFunc(stack);

  expect(construct.lambdaFunction !== null);
  expect(construct.snsTopic !== null);
});

test('override topicProps', () => {
  const stack = new cdk.Stack();

  const props: SnsToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler'
    },
    topicProps: {
      topicName: "custom-topic"
    }
  };

  new SnsToLambda(stack, 'test-sns-lambda', props);

  expectCDK(stack).to(haveResource("AWS::SNS::Topic", {
    TopicName: "custom-topic"
  }));
});

test('provide existingTopicObj', () => {
  const stack = new cdk.Stack();

  const topic = new sns.Topic(stack, 'MyTopic', {
    topicName: "custom-topic"
  });

  const props: SnsToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler'
    },
    existingTopicObj: topic
  };

  new SnsToLambda(stack, 'test-sns-lambda', props);

  expectCDK(stack).to(haveResource("AWS::SNS::Topic", {
    TopicName: "custom-topic"
  }));
});