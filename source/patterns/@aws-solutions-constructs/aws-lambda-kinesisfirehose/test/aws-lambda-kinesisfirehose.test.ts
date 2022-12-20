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

// Imports
import '@aws-cdk/assert/jest';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { KinesisFirehoseToS3 } from '@aws-solutions-constructs/aws-kinesisfirehose-s3';
import { LambdaToKinesisFirehose } from '../lib';
import * as defaults from '@aws-solutions-constructs/core';

test('Test that properties are set correctly', () => {
  // Stack
  const stack = new cdk.Stack();
  const destination = GetTestDestination(stack, 'test-destination');

  const construct = new LambdaToKinesisFirehose(stack, 'test-target', {
    existingKinesisFirehose: destination.kinesisFirehose,
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    }
  });

  expect(construct.kinesisFirehose).toBeDefined();
  expect(construct.lambdaFunction).toBeDefined();
  expect(construct.vpc).not.toBeDefined();
});

test('Test existing function is utilzed correctly', () => {
  // Stack
  const stack = new cdk.Stack();
  const destination = GetTestDestination(stack, 'test-destination');
  const testName = 'test-name';
  const existingFunction = new lambda.Function(stack, 'test-function', {
    runtime: lambda.Runtime.NODEJS_18_X,
    handler: "index.handler",
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    functionName: testName
  });

  new LambdaToKinesisFirehose(stack, 'test-target', {
    existingKinesisFirehose: destination.kinesisFirehose,
    existingLambdaObj: existingFunction
  });

  expect(stack).toHaveResource('AWS::Lambda::Function', {
    FunctionName: testName
  });

  // This is 2 because there's a lambda function in the custom resource to
  // delete all the objects when cleaning up the s3 bucket in kinesisfirehose-s3
  expect(stack).toCountResources('AWS::Lambda::Function', 2);
});

test('Test that lambda function props are incorporated', () => {
  // Stack
  const stack = new cdk.Stack();
  const destination = GetTestDestination(stack, 'test-destination');
  const testName = 'test-name';

  new LambdaToKinesisFirehose(stack, 'test-target', {
    existingKinesisFirehose: destination.kinesisFirehose,
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      functionName: testName
    }
  });

  expect(stack).toHaveResource('AWS::Lambda::Function', {
    FunctionName: testName
  });
});

test('Test that new VPC is created', () => {
  // Stack
  const stack = new cdk.Stack();
  const cidrRange = '172.0.0.0/16';

  const destination = GetTestDestination(stack, 'test-destination');

  const construct = new LambdaToKinesisFirehose(stack, 'test-target', {
    existingKinesisFirehose: destination.kinesisFirehose,
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    deployVpc: true,
    vpcProps: {
      cidr: cidrRange
    }
  });

  expect(construct.vpc !== null);

  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: cidrRange
  });

  expect(stack).toHaveResource("AWS::EC2::VPCEndpoint", {
    ServiceName: {
      "Fn::Join": [
        "",
        [
          "com.amazonaws.",
          {
            Ref: "AWS::Region"
          },
          ".kinesis-firehose"
        ]
      ]
    },
  });
});

test('Test that existing VPC is used', () => {
  // Stack
  const stack = new cdk.Stack();
  const cidrInGetTestVpc = '172.168.0.0/16';

  const destination = GetTestDestination(stack, 'test-destination');
  const myVpc = defaults.getTestVpc(stack, false);
  const construct = new LambdaToKinesisFirehose(stack, 'test-target', {
    existingKinesisFirehose: destination.kinesisFirehose,
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    existingVpc: myVpc
  });

  expect(construct.vpc !== null);

  // Make sure we didn't deploy a new one anyway
  expect(stack).toCountResources("AWS::EC2::VPC", 1);

  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: cidrInGetTestVpc
  });

  expect(stack).toHaveResource("AWS::EC2::VPCEndpoint", {
    ServiceName: {
      "Fn::Join": [
        "",
        [
          "com.amazonaws.",
          {
            Ref: "AWS::Region"
          },
          ".kinesis-firehose"
        ]
      ]
    },
  });
});

test('Test fail if existingFirehose does not have a stream name', () => {
  // Stack
  const stack = new cdk.Stack();
  const destination = GetTestDestination(stack, 'test-destination');
  const testName = 'test-name';

  const mutatedFirehose = defaults.overrideProps(destination.kinesisFirehose, {});
  mutatedFirehose.deliveryStreamName = undefined;

  const app = () => {
    new LambdaToKinesisFirehose(stack, 'test-target', {
      existingKinesisFirehose: mutatedFirehose,
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
        functionName: testName
      }
    });
  };

  expect(app).toThrowError(/existingKinesisFirehose must have a defined deliveryStreamName/);
});

function GetTestDestination(scope: Construct, id: string): KinesisFirehoseToS3 {
  return new KinesisFirehoseToS3(scope, id, {
    bucketProps: {
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    },
    loggingBucketProps: {
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    }
  });
}