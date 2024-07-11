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
import { Stack, Duration } from 'aws-cdk-lib';
import { LambdaToSagemakerEndpoint, LambdaToSagemakerEndpointProps } from '../lib';
import * as defaults from '@aws-solutions-constructs/core';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Template } from 'aws-cdk-lib/assertions';

// -----------------------------------------------------------------------------------------
// Pattern deployment with new Lambda function, new Sagemaker endpoint and deployVpc = true
// -----------------------------------------------------------------------------------------
test('Pattern deployment with new Lambda function, new Sagemaker endpoint, deployVpc = true', () => {
  // Initial Setup
  const stack = new Stack();
  const constructProps: LambdaToSagemakerEndpointProps = {
    modelProps: {
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
    lambdaFunctionProps: {
      runtime: lambda.Runtime.PYTHON_3_8,
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      handler: 'index.handler',
      timeout: Duration.minutes(5),
      memorySize: 128,
    },
    deployVpc: true,
  };
  new LambdaToSagemakerEndpoint(stack, 'test-lambda-sagemaker', constructProps);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Environment: {
      Variables: {
        SAGEMAKER_ENDPOINT_NAME: {
          'Fn::GetAtt': ['testlambdasagemakerSagemakerEndpoint12803730', 'EndpointName'],
        },
      },
    },
    VpcConfig: {
      SecurityGroupIds: [
        {
          'Fn::GetAtt': ['testlambdasagemakerReplaceDefaultSecurityGroupsecuritygroupB2FD7810', 'GroupId'],
        },
      ],
      SubnetIds: [
        {
          Ref: 'VpcisolatedSubnet1SubnetE62B1B9B',
        },
        {
          Ref: 'VpcisolatedSubnet2Subnet39217055',
        },
      ],
    },
  });
  // Assertion 3
  template.hasResourceProperties('AWS::SageMaker::Model', {
    ExecutionRoleArn: {
      'Fn::GetAtt': ['testlambdasagemakerSagemakerRoleD84546B8', 'Arn'],
    },
    PrimaryContainer: {
      Image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
      ModelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
    },
    VpcConfig: {
      SecurityGroupIds: [
        {
          'Fn::GetAtt': ['testlambdasagemakerReplaceModelDefaultSecurityGroup7284AA24', 'GroupId'],
        },
      ],
      Subnets: [
        {
          Ref: 'VpcisolatedSubnet1SubnetE62B1B9B',
        },
        {
          Ref: 'VpcisolatedSubnet2Subnet39217055',
        },
      ],
    },
  });

  // Assertion 4
  template.hasResourceProperties('AWS::SageMaker::EndpointConfig', {
    ProductionVariants: [
      {
        InitialInstanceCount: 1,
        InitialVariantWeight: 1,
        InstanceType: 'ml.m4.xlarge',
        ModelName: {
          'Fn::GetAtt': ['testlambdasagemakerSagemakerModelEC3E4E39', 'ModelName'],
        },
        VariantName: 'AllTraffic',
      },
    ],
    KmsKeyId: {
      Ref: 'testlambdasagemakertestlambdasagemakerKey5BF0746F',
    },
  });

  // Assertion 5
  template.hasResourceProperties('AWS::SageMaker::Endpoint', {
    EndpointConfigName: {
      'Fn::GetAtt': ['testlambdasagemakerSagemakerEndpointConfig6BABA334', 'EndpointConfigName'],
    },
  });
});

// ----------------------------------------------------------------------------------------------
// Pattern deployment with existing Lambda function, new Sagemaker endpoint and deployVpc = false
// ----------------------------------------------------------------------------------------------
test('Pattern deployment with existing Lambda function, new Sagemaker endpoint, deployVpc = false', () => {
  // Initial Setup
  const stack = new Stack();
  // deploy lambda function
  const fn = defaults.deployLambdaFunction(stack, {
    runtime: lambda.Runtime.PYTHON_3_8,
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    handler: 'index.handler',
    timeout: Duration.minutes(5),
    memorySize: 128,
  });

  const constructProps: LambdaToSagemakerEndpointProps = {
    modelProps: {
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
    existingLambdaObj: fn,
  };
  new LambdaToSagemakerEndpoint(stack, 'test-lambda-sagemaker', constructProps);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::SageMaker::Model', {
    ExecutionRoleArn: {
      'Fn::GetAtt': ['testlambdasagemakerSagemakerRoleD84546B8', 'Arn'],
    },
    PrimaryContainer: {
      Image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
      ModelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
    },
  });

  // Assertion 3
  template.hasResourceProperties('AWS::Lambda::Function', {
    Environment: {
      Variables: {
        SAGEMAKER_ENDPOINT_NAME: {
          'Fn::GetAtt': ['testlambdasagemakerSagemakerEndpoint12803730', 'EndpointName'],
        },
      },
    },
  });
});

// ------------------------------------------------------------------------------------------------------------------
// Pattern deployment with new Lambda function, new Sagemaker endpoint, deployVpc = true, and custom role
// ------------------------------------------------------------------------------------------------------------------
test('Pattern deployment with new Lambda function, new Sagemaker endpoint, deployVpc = true, and custom role', () => {
  // Initial Setup
  const stack = new Stack();
  // Create IAM Role to be assumed by SageMaker
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });
  sagemakerRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'));

  const constructProps: LambdaToSagemakerEndpointProps = {
    modelProps: {
      executionRoleArn: sagemakerRole.roleArn,
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
    deployVpc: true,
    lambdaFunctionProps: {
      runtime: lambda.Runtime.PYTHON_3_8,
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      handler: 'index.handler',
      timeout: Duration.minutes(5),
      memorySize: 128,
    },
  };
  new LambdaToSagemakerEndpoint(stack, 'test-lambda-sagemaker', constructProps);
  // Assertion 1
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: {
            Service: 'sagemaker.amazonaws.com',
          },
        },
      ],
      Version: '2012-10-17',
    },
  });

  // Assertion 2: ReplaceDefaultSecurityGroup, ReplaceEndpointDefaultSecurityGroup, and ReplaceModelDefaultSecurityGroup
  template.resourceCountIs('AWS::EC2::SecurityGroup', 3);
  // Assertion 3
  template.resourceCountIs('AWS::EC2::Subnet', 2);
  // Assertion 4
  template.resourceCountIs('AWS::EC2::InternetGateway', 0);
  // Assertion 5: SAGEMAKER_RUNTIME VPC Interface
  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
    VpcEndpointType: 'Interface',
  });
  // Assertion 6: S3 VPC Endpoint
  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
    VpcEndpointType: 'Gateway',
  });
  // Assertion 7
  template.hasResourceProperties('AWS::EC2::VPC', {
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });
});

// ---------------------------------------------------------------------------------
// Test for error when existing Lambda function does not have vpc and deployVpc = true
// ---------------------------------------------------------------------------------
test('Test for error when existing Lambda function does not have vpc and deployVpc = true ', () => {
  // Initial Setup
  const stack = new Stack();

  // deploy lambda function
  const fn = defaults.deployLambdaFunction(stack, {
    runtime: lambda.Runtime.PYTHON_3_8,
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    handler: 'index.handler',
    timeout: Duration.minutes(5),
    memorySize: 128,
  });

  const constructProps: LambdaToSagemakerEndpointProps = {
    modelProps: {
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
    deployVpc: true,
    existingLambdaObj: fn,
  };

  const app = () => {
    new LambdaToSagemakerEndpoint(stack, 'test-lambda-sagemaker', constructProps);
  };
  // Assertion 1
  expect(app).toThrowError();
});

// -------------------------------------------------------------------------------------------------------
// Pattern deployment with existing Lambda function (with VPC), new Sagemaker endpoint, and existingVpc
// -------------------------------------------------------------------------------------------------------
test('Pattern deployment with existing Lambda function (with VPC), new Sagemaker endpoint, and existingVpc', () => {
  // Initial Setup
  const stack = new Stack();

  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultIsolatedVpcProps(),
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true,
    },
  });

  // Add S3 VPC Gateway Endpoint, required by Sagemaker to access Models artifacts via AWS private network
  defaults.AddAwsServiceEndpoint(stack, vpc, defaults.ServiceEndpointTypes.S3);
  // Add SAGEMAKER_RUNTIME VPC Interface Endpoint, required by the lambda function to invoke the SageMaker endpoint
  defaults.AddAwsServiceEndpoint(stack, vpc, defaults.ServiceEndpointTypes.SAGEMAKER_RUNTIME);

  // deploy lambda function
  const fn = defaults.deployLambdaFunction(stack, {
    runtime: lambda.Runtime.PYTHON_3_8,
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    handler: 'index.handler',
    timeout: Duration.minutes(5),
    memorySize: 128,
    vpc,
  });

  const constructProps: LambdaToSagemakerEndpointProps = {
    modelProps: {
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
    existingVpc: vpc,
    existingLambdaObj: fn,
  };
  new LambdaToSagemakerEndpoint(stack, 'test-lambda-sagemaker', constructProps);

  // Assertion 2: ReplaceDefaultSecurityGroup, ReplaceEndpointDefaultSecurityGroup, and ReplaceModelDefaultSecurityGroup
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::EC2::SecurityGroup', 3);
  // Assertion 3
  template.resourceCountIs('AWS::EC2::Subnet', 2);
  // Assertion 4
  template.resourceCountIs('AWS::EC2::InternetGateway', 0);
  // Assertion 5: SAGEMAKER_RUNTIME VPC Interface
  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
    VpcEndpointType: 'Interface',
  });
  // Assertion 6: S3 VPC Endpoint
  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
    VpcEndpointType: 'Gateway',
  });
  // Assertion 7
  template.hasResourceProperties('AWS::EC2::VPC', {
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });
});

// -----------------------------------------------------------------------------------------
// Test for error with existingLambdaObj/lambdaFunctionProps=undefined (not supplied by user)
// -----------------------------------------------------------------------------------------
test('Test for error with existingLambdaObj/lambdaFunctionProps=undefined (not supplied by user)', () => {
  // Initial Setup
  const stack = new Stack();

  const props: LambdaToSagemakerEndpointProps = {
    modelProps: {
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
  };
  const app = () => {
    new LambdaToSagemakerEndpoint(stack, 'test-lambda-sagemaker', props);
  };
  // Assertion 1
  expect(app).toThrowError();
});

// --------------------------------------------------------------------
// Test for error with (props.deployVpc && props.existingVpc) is true
// --------------------------------------------------------------------
test('confirm CheckVpcProps is called', () => {
  // Initial Setup
  const stack = new Stack();

  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultIsolatedVpcProps(),
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true,
    },
  });

  // Add S3 VPC Gateway Endpoint, required by Sagemaker to access Models artifacts via AWS private network
  defaults.AddAwsServiceEndpoint(stack, vpc, defaults.ServiceEndpointTypes.S3);
  // Add SAGEMAKER_RUNTIME VPC Interface Endpoint, required by the lambda function to invoke the SageMaker endpoint
  defaults.AddAwsServiceEndpoint(stack, vpc, defaults.ServiceEndpointTypes.SAGEMAKER_RUNTIME);

  const constructProps: LambdaToSagemakerEndpointProps = {
    modelProps: {
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
    lambdaFunctionProps: {
      runtime: lambda.Runtime.PYTHON_3_8,
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      handler: 'index.handler',
      timeout: Duration.minutes(5),
      memorySize: 128,
    },
    deployVpc: true,
    existingVpc: vpc,
  };
  const app = () => {
    new LambdaToSagemakerEndpoint(stack, 'test-lambda-sagemaker', constructProps);
  };
  // Assertion 1
  expect(app).toThrowError('Error - Either provide an existingVpc or some combination of deployVpc and vpcProps, but not both.\n');
});

// ----------------------------------------------------------------------------------------------------------
// Test for error with primaryContainer=undefined (not supplied by user), and no existingSageMakerEndpointObj
// ----------------------------------------------------------------------------------------------------------
test('Test for error with primaryContainer=undefined (not supplied by user)', () => {
  // Initial Setup
  const stack = new Stack();

  // deploy lambda function
  const fn = defaults.deployLambdaFunction(stack, {
    runtime: lambda.Runtime.PYTHON_3_8,
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    handler: 'index.handler',
    timeout: Duration.minutes(5),
    memorySize: 128,
  });

  const constructProps: LambdaToSagemakerEndpointProps = {
    modelProps: {},
    deployVpc: true,
    existingLambdaObj: fn,
  };
  const app = () => {
    new LambdaToSagemakerEndpoint(stack, 'test-lambda-sagemaker', constructProps);
  };
  // Assertion 1
  expect(app).toThrowError();
});

// -------------------------------------------------------------------------------------------------
// Test getter methods: existing Lambda function (with VPC), new Sagemaker endpoint, and existingVpc
// -------------------------------------------------------------------------------------------------
test('Test getter methods: existing Lambda function (with VPC), new Sagemaker endpoint, and existingVpc', () => {
  // Initial Setup
  const stack = new Stack();

  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultIsolatedVpcProps(),
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true,
    },
  });

  // Add S3 VPC Gateway Endpoint, required by Sagemaker to access Models artifacts via AWS private network
  defaults.AddAwsServiceEndpoint(stack, vpc, defaults.ServiceEndpointTypes.S3);
  // Add SAGEMAKER_RUNTIME VPC Interface Endpoint, required by the lambda function to invoke the SageMaker endpoint
  defaults.AddAwsServiceEndpoint(stack, vpc, defaults.ServiceEndpointTypes.SAGEMAKER_RUNTIME);

  // deploy lambda function
  const fn = defaults.deployLambdaFunction(stack, {
    runtime: lambda.Runtime.PYTHON_3_8,
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    handler: 'index.handler',
    timeout: Duration.minutes(5),
    memorySize: 128,
    vpc,
  });

  const constructProps: LambdaToSagemakerEndpointProps = {
    modelProps: {
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
    existingVpc: vpc,
    existingLambdaObj: fn,
  };
  const app = new LambdaToSagemakerEndpoint(stack, 'test-lambda-sagemaker', constructProps);
  // Assertions
  expect(app.lambdaFunction).toBeDefined();
  expect(app.sagemakerEndpoint).toBeDefined();
  expect(app.sagemakerEndpointConfig).toBeDefined();
  expect(app.sagemakerModel).toBeDefined();
  expect(app.vpc).toBeDefined();
});

// --------------------------------------------------------------------------------------------
// Test getter methods: new Lambda function, existingSagemakerendpointObj (no vpc)
// --------------------------------------------------------------------------------------------
test('Test getter methods: new Lambda function, existingSagemakerendpointObj (no vpc)', () => {
  // Initial Setup
  const stack = new Stack();

  const deploySagemakerEndpointResponse = defaults.deploySagemakerEndpoint(stack, 'test', {
    modelProps: {
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
  });

  const constructProps: LambdaToSagemakerEndpointProps = {
    existingSagemakerEndpointObj: deploySagemakerEndpointResponse.endpoint,
    lambdaFunctionProps: {
      runtime: lambda.Runtime.PYTHON_3_8,
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      handler: 'index.handler',
      timeout: Duration.minutes(5),
      memorySize: 128,
    },
  };
  const app = new LambdaToSagemakerEndpoint(stack, 'test-lambda-sagemaker', constructProps);
  // Assertions
  expect(app.lambdaFunction).toBeDefined();
  expect(app.sagemakerEndpoint).toBeDefined();
  expect(app.sagemakerEndpointConfig).toBeUndefined();
  expect(app.sagemakerModel).toBeUndefined();
  expect(app.vpc).toBeUndefined();
});

// --------------------------------------------------------------------------------------------
// Test getter methods: new Lambda function, existingSagemakerendpointObj and deployVpc = true
// --------------------------------------------------------------------------------------------
test('Test getter methods: new Lambda function, existingSagemakerendpointObj and deployVpc = true', () => {
  // Initial Setup
  const stack = new Stack();

  const deploySagemakerEndpointResponse = defaults.deploySagemakerEndpoint(stack, 'test', {
    modelProps: {
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
  });

  const constructProps: LambdaToSagemakerEndpointProps = {
    existingSagemakerEndpointObj: deploySagemakerEndpointResponse.endpoint,
    lambdaFunctionProps: {
      runtime: lambda.Runtime.PYTHON_3_8,
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      handler: 'index.handler',
      timeout: Duration.minutes(5),
      memorySize: 128,
    },
    deployVpc: true,
  };
  const app = new LambdaToSagemakerEndpoint(stack, 'test-lambda-sagemaker', constructProps);
  // Assertions
  expect(app.lambdaFunction).toBeDefined();
  expect(app.sagemakerEndpoint).toBeDefined();
  expect(app.sagemakerEndpointConfig).toBeUndefined();
  expect(app.sagemakerModel).toBeUndefined();
  expect(app.vpc).toBeDefined();
});

// --------------------------------------------------------------
// Test lambda function custom environment variable
// --------------------------------------------------------------
test('Test lambda function custom environment variable', () => {
  // Stack
  const stack = new Stack();

  // Helper declaration
  const deploySagemakerEndpointResponse = defaults.deploySagemakerEndpoint(stack, 'test', {
    modelProps: {
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
  });
  new LambdaToSagemakerEndpoint(stack, 'test-lambda-sagemaker', {
    existingSagemakerEndpointObj: deploySagemakerEndpointResponse.endpoint,
    lambdaFunctionProps: {
      runtime: lambda.Runtime.PYTHON_3_8,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    sagemakerEnvironmentVariableName: 'CUSTOM_SAGEMAKER_ENDPOINT'
  });

  // Assertion
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Handler: 'index.handler',
    Runtime: 'python3.8',
    Environment: {
      Variables: {
        CUSTOM_SAGEMAKER_ENDPOINT: {
          'Fn::GetAtt': [
            'SagemakerEndpoint',
            'EndpointName'
          ]
        }
      }
    }
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

  const props: LambdaToSagemakerEndpointProps = {
    modelProps: {
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    existingLambdaObj: lambdaFunction,
  };
  const app = () => {
    new LambdaToSagemakerEndpoint(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n');
});

test('Confirm call to CheckSagemakerProps', () => {
  // Initial Setup
  const stack = new Stack();
  const deploySagemakerEndpointResponse = defaults.deploySagemakerEndpoint(stack, 'test', {
    modelProps: {
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
  });

  const props: LambdaToSagemakerEndpointProps = {
    existingSagemakerEndpointObj: deploySagemakerEndpointResponse.endpoint,
    endpointProps: { endpointConfigName: 'test' },
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
  };
  const app = () => {
    new LambdaToSagemakerEndpoint(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide endpointProps or existingSagemakerEndpointObj, but not both.\n');
});
