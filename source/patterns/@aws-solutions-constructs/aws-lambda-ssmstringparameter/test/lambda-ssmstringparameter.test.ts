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
import { LambdaToSsmstringparameter, LambdaToSsmstringparameterProps } from '../lib';
import { Template } from 'aws-cdk-lib/assertions';
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import * as defaults from "@aws-solutions-constructs/core";

test('Test lambda function custom environment variable', () => {
  // Stack
  const stack = new Stack();

  // Helper declaration
  new LambdaToSsmstringparameter(stack, 'lambda-to-ssm-stack', {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
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
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Handler: 'index.handler',
    Runtime:  defaults.COMMERCIAL_REGION_LAMBDA_NODE_STRING,
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

test('Test the properties', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const pattern = new LambdaToSsmstringparameter(stack, 'lambda-to-ssm-stack', {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
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

test('Test deployment w/ existing String Parameter', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const existingStringParam = new StringParameter(stack, 'myNewStringParameter', {stringValue: "test-string-value" });
  const pattern = new LambdaToSsmstringparameter(stack, 'lambda-to-ssm-stack', {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    existingStringParameterObj: existingStringParam
  });
  // Assertion 1
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SSM::Parameter", {
    Type: "String",
    Value: "test-string-value"
  });

  // Assertion 2
  expect(pattern.stringParameter).toBe(existingStringParam);
});

test('Test deployment w/ existing function', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const lambdaFunctionProps = {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`)
  };
  const existingFunction = defaults.deployLambdaFunction(stack, lambdaFunctionProps);

  const pattern = new LambdaToSsmstringparameter(stack, 'lambda-to-ssm-stack', {
    existingLambdaObj: existingFunction,
    stringParameterProps: { stringValue: "test-string-value" },
  });
  // Assertion 1
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SSM::Parameter", {
    Type: "String",
    Value: "test-string-value"
  });
  // Assertion 2
  expect(pattern.lambdaFunction).toBe(existingFunction);
});

test('Test minimal deployment write access to String Parameter ', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToSsmstringparameter(stack, 'lambda-to-ssm-stack', {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    stringParameterProps: { stringValue: "test-string-value" },
    stringParameterPermissions: 'ReadWrite'
  });
  // Assertion 1
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SSM::Parameter", {
    Type: "String",
    Value: "test-string-value"
  });

});

test("Test minimal deployment that deploys a VPC without vpcProps", () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToSsmstringparameter(stack, 'lambda-to-ssm-stack', {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    stringParameterProps: { stringValue: "test-string-value" },
    deployVpc: true,
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
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

  template.hasResourceProperties("AWS::EC2::VPC", {
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });

  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Interface",
  });

  template.resourceCountIs("AWS::EC2::Subnet", 2);
  template.resourceCountIs("AWS::EC2::InternetGateway", 0);
});

test("Test minimal deployment that deploys a VPC w/vpcProps", () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToSsmstringparameter(stack, 'lambda-to-ssm-stack', {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
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

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
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

  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: "192.68.0.0/16",
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });

  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Interface",
  });

  template.resourceCountIs("AWS::EC2::Subnet", 2);
  template.resourceCountIs("AWS::EC2::InternetGateway", 0);
});

test("Test minimal deployment with an existing VPC", () => {
  // Stack
  const stack = new Stack();

  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  // Helper declaration
  new LambdaToSsmstringparameter(stack, 'lambda-to-ssm-stack', {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    stringParameterProps: { stringValue: "test-string-value" },
    existingVpc: testVpc,
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
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

  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Interface",
  });
});

test("Test minimal deployment with an existing VPC and existing Lambda function not in a VPC", () => {
  // Stack
  const stack = new Stack();

  const testLambdaFunction = new lambda.Function(stack, 'test-lamba', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: "index.handler",
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  // Helper declaration
  const app = () => {
    // buildLambdaFunction should throw an error if the Lambda function is not
    // attached to a VPC
    new LambdaToSsmstringparameter(stack, "lambda-to-ssm-stack", {
      existingLambdaObj: testLambdaFunction,
      existingVpc: testVpc,
      stringParameterProps: { stringValue: "test-string-value" }
    });
  };

  // Assertion
  expect(app).toThrowError();

});

test("Confirm that CheckVpcProps is called", () => {
  // Stack
  const stack = new Stack();

  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  const app = () => {
    // Helper declaration
    new LambdaToSsmstringparameter(stack, "lambda-to-ssm-stack", {
      lambdaFunctionProps: {
        runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        handler: "index.handler",
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      },
      stringParameterProps: { stringValue: "test-string-value" },
      existingVpc: testVpc,
      deployVpc: true,
    });
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide an existingVpc or some combination of deployVpc and vpcProps, but not both.\n');
});

test("Test bad call with invalid string parameter permission", () => {
  // Stack
  const stack = new Stack();

  const app = () => {
    // Helper declaration
    new LambdaToSsmstringparameter(stack, "lambda-to-ssm-stack", {
      lambdaFunctionProps: {
        runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
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

test('Confirm call to CheckLambdaProps', () => {
  // Initial Setup
  const stack = new Stack();
  const lambdaFunction = new lambda.Function(stack, 'a-function', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  const props: LambdaToSsmstringparameterProps = {
    stringParameterProps: { stringValue: "test-string-value" },
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    existingLambdaObj: lambdaFunction,
  };
  const app = () => {
    new LambdaToSsmstringparameter(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n');
});
