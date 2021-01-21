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

// Imports
import { Stack } from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import { LambdaToS3 } from '../lib';
import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';

// --------------------------------------------------------------
// Test minimal deployment with new Lambda function
// --------------------------------------------------------------
test('Test minimal deployment with new Lambda function', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToS3(stack, 'lambda-to-s3-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    }
  });
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test deployment w/ s3:Delete only
// --------------------------------------------------------------
test('Test deployment w/ s3:Delete only', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToS3(stack, 'lambda-to-s3-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    bucketPermissions: ['Delete']
  });
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test deployment w/ s3:Put only
// --------------------------------------------------------------
test('Test deployment w/ s3:Put only', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToS3(stack, 'lambda-to-s3-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    bucketPermissions: ['Put']
  });
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test deployment w/ s3:Read only
// --------------------------------------------------------------
test('Test deployment w/ s3:Read only', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToS3(stack, 'lambda-to-s3-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    bucketPermissions: ['Read']
  });
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test deployment w/ s3:ReadWrite only
// --------------------------------------------------------------
test('Test deployment w/ s3:ReadWrite only', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToS3(stack, 'lambda-to-s3-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    bucketPermissions: ['ReadWrite']
  });
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test deployment w/ s3:Write only
// --------------------------------------------------------------
test('Test deployment w/ s3:Write only', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToS3(stack, 'lambda-to-s3-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    bucketPermissions: ['Write']
  });
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test deployment w/ s3 multiple permissions
// --------------------------------------------------------------
test('Test deployment w/ s3 multiple permissions', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToS3(stack, 'lambda-to-s3-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    bucketPermissions: ['Write', 'Delete']
  });
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test the getter methods
// --------------------------------------------------------------
test('Test the properties', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const pattern = new LambdaToS3(stack, 'lambda-to-s3-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    bucketPermissions: ['Write']
  });
    // Assertion 1
  const func = pattern.lambdaFunction;
  expect(func !== null);
  // Assertion 2
  const bucket = pattern.s3Bucket;
  expect(bucket !== null);
  expect(pattern.s3LoggingBucket !== null);
});

// --------------------------------------------------------------
// Test the bucketProps override
// --------------------------------------------------------------
test('Test the bucketProps override', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToS3(stack, 'lambda-to-s3-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    bucketProps: {
      websiteIndexDocument: 'index.main.html'
    }
  });
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  // Assertion 2
  expect(stack).toHaveResource("AWS::S3::Bucket", {
    WebsiteConfiguration: {
      IndexDocument: 'index.main.html'
    }
  });
});