/**
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { Stack, Duration } from '@aws-cdk/core';
import { LambdaToSageMakerEndpoint, LambdaToSageMakerEndpointProps } from '../lib';
import * as defaults from '@aws-solutions-constructs/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';

// -----------------------------------------------------------------------------------------
// Pattern deployment with new Lambda function, new SageMaker endpoint and deployVpc = false
// -----------------------------------------------------------------------------------------
test('Pattern deployment with new Lambda function, new SageMaker endpoint, deployVpc = false', () => {
  // Initial Setup
  const stack = new Stack();
  // Create IAM Role to be assumed by SageMaker
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });
  sagemakerRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'));
  sagemakerRole.addToPolicy(
    new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
      resources: ['arn:aws:s3:::*'],
    })
  );
  const props: LambdaToSageMakerEndpointProps = {
    modelProps: {
      executionRoleArn: sagemakerRole.roleArn,
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
    role: sagemakerRole,
  };
  new LambdaToSageMakerEndpoint(stack, 'test-lambda-sagemaker', props);
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// ----------------------------------------------------------------------------------------------
// Pattern deployment with existing Lambda function, new SageMaker endpoint and deployVpc = false
// ----------------------------------------------------------------------------------------------
test('Pattern deployment with existing Lambda function, new SageMaker endpoint, deployVpc = false', () => {
  // Initial Setup
  const stack = new Stack();
  // Create IAM Role to be assumed by SageMaker
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });
  sagemakerRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'));
  sagemakerRole.addToPolicy(
    new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
      resources: ['arn:aws:s3:::*'],
    })
  );

  // deploy lambda function
  const fn = defaults.deployLambdaFunction(stack, {
    runtime: lambda.Runtime.PYTHON_3_8,
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    handler: 'index.handler',
    timeout: Duration.minutes(5),
    memorySize: 128,
  });

  const props: LambdaToSageMakerEndpointProps = {
    modelProps: {
      executionRoleArn: sagemakerRole.roleArn,
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
    existingLambdaObj: fn,
    role: sagemakerRole,
  };
  new LambdaToSageMakerEndpoint(stack, 'test-lambda-sagemaker', props);
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// ------------------------------------------------------------------------------------------------------------------
// Pattern deployment with new Lambda function, new SageMaker endpoint, deployVpc = true and deployNatGateway = false
// ------------------------------------------------------------------------------------------------------------------
test('Pattern deployment with new Lambda function, new SageMaker endpoint, deployVpc = true and deployNatGateway = false', () => {
  // Initial Setup
  const stack = new Stack();
  // Create IAM Role to be assumed by SageMaker
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });
  sagemakerRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'));
  sagemakerRole.addToPolicy(
    new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
      resources: ['arn:aws:s3:::*'],
    })
  );
  const props: LambdaToSageMakerEndpointProps = {
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
    role: sagemakerRole,
  };
  new LambdaToSageMakerEndpoint(stack, 'test-lambda-sagemaker', props);
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// ---------------------------------------------------------------------------------
// Test for errot when existing Lambda function does not have vpc and deployVpc = true
// ---------------------------------------------------------------------------------
test('Test for errot when existing Lambda function does not have vpc and deployVpc = true ', () => {
  // Initial Setup
  const stack = new Stack();
  // Create IAM Role to be assumed by SageMaker
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });
  sagemakerRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'));
  sagemakerRole.addToPolicy(
    new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
      resources: ['arn:aws:s3:::*'],
    })
  );

  // deploy lambda function
  const fn = defaults.deployLambdaFunction(stack, {
    runtime: lambda.Runtime.PYTHON_3_8,
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    handler: 'index.handler',
    timeout: Duration.minutes(5),
    memorySize: 128,
  });

  const props: LambdaToSageMakerEndpointProps = {
    modelProps: {
      executionRoleArn: sagemakerRole.roleArn,
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
    deployVpc: true,
    existingLambdaObj: fn,
    role: sagemakerRole,
  };

  const app = () => {
    new LambdaToSageMakerEndpoint(stack, 'test-lambda-sagemaker', props);
  };
  // Assertion 1
  expect(app).toThrowError();
});

// -----------------------------------------------------------------------------------------------------------------------------------------
// Pattern deployment with new Lambda function, new SageMaker endpoint, new SageMaker endpoint, deployVpc = true and deployNatGateway = true
// -----------------------------------------------------------------------------------------------------------------------------------------
test('Pattern deployment with new Lambda function, new SageMaker endpoint, deployVpc = true and deployNatGateway = true', () => {
  // Initial Setup
  const stack = new Stack();
  // Create IAM Role to be assumed by SageMaker
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });
  sagemakerRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'));
  sagemakerRole.addToPolicy(
    new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
      resources: ['arn:aws:s3:::*'],
    })
  );
  const props: LambdaToSageMakerEndpointProps = {
    modelProps: {
      executionRoleArn: sagemakerRole.roleArn,
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
    deployVpc: true,
    deployNatGateway: true,
    lambdaFunctionProps: {
      runtime: lambda.Runtime.PYTHON_3_8,
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      handler: 'index.handler',
      timeout: Duration.minutes(5),
      memorySize: 128,
    },
    role: sagemakerRole,
  };
  new LambdaToSageMakerEndpoint(stack, 'test-lambda-sagemaker', props);
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// -------------------------------------------------------------------------------------------------------
// Pattern deployment with existing Lambda function (with VPC), new SageMaker endpoint, and existingVpc
// -------------------------------------------------------------------------------------------------------
test('Pattern deployment with existing Lambda function (with VPC), new SageMaker endpoint, and existingVpc', () => {
  // Initial Setup
  const stack = new Stack();
  // Create IAM Role to be assumed by SageMaker
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });
  sagemakerRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'));
  sagemakerRole.addToPolicy(
    new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
      resources: ['arn:aws:s3:::*'],
    })
  );

  const vpc = defaults.buildVpc(stack, {
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 18,
          name: 'Isolated',
          subnetType: ec2.SubnetType.ISOLATED,
        },
      ],
    },
  });

  // Add S3 VPC Gateway Endpint, required by SageMaker to access Models artifacts via AWS private network
  defaults.AddAwsServiceEndpoint(stack, vpc, defaults.ServiceEndpointTypes.S3);
  // Add SAGEMAKER_RUNTIME VPC Interface Endpint, required by the lambda function to invoke the SageMaker endpoint
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

  const props: LambdaToSageMakerEndpointProps = {
    modelProps: {
      executionRoleArn: sagemakerRole.roleArn,
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
    existingVpc: vpc,
    existingLambdaObj: fn,
    role: sagemakerRole,
  };
  new LambdaToSageMakerEndpoint(stack, 'test-lambda-sagemaker', props);
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// -----------------------------------------------------------------------------------------
// Test for error with existingLambdaObj/lambdaFunctionProps=undefined (not supplied by user)
// -----------------------------------------------------------------------------------------
test('Test for error with existingLambdaObj/lambdaFunctionProps=undefined (not supplied by user)', () => {
  // Initial Setup
  const stack = new Stack();
  // Create IAM Role to be assumed by SageMaker
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });
  sagemakerRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'));
  sagemakerRole.addToPolicy(
    new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
      resources: ['arn:aws:s3:::*'],
    })
  );

  const props: LambdaToSageMakerEndpointProps = {
    modelProps: {
      executionRoleArn: sagemakerRole.roleArn,
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
    role: sagemakerRole,
  };
  const app = () => {
    new LambdaToSageMakerEndpoint(stack, 'test-lambda-sagemaker', props);
  };
  // Assertion 1
  expect(app).toThrowError();
});

// --------------------------------------------------------------------
// Test for error with (props.deployVpc && props.existingVpc) is true
// --------------------------------------------------------------------
test('Test for error with (props.deployVpc && props.existingVpc) is true', () => {
  // Initial Setup
  const stack = new Stack();
  // Create IAM Role to be assumed by SageMaker
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });
  sagemakerRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'));
  sagemakerRole.addToPolicy(
    new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
      resources: ['arn:aws:s3:::*'],
    })
  );

  const vpc = defaults.buildVpc(stack, {
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 18,
          name: 'Isolated',
          subnetType: ec2.SubnetType.ISOLATED,
        },
      ],
    },
  });

  // Add S3 VPC Gateway Endpint, required by SageMaker to access Models artifacts via AWS private network
  defaults.AddAwsServiceEndpoint(stack, vpc, defaults.ServiceEndpointTypes.S3);
  // Add SAGEMAKER_RUNTIME VPC Interface Endpint, required by the lambda function to invoke the SageMaker endpoint
  defaults.AddAwsServiceEndpoint(stack, vpc, defaults.ServiceEndpointTypes.SAGEMAKER_RUNTIME);

  const props: LambdaToSageMakerEndpointProps = {
    modelProps: {
      executionRoleArn: sagemakerRole.roleArn,
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
    deployVpc: true,
    existingVpc: vpc,
    role: sagemakerRole,
  };
  const app = () => {
    new LambdaToSageMakerEndpoint(stack, 'test-lambda-sagemaker', props);
  };
  // Assertion 1
  expect(app).toThrowError();
});

// ----------------------------------------------------------------------------------------------------------
// Test for error with primaryContainer=undefined (not supplied by user), and no existingSageMakerEndpointObj
// ----------------------------------------------------------------------------------------------------------
test('Test for error with primaryContainer=undefined (not supplied by user)', () => {
  // Initial Setup
  const stack = new Stack();
  // Create IAM Role to be assumed by SageMaker
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });
  sagemakerRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'));
  sagemakerRole.addToPolicy(
    new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
      resources: ['arn:aws:s3:::*'],
    })
  );

  // deploy lambda function
  const fn = defaults.deployLambdaFunction(stack, {
    runtime: lambda.Runtime.PYTHON_3_8,
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    handler: 'index.handler',
    timeout: Duration.minutes(5),
    memorySize: 128,
  });

  const props: LambdaToSageMakerEndpointProps = {
    modelProps: {
      executionRoleArn: sagemakerRole.roleArn,
    },
    deployVpc: true,
    deployNatGateway: true,
    existingLambdaObj: fn,
    role: sagemakerRole,
  };
  const app = () => {
    new LambdaToSageMakerEndpoint(stack, 'test-lambda-sagemaker', props);
  };
  // Assertion 1
  expect(app).toThrowError();
});

// --------------------------------------------------------------------------------------------------------------------
// Pattern deployment with new Lambda function with new SageMaker endpoint, existingVpc and deployNatGateway = false
// --------------------------------------------------------------------------------------------------------------------
test('Pattern deployment with new Lambda function with existingVpcObj and deployNatGateway = false', () => {
  // Initial Setup
  const stack = new Stack();
  // Create IAM Role to be assumed by SageMaker
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });
  sagemakerRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'));
  sagemakerRole.addToPolicy(
    new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
      resources: ['arn:aws:s3:::*'],
    })
  );

  const vpc = defaults.buildVpc(stack, {
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 18,
          name: 'Isolated',
          subnetType: ec2.SubnetType.ISOLATED,
        },
      ],
    },
  });

  // Add S3 VPC Gateway Endpint, required by SageMaker to access Models artifacts via AWS private network
  defaults.AddAwsServiceEndpoint(stack, vpc, defaults.ServiceEndpointTypes.S3);
  // Add SAGEMAKER_RUNTIME VPC Interface Endpint, required by the lambda function to invoke the SageMaker endpoint
  defaults.AddAwsServiceEndpoint(stack, vpc, defaults.ServiceEndpointTypes.SAGEMAKER_RUNTIME);

  const props: LambdaToSageMakerEndpointProps = {
    modelProps: {
      executionRoleArn: sagemakerRole.roleArn,
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
    existingVpc: vpc,
    lambdaFunctionProps: {
      runtime: lambda.Runtime.PYTHON_3_8,
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      handler: 'index.handler',
      timeout: Duration.minutes(5),
      memorySize: 128,
    },
    role: sagemakerRole,
  };
  new LambdaToSageMakerEndpoint(stack, 'test-lambda-sagemaker', props);
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------------------------------------
// Pattern deployment with new Lambda function and existingSageMakerendpointObj (no vpc)
// --------------------------------------------------------------------------------------------
test('Pattern deployment with new Lambda function and existingSageMakerendpointObj (no vpc)', () => {
  // Initial Setup
  const stack = new Stack();
  // Create IAM Role to be assumed by SageMaker
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });
  sagemakerRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'));
  sagemakerRole.addToPolicy(
    new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
      resources: ['arn:aws:s3:::*'],
    })
  );

  const [sageMakerEndpoint] = defaults.deploySagemakerEndpoint(stack, {
    modelProps: {
      executionRoleArn: sagemakerRole.roleArn,
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
    role: sagemakerRole,
  });

  const props: LambdaToSageMakerEndpointProps = {
    existingSageMakerEndpointObj: sageMakerEndpoint,
    lambdaFunctionProps: {
      runtime: lambda.Runtime.PYTHON_3_8,
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      handler: 'index.handler',
      timeout: Duration.minutes(5),
      memorySize: 128,
    },
    role: sagemakerRole,
  };
  new LambdaToSageMakerEndpoint(stack, 'test-lambda-sagemaker', props);
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// -------------------------------------------------------------------------------------------------
// Test getter methods: existing Lambda function (with VPC), new SageMaker endpoint, and existingVpc
// -------------------------------------------------------------------------------------------------
test('Test getter methods: existing Lambda function (with VPC), new SageMaker endpoint, and existingVpc', () => {
  // Initial Setup
  const stack = new Stack();
  // Create IAM Role to be assumed by SageMaker
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });
  sagemakerRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'));
  sagemakerRole.addToPolicy(
    new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
      resources: ['arn:aws:s3:::*'],
    })
  );

  const vpc = defaults.buildVpc(stack, {
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 18,
          name: 'Isolated',
          subnetType: ec2.SubnetType.ISOLATED,
        },
      ],
    },
  });

  // Add S3 VPC Gateway Endpint, required by SageMaker to access Models artifacts via AWS private network
  defaults.AddAwsServiceEndpoint(stack, vpc, defaults.ServiceEndpointTypes.S3);
  // Add SAGEMAKER_RUNTIME VPC Interface Endpint, required by the lambda function to invoke the SageMaker endpoint
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

  const props: LambdaToSageMakerEndpointProps = {
    modelProps: {
      executionRoleArn: sagemakerRole.roleArn,
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
    existingVpc: vpc,
    existingLambdaObj: fn,
    role: sagemakerRole,
  };
  const app = new LambdaToSageMakerEndpoint(stack, 'test-lambda-sagemaker', props);
  // Assertions
  expect(app.lambdaFunction !== null);
  expect(app.sageMakerEndpoint !== null);
  expect(app.sageMakerEndpointConfig !== null);
  expect(app.sageMakerModel !== null);
  expect(app.vpc !== null);
});

// --------------------------------------------------------------------------------------------
// Test getter methods: new Lambda function, existingSageMakerendpointObj (no vpc)
// --------------------------------------------------------------------------------------------
test('Test getter methods: new Lambda function, existingSageMakerendpointObj (no vpc)', () => {
  // Initial Setup
  const stack = new Stack();
  // Create IAM Role to be assumed by SageMaker
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });
  sagemakerRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'));
  sagemakerRole.addToPolicy(
    new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
      resources: ['arn:aws:s3:::*'],
    })
  );

  const [sageMakerEndpoint] = defaults.deploySagemakerEndpoint(stack, {
    modelProps: {
      executionRoleArn: sagemakerRole.roleArn,
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
    role: sagemakerRole,
  });

  const props: LambdaToSageMakerEndpointProps = {
    existingSageMakerEndpointObj: sageMakerEndpoint,
    lambdaFunctionProps: {
      runtime: lambda.Runtime.PYTHON_3_8,
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      handler: 'index.handler',
      timeout: Duration.minutes(5),
      memorySize: 128,
    },
    role: sagemakerRole,
  };
  const app = new LambdaToSageMakerEndpoint(stack, 'test-lambda-sagemaker', props);
  // Assertions
  expect(app.lambdaFunction !== null);
  expect(app.sageMakerEndpoint !== null);
  expect(app.sageMakerEndpointConfig === null);
  expect(app.sageMakerModel === null);
  expect(app.vpc === null);
});

// --------------------------------------------------------------------------------------------
// Test getter methods: new Lambda function, existingSageMakerendpointObj and deployVpc = true
// --------------------------------------------------------------------------------------------
test('Test getter methods: new Lambda function, existingSageMakerendpointObj and deployVpc = true', () => {
  // Initial Setup
  const stack = new Stack();
  // Create IAM Role to be assumed by SageMaker
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });
  sagemakerRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'));
  sagemakerRole.addToPolicy(
    new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
      resources: ['arn:aws:s3:::*'],
    })
  );

  const [sageMakerEndpoint] = defaults.deploySagemakerEndpoint(stack, {
    modelProps: {
      executionRoleArn: sagemakerRole.roleArn,
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
    role: sagemakerRole,
  });

  const props: LambdaToSageMakerEndpointProps = {
    existingSageMakerEndpointObj: sageMakerEndpoint,
    lambdaFunctionProps: {
      runtime: lambda.Runtime.PYTHON_3_8,
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      handler: 'index.handler',
      timeout: Duration.minutes(5),
      memorySize: 128,
    },
    deployVpc: true,
  };
  const app = new LambdaToSageMakerEndpoint(stack, 'test-lambda-sagemaker', props);
  // Assertions
  expect(app.lambdaFunction !== null);
  expect(app.sageMakerEndpoint !== null);
  expect(app.sageMakerEndpointConfig === null);
  expect(app.sageMakerModel === null);
  expect(app.vpc !== null);
});

// ---------------------------------------------------------------------------------------------------------
// Test getter methods: new Lambda function, existingSageMakerendpointObj, deployVpc/deployNatGateway = true
// ---------------------------------------------------------------------------------------------------------
test('Test getter methods: new Lambda function, existingSageMakerendpointObj, deployVpc/deployNatGateway = true', () => {
  // Initial Setup
  const stack = new Stack();
  // Create IAM Role to be assumed by SageMaker
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });
  sagemakerRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'));
  sagemakerRole.addToPolicy(
    new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
      resources: ['arn:aws:s3:::*'],
    })
  );

  const [sageMakerEndpoint] = defaults.deploySagemakerEndpoint(stack, {
    modelProps: {
      executionRoleArn: sagemakerRole.roleArn,
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
    role: sagemakerRole,
  });

  const props: LambdaToSageMakerEndpointProps = {
    existingSageMakerEndpointObj: sageMakerEndpoint,
    lambdaFunctionProps: {
      runtime: lambda.Runtime.PYTHON_3_8,
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      handler: 'index.handler',
      timeout: Duration.minutes(5),
      memorySize: 128,
    },
    deployVpc: true,
    deployNatGateway: true,
  };
  const app = new LambdaToSageMakerEndpoint(stack, 'test-lambda-sagemaker', props);
  // Assertions
  expect(app.lambdaFunction !== null);
  expect(app.sageMakerEndpoint !== null);
  expect(app.sageMakerEndpointConfig === null);
  expect(app.sageMakerModel === null);
  expect(app.vpc !== null);
});

// -------------------------------------------------------------------------------------------------------------
// Test lambda has SageMaker's Endpoint name: new Lambda function, existingSageMakerendpointObj, and existingVpc
// -------------------------------------------------------------------------------------------------------------
test('Test getter methods: new Lambda function, existingSageMakerendpointObj, and existingVpc', () => {
  // Initial Setup
  const stack = new Stack();
  // Create IAM Role to be assumed by SageMaker
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });
  sagemakerRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'));
  sagemakerRole.addToPolicy(
    new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
      resources: ['arn:aws:s3:::*'],
    })
  );

  const [sageMakerEndpoint] = defaults.deploySagemakerEndpoint(stack, {
    modelProps: {
      executionRoleArn: sagemakerRole.roleArn,
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
    role: sagemakerRole,
  });

  const vpc = defaults.buildVpc(stack, {
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 18,
          name: 'Isolated',
          subnetType: ec2.SubnetType.ISOLATED,
        },
      ],
    },
  });

  // Add S3 VPC Gateway Endpint, required by SageMaker to access Models artifacts via AWS private network
  defaults.AddAwsServiceEndpoint(stack, vpc, defaults.ServiceEndpointTypes.S3);
  // Add SAGEMAKER_RUNTIME VPC Interface Endpint, required by the lambda function to invoke the SageMaker endpoint
  defaults.AddAwsServiceEndpoint(stack, vpc, defaults.ServiceEndpointTypes.SAGEMAKER_RUNTIME);

  const props: LambdaToSageMakerEndpointProps = {
    existingSageMakerEndpointObj: sageMakerEndpoint,
    lambdaFunctionProps: {
      runtime: lambda.Runtime.PYTHON_3_8,
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      handler: 'index.handler',
      timeout: Duration.minutes(5),
      memorySize: 128,
    },
    existingVpc: vpc,
  };
  new LambdaToSageMakerEndpoint(stack, 'test-lambda-sagemaker', props);
  // Assertions
  expect(stack).toHaveResource('AWS::Lambda::Function', {
    Environment: {
      Variables: {
        ENDPOINT_NAME: {
          'Fn::GetAtt': ['SageMakerEndpoint', 'EndpointName'],
        },
      },
    },
  });
});
