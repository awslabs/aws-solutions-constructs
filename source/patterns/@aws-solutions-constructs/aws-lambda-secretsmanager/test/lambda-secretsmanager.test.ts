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
import { RemovalPolicy, Stack } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as secrets from 'aws-cdk-lib/aws-secretsmanager';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { LambdaToSecretsmanager, LambdaToSecretsmanagerProps } from '../lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as defaults from "@aws-solutions-constructs/core";

test('Test the properties', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const pattern = new LambdaToSecretsmanager(stack, 'lambda-to-secretsmanager-stack', {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    secretProps: { removalPolicy: RemovalPolicy.DESTROY },
  });
  // Assertion 1
  const func = pattern.lambdaFunction;
  expect(func).toBeDefined();
  // Assertion 2
  const secret = pattern.secret;
  expect(secret).toBeDefined();
});

test('Test deployment w/ existing secret', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const existingSecret = new secrets.Secret(stack, 'secret', {});
  const pattern = new LambdaToSecretsmanager(stack, 'lambda-to-secretsmanager-stack', {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    },
    existingSecretObj: existingSecret
  });
  // Assertion 1
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SecretsManager::Secret", {
    GenerateSecretString: {},
  });
  // Assertion 2
  expect(pattern.secret).toBe(existingSecret);
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

  const pattern = new LambdaToSecretsmanager(stack, 'lambda-to-secretsmanager-stack', {
    existingLambdaObj: existingFunction,
    secretProps: { removalPolicy: RemovalPolicy.DESTROY },
  });
  // Assertion 1
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SecretsManager::Secret", {
    GenerateSecretString: {},
  });
  // Assertion 2
  expect(pattern.lambdaFunction).toBe(existingFunction);
});

test('Test minimal deployment write access to Secret', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToSecretsmanager(stack, 'lambda-to-secretsmanager-stack', {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    secretProps: { removalPolicy: RemovalPolicy.DESTROY },
    grantWriteAccess: 'ReadWrite'
  });
  // Assertion 1
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SecretsManager::Secret", {
    GenerateSecretString: {},
  });

});

test("Test minimal deployment that deploys a VPC without vpcProps", () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new LambdaToSecretsmanager(stack, "lambda-to-secretsmanager-stack", {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    secretProps: { removalPolicy: RemovalPolicy.DESTROY },
    deployVpc: true,
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
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
  new LambdaToSecretsmanager(stack, "lambda-to-secretsmanager-stack", {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    secretProps: { removalPolicy: RemovalPolicy.DESTROY },
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
  new LambdaToSecretsmanager(stack, "lambda-to-secretsmanager-stack", {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    secretProps: { removalPolicy: RemovalPolicy.DESTROY },
    existingVpc: testVpc,
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
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

  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Interface",
  });
});

test("Check error when existing lambda function is not in VPC and construct is in VPC", () => {
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
    new LambdaToSecretsmanager(stack, "lambda-to-secretsmanager-stack", {
      existingLambdaObj: testLambdaFunction,
      existingVpc: testVpc,
      secretProps: { removalPolicy: RemovalPolicy.DESTROY },
    });
  };

  // Assertion
  expect(app).toThrowError();

});

test("Confirm CheckVpcProps is called", () => {
  // Stack
  const stack = new Stack();

  const testVpc = new ec2.Vpc(stack, "test-vpc", {});

  const app = () => {
    // Helper declaration
    new LambdaToSecretsmanager(stack, "lambda-to-secretsmanager-stack", {
      lambdaFunctionProps: {
        runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        handler: "index.handler",
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      },
      secretProps: { removalPolicy: RemovalPolicy.DESTROY },
      existingVpc: testVpc,
      deployVpc: true,
    });
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide an existingVpc or some combination of deployVpc and vpcProps, but not both.\n');
});

test('Test lambda function custom environment variable', () => {
  // Stack
  const stack = new Stack();

  // Helper declaration
  new LambdaToSecretsmanager(stack, 'lambda-to-secretsmanager-stack', {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      }
    },
    secretProps: { removalPolicy: RemovalPolicy.DESTROY },
    secretEnvironmentVariableName: 'CUSTOM_SECRET_NAME'
  });

  // Assertion
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Handler: 'index.handler',
    Runtime:  defaults.COMMERCIAL_REGION_LAMBDA_NODE_STRING,
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        CUSTOM_SECRET_NAME: {
          Ref: 'lambdatosecretsmanagerstacksecretBA684E34'
        }
      }
    }
  });
});

test('Test overriding secretProps to pass a customer provided CMK', () => {
  // Stack
  const stack = new Stack();

  const encryptionKey = defaults.buildEncryptionKey(stack, 'test', {
    description: 'secret-key'
  });

  // Helper declaration
  new LambdaToSecretsmanager(stack, 'lambda-to-secretsmanager-stack', {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      }
    },
    secretProps: {
      encryptionKey
    }
  });

  // Assertion 1
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Handler: 'index.handler',
    Runtime:  defaults.COMMERCIAL_REGION_LAMBDA_NODE_STRING,
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        SECRET_ARN: {
          Ref: 'lambdatosecretsmanagerstacksecretBA684E34'
        }
      }
    }
  });

  // Assertion 2
  template.hasResourceProperties("AWS::SecretsManager::Secret", {
    GenerateSecretString: {},
    KmsKeyId: {
      "Fn::GetAtt": [
        "testKey2C00E5E5",
        "Arn"
      ]
    }
  });

  // Assertion 3
  template.hasResourceProperties('AWS::KMS::Key', {
    Description: "secret-key",
    EnableKeyRotation: true
  });
});

test('Confirm call to CheckLambdaProps', () => {
  // Initial Setup
  const stack = new Stack();
  const lambdaFunction = new lambda.Function(stack, 'a-function', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  const props: LambdaToSecretsmanagerProps = {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    existingLambdaObj: lambdaFunction,
  };
  const app = () => {
    new LambdaToSecretsmanager(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n');
});

test('Confirm call to CheckSecretsManagerProps', () => {
  // Initial Setup
  const stack = new Stack();

  const props: LambdaToSecretsmanagerProps = {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    secretProps: {
      secretName: 'test'
    },
    existingSecretObj: new secrets.Secret(stack, 'test', {}),
  };
  const app = () => {
    new LambdaToSecretsmanager(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide secretProps or existingSecretObj, but not both.\n');
});
