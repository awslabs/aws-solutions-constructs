/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from "aws-cdk-lib";
import { Template } from 'aws-cdk-lib/assertions';
import { CreateScrapBucket } from '@aws-solutions-constructs/core';
import * as defaults from '@aws-solutions-constructs/core';

function deployNewFunc(stack: cdk.Stack) {
  const props: S3ToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
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

  expect(construct.lambdaFunction).toBeDefined();
  expect(construct.s3Bucket).toBeDefined();
  expect(construct.s3LoggingBucket).toBeDefined();
});

test("Confirm CheckS3Props is being called", () => {
  // Stack
  const stack = new cdk.Stack();

  const testBucket = new s3.Bucket(stack, 'test-bucket', {});

  const app = () => {
    // Helper declaration
    new S3ToLambda(stack, "bad-s3-args", {
      lambdaFunctionProps: {
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
        runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        handler: 'index.handler'
      },
      existingBucketObj: testBucket,
      bucketProps: {
        removalPolicy: cdk.RemovalPolicy.DESTROY
      },
    });
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide bucketProps or existingBucketObj, but not both.\n');
});

test('s3 bucket with bucket, loggingBucket, and auto delete objects', () => {
  const stack = new cdk.Stack();

  new S3ToLambda(stack, 's3-lambda', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
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

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::S3::Bucket", 2);

  template.hasResourceProperties("Custom::S3AutoDeleteObjects", {
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

test('s3 bucket with one content bucket and no logging bucket', () => {
  const stack = new cdk.Stack();

  new S3ToLambda(stack, 's3-lambda', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    bucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    },
    logS3AccessLogs: false
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::S3::Bucket", 1);
});

test('check properties with existing S3 bucket', () => {
  const stack = new cdk.Stack();
  const existingBucket = CreateScrapBucket(stack, "scrapBucket");
  const construct = new S3ToLambda(stack, 's3-lambda', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    existingBucketObj: existingBucket
  });

  expect(construct.s3Bucket).toEqual(undefined);
  expect(construct.s3BucketInterface).not.toEqual(undefined);
  expect(construct.s3LoggingBucket).toEqual(undefined);
});

test('Confirm call to CheckLambdaProps', () => {
  // Initial Setup
  const stack = new cdk.Stack();
  const lambdaFunction = new lambda.Function(stack, 'a-function', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  const props: S3ToLambdaProps = {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    existingLambdaObj: lambdaFunction,
  };
  const app = () => {
    new S3ToLambda(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n');
});
