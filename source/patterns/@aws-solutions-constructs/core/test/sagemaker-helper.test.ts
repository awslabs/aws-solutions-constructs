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

import { Stack } from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as kms from '@aws-cdk/aws-kms';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as defaults from '../';
import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';

// --------------------------------------------------------------
// Test minimal deployment with no properties
// --------------------------------------------------------------
test('Test minimal deployment with no properties', () => {
  // Stack
  const stack = new Stack();
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });
  // Build SageMaker Notebook Instance
  defaults.buildSagemakerNotebook(stack, {
    role: sagemakerRole,
  });
  // Assertion
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test deployment with VPC
// --------------------------------------------------------------
test('Test deployment with VPC', () => {
  // Stack
  const stack = new Stack();
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });
  let sagemaker;
  let vpc;
  let sg;

  // Build SageMaker Notebook Instance
  [sagemaker, vpc, sg] = defaults.buildSagemakerNotebook(stack, {
    role: sagemakerRole,
  });
  // Assertion
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  expect(vpc?.privateSubnets.length).toEqual(2);
  expect(vpc?.publicSubnets.length).toEqual(2);
  expect(sagemaker.instanceType).toEqual('ml.t2.medium');
  expect(sg).toBeInstanceOf(ec2.SecurityGroup);
});

// --------------------------------------------------------------
// Test deployment witout VPC
// --------------------------------------------------------------
test('Test deployment w/o VPC', () => {
  // Stack
  const stack = new Stack();
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });
  // Build SageMaker Notebook Instance
  defaults.buildSagemakerNotebook(stack, {
    role: sagemakerRole,
    deployInsideVpc: false,
  });
  // Assertion
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test deployment in existing VPC
// --------------------------------------------------------------
test('Test deployment w/ existing VPC', () => {
  // Stack
  const stack = new Stack();
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });
  // Build SageMaker Notebook Instance
  defaults.buildSagemakerNotebook(stack, {
    role: sagemakerRole,
    deployInsideVpc: true,
    sagemakerNotebookProps: {
      subnetId: 'subnet-deadbeef',
      securityGroupIds: ['sg-deadbeef'],
    },
  });
  expect(stack).toHaveResource('AWS::SageMaker::NotebookInstance', {
    DirectInternetAccess: 'Disabled',
    SecurityGroupIds: ['sg-deadbeef'],
    SubnetId: 'subnet-deadbeef',
  });
});

// --------------------------------------------------------------
// Test deployment with override
// --------------------------------------------------------------
test('Test deployment w/ override', () => {
  // Stack
  const stack = new Stack();
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });
  const key = new kms.Key(stack, 'MyEncryptionKey');
  // Build SageMaker Notebook Instance
  defaults.buildSagemakerNotebook(stack, {
    role: sagemakerRole,
    sagemakerNotebookProps: {
      instanceType: 'ml.c4.2xlarge',
      kmsKeyId: key.keyArn,
    },
  });
  expect(stack).toHaveResource('AWS::SageMaker::NotebookInstance', {
    DirectInternetAccess: 'Disabled',
    InstanceType: 'ml.c4.2xlarge',
    KmsKeyId: {
      'Fn::GetAtt': ['MyEncryptionKeyD795679F', 'Arn'],
    },
  });
});

// ----------------------------------------------------------
// Test deployment with existing SageMaker Notebook instance
// ----------------------------------------------------------
test('Test deployment with existing SageMaker Notebook instance', () => {
  // Stack
  const stack = new Stack();
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });
  // Build SageMaker Notebook Instance
  const [noteBookInstance] = defaults.buildSagemakerNotebook(stack, {
    role: sagemakerRole,
  });

  // Build SageMaker Notebook Instance
  defaults.buildSagemakerNotebook(stack, {
    existingNotebookObj: noteBookInstance,
    role: sagemakerRole,
  });
  // Assertion
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test exception
// --------------------------------------------------------------
test('Test exception', () => {
  // Stack
  const stack = new Stack();
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });

  expect(() => {
    // Build SageMaker Notebook Instance
    defaults.buildSagemakerNotebook(stack, {
      role: sagemakerRole,
      deployInsideVpc: true,
      sagemakerNotebookProps: {
        subnetId: 'subnet-deadbeef',
      },
    });
  }).toThrowError();
});

// --------------------------------------------------------------
// Test minimal deployment of SageMaker Inference Endpoint no VPC
// --------------------------------------------------------------
test('Test minimal deployment with no properties', () => {
  // Stack
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
  // Build SageMaker Inference Endpoint
  defaults.BuildSageMakerEndpoint(stack, {
    modelProps: {
      executionRoleArn: sagemakerRole.roleArn,
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
    role: sagemakerRole,
  });
  // Assertion
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// ----------------------------------------------------------------
// Test minimal deployment of SageMaker Inference Endpoint with VPC
// ----------------------------------------------------------------
test('Test minimal deployment with no properties', () => {
  // Stack
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

  // create a VPC with required VPC S3 gateway and SAGEMAKER_RUNTIME Interface
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

  // Build SageMaker Inference Endpoint
  defaults.BuildSageMakerEndpoint(stack, {
    modelProps: {
      executionRoleArn: sagemakerRole.roleArn,
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
    vpc,
    role: sagemakerRole,
  });
  // Assertion
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// ---------------------------------------------------------------------------
// Test minimal deployment of SageMaker Inference Endpoint with VPC/NatGateway
// ---------------------------------------------------------------------------
test('Test minimal deployment of SageMaker Inference Endpoint with VPC/NatGateway', () => {
  // Stack
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

  // create a VPC with required VPC S3 gateway and SAGEMAKER_RUNTIME Interface
  const vpc = defaults.buildVpc(stack, {
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true,
      natGateways: 2,
      subnetConfiguration: [
        {
          cidrMask: 20,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 20,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE,
        },
      ],
    },
  });

  // Add S3 VPC Gateway Endpint, required by SageMaker to access Models artifacts via AWS private network
  defaults.AddAwsServiceEndpoint(stack, vpc, defaults.ServiceEndpointTypes.S3);
  // Add SAGEMAKER_RUNTIME VPC Interface Endpint, required by the lambda function to invoke the SageMaker endpoint
  defaults.AddAwsServiceEndpoint(stack, vpc, defaults.ServiceEndpointTypes.SAGEMAKER_RUNTIME);

  // Build SageMaker Inference Endpoint
  defaults.BuildSageMakerEndpoint(stack, {
    modelProps: {
      executionRoleArn: sagemakerRole.roleArn,
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
    vpc,
    deployNatGateway: true,
    role: sagemakerRole,
  });
  // Assertion
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// -------------------------------------------------------------------------
// Test deployment of SageMaker Inference Endpoint with properties overwrite
// -------------------------------------------------------------------------
test('Test minimal deployment with no properties', () => {
  // Stack
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

  // create a VPC with required VPC S3 gateway and SAGEMAKER_RUNTIME Interface
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

  // create encryption key
  const encryptionkey = new kms.Key(stack, 'MyEndpointConfigEncryptionKey');
  // Build SageMaker Inference Endpoint
  defaults.BuildSageMakerEndpoint(stack, {
    modelProps: {
      modelName: 'linear-learner-model',
      executionRoleArn: sagemakerRole.roleArn,
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
    endpointConfigProps: {
      endpointConfigName: 'linear-learner-endpoint-config',
      productionVariants: [
        {
          modelName: 'linear-learner-model',
          initialInstanceCount: 1,
          initialVariantWeight: 1.0,
          instanceType: 'ml.m4.large',
          variantName: 'AllTraffic',
        },
      ],
      kmsKeyId: encryptionkey.keyArn,
    },
    endpointProps: {
      endpointConfigName: 'linear-learner-endpoint-config',
      endpointName: 'linear-learner-endpoint',
    },
    vpc,
    role: sagemakerRole,
  });
  // Assertion
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test deployment of existing SageMaker Endpoint
// --------------------------------------------------------------
test('Test deployment of existing SageMaker Endpoint', () => {
  // Stack
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

  // Build SageMaker Inference Endpoint
  defaults.BuildSageMakerEndpoint(stack, {
    existingSageMakerEndpointObj: sageMakerEndpoint,
  });
  // Assertion
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// ---------------------------------------------------------------
// Test exception for not providing primaryContainer in modelProps
// ---------------------------------------------------------------
test('Test exception for not providing primaryContainer in modelProps', () => {
  // Stack
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

  const app = () => {
    // Build SageMaker Inference Endpoint
    defaults.BuildSageMakerEndpoint(stack, {
      modelProps: {
        executionRoleArn: sagemakerRole.roleArn,
      },
      role: sagemakerRole,
    });
  };
  // Assertion 1
  expect(app).toThrowError();
});

// -------------------------------------------------------------------------
// Test exception for not providing existingSageMakerEndpoint  or modelProps
// -------------------------------------------------------------------------
test('Test exception for not providing existingSageMakerEndpoint or modelProps', () => {
  // Stack
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
  const app = () => {
    // Build SageMaker Inference Endpoint
    defaults.BuildSageMakerEndpoint(stack, { role: sagemakerRole });
  };
  // Assertion 1
  expect(app).toThrowError();
});

// -----------------------------------------------------------------------------------------
// Test exception for not providing sagemakerRole/modelProps (no existing sageMakerEndpoint)
// -----------------------------------------------------------------------------------------
test('Test exception for not providing sagemakerRole/modelProps (no existing sageMakerEndpoint)', () => {
  // Stack
  const stack = new Stack();
  const app = () => {
    // Build SageMaker Inference Endpoint
    defaults.deploySagemakerEndpoint(stack, {});
  };
  // Assertion 1
  expect(app).toThrowError();
});
