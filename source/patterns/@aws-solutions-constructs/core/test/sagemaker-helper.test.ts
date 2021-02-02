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
  // Build Sagemaker Notebook Instance
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

  // Build Sagemaker Notebook Instance
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
  // Build Sagemaker Notebook Instance
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
  // Build Sagemaker Notebook Instance
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
  // Build Sagemaker Notebook Instance
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
// Test deployment with existing Sagemaker Notebook instance
// ----------------------------------------------------------
test('Test deployment with existing Sagemaker Notebook instance', () => {
  // Stack
  const stack = new Stack();
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });
  // Build Sagemaker Notebook Instance
  const [noteBookInstance] = defaults.buildSagemakerNotebook(stack, {
    role: sagemakerRole,
  });

  // Build Sagemaker Notebook Instance
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
    // Build Sagemaker Notebook Instance
    defaults.buildSagemakerNotebook(stack, {
      role: sagemakerRole,
      deployInsideVpc: true,
      sagemakerNotebookProps: {
        subnetId: 'subnet-deadbeef',
      },
    });
  }).toThrowError();
});

// --------------------------------------------------------------------------------------
// Test minimal deployment of Sagemaker Inference Endpoint no VPC using internal IAM role
// --------------------------------------------------------------------------------------
test('Test minimal deployment with no properties using internal IAM role', () => {
  // Stack
  const stack = new Stack();
  // Build Sagemaker Inference Endpoint
  defaults.BuildSagemakerEndpoint(stack, {
    modelProps: {
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
  });
  // Assertion
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// ----------------------------------------------------------------
// Test minimal deployment of Sagemaker Inference Endpoint with VPC
// ----------------------------------------------------------------
test('Test minimal deployment of Sagemaker Inference Endpoint with VPC', () => {
  // Stack
  const stack = new Stack();

  // create a VPC with required VPC S3 gateway and SAGEMAKER_RUNTIME Interface
  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultIsolatedVpcProps(),
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true,
    },
  });

  // Add S3 VPC Gateway Endpint, required by Sagemaker to access Models artifacts via AWS private network
  defaults.AddAwsServiceEndpoint(stack, vpc, defaults.ServiceEndpointTypes.S3);
  // Add SAGEMAKER_RUNTIME VPC Interface Endpint, required by the lambda function to invoke the SageMaker endpoint
  defaults.AddAwsServiceEndpoint(stack, vpc, defaults.ServiceEndpointTypes.SAGEMAKER_RUNTIME);

  // Build Sagemaker Inference Endpoint
  defaults.BuildSagemakerEndpoint(stack, {
    modelProps: {
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
    vpc,
  });
  // Assertion
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// // ---------------------------------------------------------------------------
// // Test minimal deployment of Sagemaker Inference Endpoint with VPC/NatGateway
// // ---------------------------------------------------------------------------
// test('Test minimal deployment of Sagemaker Inference Endpoint with VPC/NatGateway', () => {
//   // Stack
//   const stack = new Stack();
//   // Create IAM Role to be assumed by Sagemaker
//   const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
//     assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
//   });
//   sagemakerRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'));
//   sagemakerRole.addToPolicy(
//     new iam.PolicyStatement({
//       actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
//       resources: ['arn:aws:s3:::*'],
//     })
//   );

//   // create a VPC with required VPC S3 gateway and SAGEMAKER_RUNTIME Interface
//   const vpc = defaults.buildVpc(stack, {
//     defaultVpcProps: defaults.DefaultPublicPrivateVpcProps(),
//     constructVpcProps: {
//       enableDnsHostnames: true,
//       enableDnsSupport: true,
//     },
//   });

//   // Add S3 VPC Gateway Endpint, required by Sagemaker to access Models artifacts via AWS private network
//   defaults.AddAwsServiceEndpoint(stack, vpc, defaults.ServiceEndpointTypes.S3);
//   // Add SAGEMAKER_RUNTIME VPC Interface Endpint, required by the lambda function to invoke the SageMaker endpoint
//   defaults.AddAwsServiceEndpoint(stack, vpc, defaults.ServiceEndpointTypes.SAGEMAKER_RUNTIME);

//   // Build Sagemaker Inference Endpoint
//   defaults.BuildSagemakerEndpoint(stack, {
//     modelProps: {
//       executionRoleArn: sagemakerRole.roleArn,
//       primaryContainer: {
//         image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
//         modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
//       },
//     },
//     vpc,
//     role: sagemakerRole,
//   });
//   // Assertion
//   expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
// });

// -------------------------------------------------------------------------
// Test deployment of Sagemaker Inference Endpoint with properties overwrite
// -------------------------------------------------------------------------
test('Test deployment of Sagemaker Inference Endpoint with properties overwrite', () => {
  // Stack
  const stack = new Stack();

  // create a VPC with required VPC S3 gateway and SAGEMAKER_RUNTIME Interface
  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultIsolatedVpcProps(),
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true,
    },
  });

  // Add S3 VPC Gateway Endpint, required by Sagemaker to access Models artifacts via AWS private network
  defaults.AddAwsServiceEndpoint(stack, vpc, defaults.ServiceEndpointTypes.S3);
  // Add SAGEMAKER_RUNTIME VPC Interface Endpint, required by the lambda function to invoke the SageMaker endpoint
  defaults.AddAwsServiceEndpoint(stack, vpc, defaults.ServiceEndpointTypes.SAGEMAKER_RUNTIME);

  // create encryption key
  const encryptionkey = new kms.Key(stack, 'MyEndpointConfigEncryptionKey');
  // Build Sagemaker Inference Endpoint
  defaults.BuildSagemakerEndpoint(stack, {
    modelProps: {
      modelName: 'linear-learner-model',
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
          acceleratorType: 'ml.eia2.medium',
        },
      ],
      kmsKeyId: encryptionkey.keyArn,
    },
    endpointProps: {
      endpointConfigName: 'linear-learner-endpoint-config',
      endpointName: 'linear-learner-endpoint',
    },
    vpc,
  });
  // Assertion
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test deployment of existing Sagemaker Endpoint
// --------------------------------------------------------------
test('Test deployment of existing Sagemaker Endpoint', () => {
  // Stack
  const stack = new Stack();

  const [sagemakerEndpoint] = defaults.deploySagemakerEndpoint(stack, {
    modelProps: {
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
  });

  // Build Sagemaker Inference Endpoint
  defaults.BuildSagemakerEndpoint(stack, {
    existingSagemakerEndpointObj: sagemakerEndpoint,
  });
  // Assertion
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// ------------------------------------------------------------------------
// Test deployment of sagemaker endpoint with custom role
// ------------------------------------------------------------------------
test('Test deployment of sagemaker endpoint with custom role', () => {
  // Stack
  const stack = new Stack();
  // Create IAM Role to be assumed by Sagemaker
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });
  sagemakerRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'));

  // Build Sagemaker Inference Endpoint
  defaults.BuildSagemakerEndpoint(stack, {
    modelProps: {
      executionRoleArn: sagemakerRole.roleArn,
      primaryContainer: {
        image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
        modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
      },
    },
    role: sagemakerRole,
  });

  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// ---------------------------------------------------------------
// Test exception for not providing primaryContainer in modelProps
// ---------------------------------------------------------------
test('Test exception for not providing primaryContainer in modelProps', () => {
  // Stack
  const stack = new Stack();

  const app = () => {
    // Build Sagemaker Inference Endpoint
    defaults.BuildSagemakerEndpoint(stack, {
      modelProps: {},
    });
  };
  // Assertion 1
  expect(app).toThrowError();
});

// ------------------------------------------------------------------------
// Test exception for providing executionRoleArn without role
// ------------------------------------------------------------------------
test('Test exception for providing executionRoleArn without role ', () => {
  // Stack
  const stack = new Stack();
  // Create IAM Role to be assumed by Sagemaker
  const sagemakerRole = new iam.Role(stack, 'SagemakerRole', {
    assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
  });
  sagemakerRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'));

  const app = () => {
    // Build Sagemaker Inference Endpoint
    defaults.BuildSagemakerEndpoint(stack, {
      modelProps: {
        executionRoleArn: sagemakerRole.roleArn,
        primaryContainer: {
          image: '<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest',
          modelDataUrl: 's3://<bucket-name>/<prefix>/model.tar.gz',
        },
      },
    });
  };
  // Assertion 1
  expect(app).toThrowError();
});

// -------------------------------------------------------------------------
// Test exception for not providing modelProps
// -------------------------------------------------------------------------
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
    defaults.deploySagemakerEndpoint(stack, { vpc });
  };
  // Assertion 1
  expect(app).toThrowError();
});

// -------------------------------------------------------------------------
// Test exception for not providing modelProps or existingSagemkaerObj
// -------------------------------------------------------------------------
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
    defaults.BuildSagemakerEndpoint(stack, { vpc });
  };
  // Assertion 1
  expect(app).toThrowError();
});

// -----------------------------------------------------------------------------------------
// Test exception for not providing private or isolated subnets in an existing vpc
// -----------------------------------------------------------------------------------------
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
    defaults.deploySagemakerEndpoint(stack, {
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
