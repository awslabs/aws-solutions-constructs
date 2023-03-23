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

// Imports
import { Stack, RemovalPolicy } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as s3 from "aws-cdk-lib/aws-s3";
import { LambdaToS3 } from '../lib';
import { CreateScrapBucket } from '@aws-solutions-constructs/core';
import { Template } from 'aws-cdk-lib/assertions';

// --------------------------------------------------------------
// Test the getter methods
// --------------------------------------------------------------
test('Test the properties', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const pattern = new LambdaToS3(stack, 'lambda-to-s3-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    bucketPermissions: ['Write', 'Delete', 'Put', 'Read', 'ReadWrite']
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
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    bucketProps: {
      websiteIndexDocument: 'index.main.html'
    }
  });
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::S3::Bucket", {
    WebsiteConfiguration: {
      IndexDocument: 'index.main.html'
    }
  });
});

// --------------------------------------------------------------
// Test minimal deployment that deploys a VPC without vpcProps
// --------------------------------------------------------------
test("Test minimal deployment that deploys a VPC without vpcProps", () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToS3(stack, "lambda-to-s3-stack", {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    deployVpc: true,
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "lambdatos3stackReplaceDefaultSecurityGroupsecuritygroupDCA33AE3",
            "GroupId",
          ],
        },
      ],
      SubnetIds: [
        {
          Ref: "VpcisolatedSubnet1SubnetE62B1B9B",
        },
        {
          Ref: "VpcisolatedSubnet2Subnet39217055",
        },
      ],
    },
  });

  template.hasResourceProperties("AWS::EC2::VPC", {
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });

  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Gateway",
  });

  template.resourceCountIs("AWS::EC2::Subnet", 2);
  template.resourceCountIs("AWS::EC2::InternetGateway", 0);
});

// --------------------------------------------------------------
// Test minimal deployment that deploys a VPC w/vpcProps
// --------------------------------------------------------------
test("Test minimal deployment that deploys a VPC w/vpcProps", () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToS3(stack, "lambda-to-s3-stack", {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    vpcProps: {
      enableDnsHostnames: false,
      enableDnsSupport: false,
      ipAddresses: ec2.IpAddresses.cidr("192.68.0.0/16"),
    },
    deployVpc: true,
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "lambdatos3stackReplaceDefaultSecurityGroupsecuritygroupDCA33AE3",
            "GroupId",
          ],
        },
      ],
      SubnetIds: [
        {
          Ref: "VpcisolatedSubnet1SubnetE62B1B9B",
        },
        {
          Ref: "VpcisolatedSubnet2Subnet39217055",
        },
      ],
    },
  });

  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: "192.68.0.0/16",
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });

  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Gateway",
  });

  template.resourceCountIs("AWS::EC2::Subnet", 2);
  template.resourceCountIs("AWS::EC2::InternetGateway", 0);
});

// --------------------------------------------------------------
// Test minimal deployment with an existing VPC
// --------------------------------------------------------------
test("Test minimal deployment with an existing VPC", () => {
  // Stack
  const stack = new Stack();

  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  // Helper declaration
  new LambdaToS3(stack, "lambda-to-s3-stack", {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    existingVpc: testVpc,
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "lambdatos3stackReplaceDefaultSecurityGroupsecuritygroupDCA33AE3",
            "GroupId",
          ],
        },
      ],
      SubnetIds: [
        {
          Ref: "testvpcPrivateSubnet1Subnet865FB50A",
        },
        {
          Ref: "testvpcPrivateSubnet2Subnet23D3396F",
        },
      ],
    },
  });

  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Gateway",
  });
});

// --------------------------------------------------------------
// Test minimal deployment with an existing VPC and existing Lambda function not in a VPC
//
// buildLambdaFunction should throw an error if the Lambda function is not
// attached to a VPC
// --------------------------------------------------------------
test("Test minimal deployment with an existing VPC and existing Lambda function not in a VPC", () => {
  // Stack
  const stack = new Stack();

  const testLambdaFunction = new lambda.Function(stack, 'test-lamba', {
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: "index.handler",
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  // Helper declaration
  const app = () => {
    // Helper declaration
    new LambdaToS3(stack, "lambda-to-s3-stack", {
      existingLambdaObj: testLambdaFunction,
      existingVpc: testVpc,
    });
  };

  // Assertion
  expect(app).toThrowError();

});

// --------------------------------------------------------------
// Test bad call with existingVpc and deployVpc
// --------------------------------------------------------------
test("Test bad call with existingVpc and deployVpc", () => {
  // Stack
  const stack = new Stack();

  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  const app = () => {
    // Helper declaration
    new LambdaToS3(stack, "lambda-to-s3-stack", {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      },
      existingVpc: testVpc,
      deployVpc: true,
    });
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide an existingVpc or some combination of deployVpc and vpcProps, but not both.\n');
});

// --------------------------------------------------------------
// Test lambda function custom environment variable
// --------------------------------------------------------------
test('Test lambda function custom environment variable', () => {
  // Stack
  const stack = new Stack();

  // Helper declaration
  const existingBucket = CreateScrapBucket(stack, {});
  const mybucket: s3.IBucket = s3.Bucket.fromBucketName(stack, 'mybucket', existingBucket.bucketName);
  new LambdaToS3(stack, 'lambda-to-s3-stack', {
    existingBucketObj: mybucket,
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    bucketEnvironmentVariableName: 'CUSTOM_BUCKET_NAME'
  });

  // Assertion
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Handler: 'index.handler',
    Runtime: 'nodejs14.x',
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        CUSTOM_BUCKET_NAME: {
          Ref: 'existingScriptLocation845F3C51'
        }
      }
    }
  });
});

// --------------------------------------------------------------
// Test bad call with existingBucket and bucketProps
// --------------------------------------------------------------
test("Test bad call with existingBucket and bucketProps", () => {
  // Stack
  const stack = new Stack();

  const testBucket = new s3.Bucket(stack, 'test-bucket', {});

  const app = () => {
    // Helper declaration
    new LambdaToS3(stack, "bad-s3-args", {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      },
      existingBucketObj: testBucket,
      bucketProps: {
        removalPolicy: RemovalPolicy.DESTROY
      },
    });
  };
  // Assertion
  expect(app).toThrowError();
});

test('Test that CheckProps() is flagging errors correctly', () => {
  // Stack
  const stack = new Stack();

  const testLambdaFunction = new lambda.Function(stack, 'test-lamba', {
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: "index.handler",
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  const app = () => {
    new LambdaToS3(stack, "lambda-to-s3-stack", {
      existingLambdaObj: testLambdaFunction,
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      },
    });
  };

  // Assertion
  expect(app).toThrowError(
    'Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n'
  );

});

// --------------------------------------------------------------
// s3 bucket with bucket, loggingBucket, and auto delete objects
// --------------------------------------------------------------
test('s3 bucket with bucket, loggingBucket, and auto delete objects', () => {
  const stack = new Stack();

  new LambdaToS3(stack, 'lambda-s3', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
    bucketProps: {
      removalPolicy: RemovalPolicy.DESTROY,
    },
    loggingBucketProps: {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::S3::Bucket", {
    AccessControl: "LogDeliveryWrite"
  });

  template.hasResourceProperties("Custom::S3AutoDeleteObjects", {
    ServiceToken: {
      "Fn::GetAtt": [
        "CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F",
        "Arn"
      ]
    },
    BucketName: {
      Ref: "lambdas3S3LoggingBucket498F3BDD"
    }
  });
});

// --------------------------------------------------------------
// s3 bucket with one content bucket and no logging bucket
// --------------------------------------------------------------
test('s3 bucket with one content bucket and no logging bucket', () => {
  const stack = new Stack();

  new LambdaToS3(stack, 'lambda-s3', {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
    bucketProps: {
      removalPolicy: RemovalPolicy.DESTROY,
    },
    logS3AccessLogs: false
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::S3::Bucket", 1);
});

test('Test bad bucket permission', () => {
  const stack = new Stack();

  const props = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
    bucketProps: {
      removalPolicy: RemovalPolicy.DESTROY,
    },
    logS3AccessLogs: false,
    bucketPermissions: ['Reed']
  };

  const alb = () => {
    new LambdaToS3(stack, 'lambda-s3', props);
  };

  expect(alb).toThrowError('Invalid bucket permission submitted - Reed');
});
