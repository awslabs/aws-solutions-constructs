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
import { Stack } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { LambdaToSsmstringparameter } from '../lib';
import '@aws-cdk/assert/jest';
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import * as defaults from "@aws-solutions-constructs/core";

// --------------------------------------------------------------
// Test lambda function custom environment variable
// --------------------------------------------------------------
test('Test lambda function custom environment variable', () => {
  // Stack
  const stack = new Stack();

  // Helper declaration
  new LambdaToSsmstringparameter(stack, 'lambda-to-ssm-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      }
    },
    stringParameterProps: { stringValue: "test-string-value" },
    stringParameterEnvironmentVariableName: 'CUSTOM_SSM_PARAMETER_NAME'
  });

  // Assertion
  expect(stack).toHaveResource('AWS::Lambda::Function', {
    Handler: 'index.handler',
    Runtime: 'nodejs14.x',
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        CUSTOM_SSM_PARAMETER_NAME: {
          Ref: 'lambdatossmstackstringParameterA6E27D57'
        }
      }
    }
  });
});

// --------------------------------------------------------------
// Test the getter methods
// --------------------------------------------------------------
test('Test the properties', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const pattern = new LambdaToSsmstringparameter(stack, 'lambda-to-ssm-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    stringParameterProps: { stringValue: "test-string-value" },
  });
  // Assertion 1
  const func = pattern.lambdaFunction;
  expect(func).toBeDefined();
  // Assertion 2
  const stringParam = pattern.stringParameter;
  expect(stringParam).toBeDefined();
});

// --------------------------------------------------------------
// Test deployment w/ existing String Parameter
// --------------------------------------------------------------
test('Test deployment w/ existing String Parameter', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const existingStringParam = new StringParameter(stack, 'myNewStringParameter', {stringValue: "test-string-value" });
  const pattern = new LambdaToSsmstringparameter(stack, 'lambda-to-ssm-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    existingStringParameterObj: existingStringParam
  });
  // Assertion 1
  expect(stack).toHaveResource("AWS::SSM::Parameter", {
    Type: "String",
    Value: "test-string-value"
  });

  // Assertion 2
  expect(pattern.stringParameter).toBe(existingStringParam);
});

// --------------------------------------------------------------
// Test deployment w/ existing function
// --------------------------------------------------------------
test('Test deployment w/ existing function', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const lambdaFunctionProps = {
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`)
  };
  const existingFunction = defaults.deployLambdaFunction(stack, lambdaFunctionProps);

  const pattern = new LambdaToSsmstringparameter(stack, 'lambda-to-ssm-stack', {
    existingLambdaObj: existingFunction,
    stringParameterProps: { stringValue: "test-string-value" },
  });
  // Assertion 1
  expect(stack).toHaveResource("AWS::SSM::Parameter", {
    Type: "String",
    Value: "test-string-value"
  });
  // Assertion 2
  expect(pattern.lambdaFunction).toBe(existingFunction);
});

// --------------------------------------------------------------
// Test minimal deployment with write access to String Parameter.
// --------------------------------------------------------------
test('Test minimal deployment write access to String Parameter ', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToSsmstringparameter(stack, 'lambda-to-ssm-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    stringParameterProps: { stringValue: "test-string-value" },
    stringParameterPermissions: 'ReadWrite'
  });
  // Assertion 1
  expect(stack).toHaveResource("AWS::SSM::Parameter", {
    Type: "String",
    Value: "test-string-value"
  });

});

// --------------------------------------------------------------
// Test minimal deployment that deploys a VPC without vpcProps
// --------------------------------------------------------------
test("Test minimal deployment that deploys a VPC without vpcProps", () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToSsmstringparameter(stack, 'lambda-to-ssm-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    stringParameterProps: { stringValue: "test-string-value" },
    deployVpc: true,
  });

  expect(stack).toHaveResource("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "lambdatossmstackReplaceDefaultSecurityGroupsecuritygroupD1E88D13",
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
  new LambdaToSsmstringparameter(stack, 'lambda-to-ssm-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    stringParameterProps: { stringValue: "test-string-value" },
    vpcProps: {
      enableDnsHostnames: false,
      enableDnsSupport: false,
      ipAddresses: ec2.IpAddresses.cidr("192.68.0.0/16"),
    },
    deployVpc: true,
  });

  expect(stack).toHaveResource("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "lambdatossmstackReplaceDefaultSecurityGroupsecuritygroupD1E88D13",
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
  new LambdaToSsmstringparameter(stack, 'lambda-to-ssm-stack', {
    lambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    stringParameterProps: { stringValue: "test-string-value" },
    existingVpc: testVpc,
  });

  expect(stack).toHaveResource("AWS::Lambda::Function", {
    VpcConfig: {
      SecurityGroupIds: [
        {
          "Fn::GetAtt": [
            "lambdatossmstackReplaceDefaultSecurityGroupsecuritygroupD1E88D13",
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
    new LambdaToSsmstringparameter(stack, "lambda-to-ssm-stack", {
      existingLambdaObj: testLambdaFunction,
      existingVpc: testVpc,
      stringParameterProps: { stringValue: "test-string-value" }
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
    new LambdaToSsmstringparameter(stack, "lambda-to-ssm-stack", {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      },
      stringParameterProps: { stringValue: "test-string-value" },
      existingVpc: testVpc,
      deployVpc: true,
    });
  };
  // Assertion
  expect(app).toThrowError();
});

test("Test bad call with invalid string parameter permission", () => {
  // Stack
  const stack = new Stack();

  const app = () => {
    // Helper declaration
    new LambdaToSsmstringparameter(stack, "lambda-to-ssm-stack", {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      },
      stringParameterProps: { stringValue: "test-string-value" },
      deployVpc: true,
      stringParameterPermissions: 'Reed',
    });
  };
  // Assertion
  expect(app).toThrowError('Invalid String Parameter permission submitted - Reed');
});
