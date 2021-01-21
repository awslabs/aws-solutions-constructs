/**
 *  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import { SynthUtils } from '@aws-cdk/assert';
import { S3ToLambda, S3ToLambdaProps } from "../lib";
import * as lambda from '@aws-cdk/aws-lambda';
import * as cdk from "@aws-cdk/core";
import '@aws-cdk/assert/jest';

function deployNewFunc(stack: cdk.Stack) {
  const props: S3ToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler'
    },
  };

  return new S3ToLambda(stack, 'test-s3-lambda', props);
}

test('snapshot test S3ToLambda default params', () => {
  const stack = new cdk.Stack();
  deployNewFunc(stack);
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('check properties', () => {
  const stack = new cdk.Stack();

  const construct: S3ToLambda = deployNewFunc(stack);

  expect(construct.lambdaFunction !== null);
  expect(construct.s3Bucket !== null);
  expect(construct.s3LoggingBucket !== null);
});

test('snapshot test S3ToLambda with versioning turned off', () => {
  const stack = new cdk.Stack();

  const props: S3ToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler'
    },
    bucketProps: {
      versioned: false
    }
  };

  new S3ToLambda(stack, 'test-s3-lambda', props);
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});