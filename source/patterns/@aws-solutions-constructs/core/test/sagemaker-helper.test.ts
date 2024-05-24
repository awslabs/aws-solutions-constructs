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

import { Stack } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as defaults from '../';
import { Template } from 'aws-cdk-lib/assertions';
import { BuildSagemakerEndpoint } from '../lib/sagemaker-helper';

test('Test deployment with VPC', () => {
  // Stack
  const stack = new Stack();
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });

  // Build Sagemaker Notebook Instance
  const buildSagemakerNotebookResponse = defaults.buildSagemakerNotebook(stack, 'test', {
    role: sagemakerRole,
  });
  // Assertion
  expect(buildSagemakerNotebookResponse.vpc?.privateSubnets.length).toEqual(2);
  expect(buildSagemakerNotebookResponse.vpc?.publicSubnets.length).toEqual(2);
  expect(buildSagemakerNotebookResponse.notebook.instanceType).toEqual('ml.t2.medium');
  expect(buildSagemakerNotebookResponse.securityGroup).toBeInstanceOf(ec2.SecurityGroup);
});

test('Test deployment without VPC', () => {
  // Stack
  const stack = new Stack();
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });

  // Build Sagemaker Notebook Instance
  const buildSagemakerNotebookResponse = defaults.buildSagemakerNotebook(stack, 'test', {
    role: sagemakerRole,
    deployInsideVpc: false,
  });
  // Assertion
  expect(buildSagemakerNotebookResponse.vpc).not.toBeDefined();
  expect(buildSagemakerNotebookResponse.notebook).toBeDefined();
  expect(buildSagemakerNotebookResponse.securityGroup).not.toBeDefined();
});

test('Test deployment w/ existing VPC', () => {
  // Stack
  const stack = new Stack();
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });
  // Build Sagemaker Notebook Instance
  const buildSagemakerNotebookResponse = defaults.buildSagemakerNotebook(stack, 'test', {
    role: sagemakerRole,
    deployInsideVpc: true,
    sagemakerNotebookProps: {
      subnetId: 'subnet-deadbeef',
      securityGroupIds: ['sg-deadbeef'],
    },
  });

  expect(buildSagemakerNotebookResponse.notebook).toBeDefined();
  expect(buildSagemakerNotebookResponse.vpc).not.toBeDefined();
  expect(buildSagemakerNotebookResponse.securityGroup).not.toBeDefined();

  Template.fromStack(stack).hasResourceProperties('AWS::SageMaker::NotebookInstance', {
    DirectInternetAccess: 'Disabled',
    SecurityGroupIds: ['sg-deadbeef'],
    SubnetId: 'subnet-deadbeef',
  });
});

test('Test default values encrypt notebook', () => {
  // Stack
  const stack = new Stack();
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });

  // Build Sagemaker Notebook Instance
  defaults.buildSagemakerNotebook(stack, 'test', {
    role: sagemakerRole,
    deployInsideVpc: false,
  });
  // Assertion
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::SageMaker::NotebookInstance', {
    KmsKeyId: {
      Ref: "testKey2C00E5E5"
    },
  });
});

test('Test deployment w/ override', () => {
  // Stack
  const stack = new Stack();
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });
  const key = new kms.Key(stack, 'MyEncryptionKey');
  // Build Sagemaker Notebook Instance
  defaults.buildSagemakerNotebook(stack, 'test', {
    role: sagemakerRole,
    sagemakerNotebookProps: {
      instanceType: 'ml.c4.2xlarge',
      kmsKeyId: key.keyArn,
    },
  });
  Template.fromStack(stack).hasResourceProperties('AWS::SageMaker::NotebookInstance', {
    DirectInternetAccess: 'Disabled',
    InstanceType: 'ml.c4.2xlarge',
    KmsKeyId: {
      'Fn::GetAtt': ['MyEncryptionKeyD795679F', 'Arn'],
    },
  });
});

test('Test exception', () => {
  // Stack
  const stack = new Stack();
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });

  expect(() => {
    // Build Sagemaker Notebook Instance
    defaults.buildSagemakerNotebook(stack, 'test', {
      role: sagemakerRole,
      deployInsideVpc: true,
      sagemakerNotebookProps: {
        subnetId: 'subnet-deadbeef',
      },
    });
  }).toThrowError();
});

test('Test exception for not providing primaryContainer in modelProps', () => {
  // Stack
  const stack = new Stack();

  const app = () => {
    // Build Sagemaker Inference Endpoint
    defaults.BuildSagemakerEndpoint(stack, 'test', {
      modelProps: {},
    });
  };
  // Assertion 1
  expect(app).toThrowError();
});

test('Test exception for not providing modelProps', () => {
  // Stack
  const stack = new Stack();

  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultIsolatedVpcProps(),
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true,
    },
  });

  const app = () => {
    // Build Sagemaker Inference Endpoint
    defaults.deploySagemakerEndpoint(stack, 'test',  { vpc });
  };
  // Assertion 1
  expect(app).toThrowError();
});

test('Test exception for not providing modelProps or existingSagemkaerObj', () => {
  // Stack
  const stack = new Stack();

  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultIsolatedVpcProps(),
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true,
    },
  });

  const app = () => {
    // Build Sagemaker Inference Endpoint
    defaults.BuildSagemakerEndpoint(stack, 'test', { vpc });
  };
  // Assertion 1
  expect(app).toThrowError();
});

test('Test exception for not providing private or isolated subnets in an existing vpc', () => {
  // Stack
  const stack = new Stack();

  // create a VPC
  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultIsolatedVpcProps(),
    userVpcProps: {
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 18,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    },
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true,
    },
  });

  const app = () => {
    // Build Sagemaker Inference Endpoint
    defaults.deploySagemakerEndpoint(stack, 'test', {
      modelProps: {
        primaryContainer: {
          image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
          modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
        },
      },
      vpc,
    });
  };
  // Assertion 1
  expect(app).toThrowError();
});

// ---------------------------
// Prop Tests
// ---------------------------
test('Test fail SageMaker endpoint check', () => {
  const stack = new Stack();

  // Build Sagemaker Inference Endpoint
  const modelProps = {
    primaryContainer: {
      image: "<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest",
      modelDataUrl: "s3://<bucket-name>/<prefix>/model.tar.gz",
    },
  };

  const buildSagemakerEndpointResponse = BuildSagemakerEndpoint(stack, 'test', { modelProps });

  const props: defaults.SagemakerProps = {
    existingSagemakerEndpointObj: buildSagemakerEndpointResponse.endpoint,
    endpointProps: {
      endpointConfigName: 'placeholder'
    }
  };

  const app = () => {
    defaults.CheckSagemakerProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide endpointProps or existingSagemakerEndpointObj, but not both.\n');
});
