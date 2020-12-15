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

import { Stack } from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import * as kms from "@aws-cdk/aws-kms";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as defaults from '../';
import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';

// --------------------------------------------------------------
// Test minimal deployment with no properties
// --------------------------------------------------------------
test('Test minimal deployment with no properties', () => {
  // Stack
  const stack = new Stack();
  const sagemakerRole = new iam.Role(stack, "SagemakerRole", {
    assumedBy: new iam.ServicePrincipal("sagemaker.amazonaws.com"),
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
  const sagemakerRole = new iam.Role(stack, "SagemakerRole", {
    assumedBy: new iam.ServicePrincipal("sagemaker.amazonaws.com"),
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
  const sagemakerRole = new iam.Role(stack, "SagemakerRole", {
    assumedBy: new iam.ServicePrincipal("sagemaker.amazonaws.com"),
  });
    // Build SageMaker Notebook Instance
  defaults.buildSagemakerNotebook(stack, {
    role: sagemakerRole,
    deployInsideVpc: false
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
  const sagemakerRole = new iam.Role(stack, "SagemakerRole", {
    assumedBy: new iam.ServicePrincipal("sagemaker.amazonaws.com"),
  });
    // Build SageMaker Notebook Instance
  defaults.buildSagemakerNotebook(stack, {
    role: sagemakerRole,
    deployInsideVpc: true,
    sagemakerNotebookProps: {
      subnetId: 'subnet-deadbeef',
      securityGroupIds: ['sg-deadbeef']
    }
  });
  expect(stack).toHaveResource("AWS::SageMaker::NotebookInstance", {
    DirectInternetAccess: "Disabled",
    SecurityGroupIds: [
      "sg-deadbeef"
    ],
    SubnetId: "subnet-deadbeef"
  });

});

// --------------------------------------------------------------
// Test deployment with override
// --------------------------------------------------------------
test('Test deployment w/ override', () => {
  // Stack
  const stack = new Stack();
  const sagemakerRole = new iam.Role(stack, "SagemakerRole", {
    assumedBy: new iam.ServicePrincipal("sagemaker.amazonaws.com"),
  });
  const key = new kms.Key(stack, 'MyEncryptionKey');
  // Build SageMaker Notebook Instance
  defaults.buildSagemakerNotebook(stack, {
    role: sagemakerRole,
    sagemakerNotebookProps: {
      instanceType: 'ml.c4.2xlarge',
      kmsKeyId: key.keyArn
    }
  });
  expect(stack).toHaveResource("AWS::SageMaker::NotebookInstance", {
    DirectInternetAccess: "Disabled",
    InstanceType: "ml.c4.2xlarge",
    KmsKeyId: {
      "Fn::GetAtt": [
        "MyEncryptionKeyD795679F",
        "Arn"
      ]
    }
  });
});

// --------------------------------------------------------------
// Test exception
// --------------------------------------------------------------
test('Test exception', () => {
  // Stack
  const stack = new Stack();
  const sagemakerRole = new iam.Role(stack, "SagemakerRole", {
    assumedBy: new iam.ServicePrincipal("sagemaker.amazonaws.com"),
  });

  expect(() => {
    // Build SageMaker Notebook Instance
    defaults.buildSagemakerNotebook(stack, {
      role: sagemakerRole,
      deployInsideVpc: true,
      sagemakerNotebookProps: {
        subnetId: 'subnet-deadbeef',
      }
    });
  }).toThrowError();
});
