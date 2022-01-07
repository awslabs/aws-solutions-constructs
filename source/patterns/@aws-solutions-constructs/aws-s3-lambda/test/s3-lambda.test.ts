/**
 *  Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import { S3ToLambda, S3ToLambdaProps } from "../lib";
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import * as cdk from "@aws-cdk/core";
import '@aws-cdk/assert/jest';
import { CreateScrapBucket } from '@aws-solutions-constructs/core';

function deployNewFunc(stack: cdk.Stack) {
  const props: S3ToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
    bucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    }
  };

  return new S3ToLambda(stack, 'test-s3-lambda', props);
}

test('check properties', () => {
  const stack = new cdk.Stack();

  const construct: S3ToLambda = deployNewFunc(stack);

  expect(construct.lambdaFunction !== null);
  expect(construct.s3Bucket !== null);
  expect(construct.s3LoggingBucket !== null);
});

// --------------------------------------------------------------
// Test bad call with existingBucket and bucketProps
// --------------------------------------------------------------
test("Test bad call with existingBucket and bucketProps", () => {
  // Stack
  const stack = new cdk.Stack();

  const testBucket = new s3.Bucket(stack, 'test-bucket', {});

  const app = () => {
    // Helper declaration
    new S3ToLambda(stack, "bad-s3-args", {
      existingBucketObj: testBucket,
      bucketProps: {
        removalPolicy: cdk.RemovalPolicy.DESTROY
      },
    });
  };
  // Assertion
  expect(app).toThrowError();
});

// --------------------------------------------------------------
// s3 bucket with bucket, loggingBucket, and auto delete objects
// --------------------------------------------------------------
test('s3 bucket with bucket, loggingBucket, and auto delete objects', () => {
  const stack = new cdk.Stack();

  new S3ToLambda(stack, 's3-lambda', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
    bucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    },
    loggingBucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    }
  });

  expect(stack).toHaveResource("AWS::S3::Bucket", {
    AccessControl: "LogDeliveryWrite"
  });

  expect(stack).toHaveResource("Custom::S3AutoDeleteObjects", {
    ServiceToken: {
      "Fn::GetAtt": [
        "CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F",
        "Arn"
      ]
    },
    BucketName: {
      Ref: "s3lambdaS3LoggingBucketAC6FF14E"
    }
  });
});

// --------------------------------------------------------------
// s3 bucket with one content bucket and no logging bucket
// --------------------------------------------------------------
test('s3 bucket with one content bucket and no logging bucket', () => {
  const stack = new cdk.Stack();

  new S3ToLambda(stack, 's3-lambda', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
    bucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    },
    logS3AccessLogs: false
  });

  expect(stack).toCountResources("AWS::S3::Bucket", 1);
});

test('check properties with existing S3 bucket', () => {
  const stack = new cdk.Stack();
  const existingBucket = CreateScrapBucket(stack, {});
  const construct = new S3ToLambda(stack, 's3-lambda', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
    existingBucketObj: existingBucket
  });

  expect(construct.s3Bucket).toEqual(undefined);
  expect(construct.s3BucketInterface).not.toEqual(undefined);
  expect(construct.s3LoggingBucket).toEqual(undefined);
});