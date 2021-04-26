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
import { Secret } from '@aws-cdk/aws-secretsmanager';
import * as ec2 from "@aws-cdk/aws-ec2";
import { LambdaToSecretsmanager } from '../lib';
import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';

// --------------------------------------------------------------
// Test minimal deployment with new Lambda function
// --------------------------------------------------------------
test('Test minimal deployment with new Lambda function', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToSecretsmanager(stack, 'lambda-to-secretsmanager-stack', {
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
// Test the getter methods
// --------------------------------------------------------------
test('Test the properties', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const pattern = new LambdaToSecretsmanager(stack, 'lambda-to-secretsmanager-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    }
  });
  // Assertion 1
  const func = pattern.lambdaFunction;
  expect(func).toBeDefined();
  // Assertion 2
  const secret = pattern.secret;
  expect(secret).toBeDefined();
});

// --------------------------------------------------------------
// Test deployment w/ existing secret
// --------------------------------------------------------------
test('Test deployment w/ existing secret', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const secret = new Secret(stack, 'secret', {});
  new LambdaToSecretsmanager(stack, 'lambda-to-secretsmanager-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    existingSecretObj: secret
  });
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test minimal deployment that deploys a VPC without vpcProps
// --------------------------------------------------------------
test("Test minimal deployment that deploys a VPC without vpcProps", () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToSecretsmanager(stack, "lambda-to-secretsmanager-stack", {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    deployVpc: true,
  });

  expect(stack).toHaveResource("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "lambdatosecretsmanagerstackReplaceDefaultSecurityGroupsecuritygroupED420155",
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

  expect(stack).toHaveResource("AWS::EC2::VPC", {
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });

  expect(stack).toHaveResource("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Interface",
  });

  expect(stack).toCountResources("AWS::EC2::Subnet", 2);
  expect(stack).toCountResources("AWS::EC2::InternetGateway", 0);
});

// --------------------------------------------------------------
// Test minimal deployment that deploys a VPC w/vpcProps
// --------------------------------------------------------------
test("Test minimal deployment that deploys a VPC w/vpcProps", () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToSecretsmanager(stack, "lambda-to-secretsmanager-stack", {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    vpcProps: {
      enableDnsHostnames: false,
      enableDnsSupport: false,
      cidr: "192.68.0.0/16",
    },
    deployVpc: true,
  });

  expect(stack).toHaveResource("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "lambdatosecretsmanagerstackReplaceDefaultSecurityGroupsecuritygroupED420155",
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

  expect(stack).toHaveResource("AWS::EC2::VPC", {
    CidrBlock: "192.68.0.0/16",
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });

  expect(stack).toHaveResource("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Interface",
  });

  expect(stack).toCountResources("AWS::EC2::Subnet", 2);
  expect(stack).toCountResources("AWS::EC2::InternetGateway", 0);
});

// --------------------------------------------------------------
// Test minimal deployment with an existing VPC
// --------------------------------------------------------------
test("Test minimal deployment with an existing VPC", () => {
  // Stack
  const stack = new Stack();

  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  // Helper declaration
  new LambdaToSecretsmanager(stack, "lambda-to-secretsmanager-stack", {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    existingVpc: testVpc,
  });

  expect(stack).toHaveResource("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "lambdatosecretsmanagerstackReplaceDefaultSecurityGroupsecuritygroupED420155",
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

  expect(stack).toHaveResource("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Interface",
  });
});

// --------------------------------------------------------------
// Test minimal deployment with an existing VPC and existing Lambda function not in a VPCs
//
// buildLambdaFunction should throw an error if the Lambda function is not
// attached to a VPC
// --------------------------------------------------------------
test("Test minimal deployment with an existing VPC and existing Lambda function not in a VPC", () => {
  // Stack
  const stack = new Stack();

  const testLambdaFunction = new lambda.Function(stack, 'test-lamba', {
    runtime: lambda.Runtime.NODEJS_10_X,
    handler: "index.handler",
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  // Helper declaration
  const app = () => {
    // Helper declaration
    new LambdaToSecretsmanager(stack, "lambda-to-secretsmanager-stack", {
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
    new LambdaToSecretsmanager(stack, "lambda-to-secretsmanager-stack", {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_10_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      },
      existingVpc: testVpc,
      deployVpc: true,
    });
  };
  // Assertion
  expect(app).toThrowError();
});

// --------------------------------------------------------------
// Test lambda function custom environment variable
// --------------------------------------------------------------
test('Test lambda function custom environment variable', () => {
  // Stack
  const stack = new Stack();

  // Helper declaration
  new LambdaToSecretsmanager(stack, 'lambda-to-secretsmanager-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      }
    },
    secretEnvironmentVariableName: 'CUSTOM_SECRET_NAME'
  });

  // Assertion
  expect(stack).toHaveResource('AWS::Lambda::Function', {
    Handler: 'index.handler',
    Runtime: 'nodejs14.x',
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        CUSTOM_SECRET_NAME: {
          'Fn::Select': [
            6,
            {
              'Fn::Split': [
                ':',
                {
                  Ref: 'lambdatosecretsmanagerstacksecretBA684E34'
                }
              ]
            }
          ],
        }
      }
    }
  });
});
