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

import { Stack } from "@aws-cdk/core";
import * as defaults from '../';
import * as ec2 from '@aws-cdk/aws-ec2';
import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import { AddAwsServiceEndpoint, ServiceEndpointTypes } from "../lib/vpc-helper";
import { DefaultPublicPrivateVpcProps, DefaultIsolatedVpcProps } from "../lib/vpc-defaults";

// --------------------------------------------------------------
// Test minimal Public/Private deployment with no properties
// --------------------------------------------------------------
test('Test minimal deployment with no properties', () => {
  // Stack
  const stack = new Stack();
  // Build VPC
  defaults.buildVpc(stack, {
    defaultVpcProps: DefaultPublicPrivateVpcProps()
  });
  // Assertion
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test minimal Isolated deployment with no properties
// --------------------------------------------------------------
test('Test minimal deployment with no properties', () => {
  // Stack
  const stack = new Stack();
  // Build VPC
  defaults.buildVpc(stack, {
    defaultVpcProps: DefaultIsolatedVpcProps()
  });
  // Assertion
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();

  expect(SynthUtils.toCloudFormation(stack)).toHaveResource("AWS::EC2::VPC", {
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });

  expect(SynthUtils.toCloudFormation(stack)).toCountResources("AWS::EC2::Subnet", 2);
  expect(SynthUtils.toCloudFormation(stack)).toCountResources("AWS::EC2::InternetGateway", 0);

});

// --------------------------------------------------------------
// Test deployment w/ custom CIDR
// --------------------------------------------------------------
test('Test deployment w/ custom CIDR', () => {
  // Stack
  const stack = new Stack();
  // Build VPC
  defaults.buildVpc(stack, {
    defaultVpcProps: DefaultPublicPrivateVpcProps(),
    userVpcProps: {
      cidr: '172.168.0.0/16'
    }
  });
  // Assertion
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test deployment w/ user provided custom properties
// --------------------------------------------------------------
test("Test deployment w/ user provided custom properties", () => {
  // Stack
  const stack = new Stack();
  // Build VPC
  defaults.buildVpc(stack, {
    defaultVpcProps: DefaultPublicPrivateVpcProps(),
    userVpcProps: {
      enableDnsHostnames: false,
      enableDnsSupport: false,
      cidr: '172.168.0.0/16'
    }
  });
  expect(stack).toHaveResource("AWS::EC2::VPC", {
    CidrBlock: "172.168.0.0/16",
    EnableDnsHostnames: false,
    EnableDnsSupport: false
  });
});

// --------------------------------------------------------------
// Test deployment w/ construct provided custom properties
// --------------------------------------------------------------
test("Test deployment w/ construct provided custom properties", () => {
  // Stack
  const stack = new Stack();
  // Build VPC
  defaults.buildVpc(stack, {
    defaultVpcProps: DefaultPublicPrivateVpcProps(),
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true,
      cidr: "172.168.0.0/16",
    },
  });
  expect(stack).toHaveResource("AWS::EC2::VPC", {
    CidrBlock: "172.168.0.0/16",
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });
});

// --------------------------------------------------------------
// Test deployment w/ construct and user provided custom properties
// --------------------------------------------------------------
test("Test deployment w/ construct and user provided custom properties", () => {
  // Stack
  const stack = new Stack();
  // Build VPC
  defaults.buildVpc(stack, {
    defaultVpcProps: DefaultPublicPrivateVpcProps(),
    userVpcProps: {
      enableDnsHostnames: false,
      enableDnsSupport: false,
      cidr: "10.0.0.0/16",
    },
    constructVpcProps: {
      enableDnsHostnames: false,
      enableDnsSupport: false,
      cidr: "172.168.0.0/16",
    },
  });
  expect(stack).toHaveResource("AWS::EC2::VPC", {
    CidrBlock: "172.168.0.0/16",
    EnableDnsHostnames: false,
    EnableDnsSupport: false,
  });
});

// --------------------------------------------------------------
// Test priority of default, user and construct properties
// --------------------------------------------------------------
test("Test deployment w/ construct and user provided custom properties", () => {

  // Stack
  const stack = new Stack();
  // Build VPC
  const v = defaults.buildVpc(stack, {
    defaultVpcProps: DefaultPublicPrivateVpcProps(),
    userVpcProps: {
      enableDnsHostnames: false,
      enableDnsSupport: false,
      cidr: "10.0.0.0/16",
    },
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 18,
          name: "isolated",
          subnetType: ec2.SubnetType.ISOLATED,
        },
      ],
    },
  });
  AddAwsServiceEndpoint(stack, v, defaults.ServiceEndpointTypes.SQS);

  // Expect 2 isolated subnets (usual error condition is 2 public/2 private)
  expect(stack).toCountResources("AWS::EC2::Subnet", 2);
  expect(stack).toCountResources("AWS::EC2::InternetGateway", 0);
});

// --------------------------------------------------------------
// Test deployment w/ existing VPC provided
// --------------------------------------------------------------
test("Test deployment w/ existing VPC provided", () => {
  // Stack
  const stack = new Stack();
  // Build VPC
  const testExistingVpc = defaults.buildVpc(stack, {
    defaultVpcProps: DefaultPublicPrivateVpcProps(),
    constructVpcProps: {
      enableDnsHostnames: false,
      enableDnsSupport: false,
      cidr: "172.168.0.0/16",
    },
  });

  const newVpc = defaults.buildVpc(stack, {
    defaultVpcProps: DefaultPublicPrivateVpcProps(),
    existingVpc: testExistingVpc,
  });

  expect(newVpc).toBe(testExistingVpc);
});

// --------------------------------------------------------------
// Test adding Gateway Endpoint
// --------------------------------------------------------------
test("Test adding Gateway Endpoint", () => {
  // Stack
  const stack = new Stack();
  // Build VPC
  const testVpc = defaults.buildVpc(stack, {
    defaultVpcProps: DefaultPublicPrivateVpcProps(),
  });

  AddAwsServiceEndpoint(stack, testVpc, ServiceEndpointTypes.DYNAMODB);

  // Assertion
  expect(stack).toHaveResource("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Gateway",
  });
});

// --------------------------------------------------------------
// Test adding Interface Endpoint
// --------------------------------------------------------------
test("Test adding Interface Endpoint", () => {
  // Stack
  const stack = new Stack();
  // Build VPC
  const testVpc = defaults.buildVpc(stack, {
    defaultVpcProps: DefaultPublicPrivateVpcProps(),
  });

  AddAwsServiceEndpoint(stack, testVpc, ServiceEndpointTypes.SNS);

  // Assertion
  expect(stack).toHaveResource("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Interface",
  });
});

// --------------------------------------------------------------
// Test adding a second Endpoint of same service
// --------------------------------------------------------------
test("Test adding a second Endpoint of same service", () => {
  // Stack
  const stack = new Stack();
  // Build VPC
  const testVpc = defaults.buildVpc(stack, {
    defaultVpcProps: DefaultPublicPrivateVpcProps(),
  });

  AddAwsServiceEndpoint(stack, testVpc, ServiceEndpointTypes.SNS);

  // Assertion
  expect(stack).toCountResources("AWS::EC2::VPCEndpoint", 1);
});

// --------------------------------------------------------------
// Test adding bad Endpoint
// --------------------------------------------------------------
test("Test adding bad Endpoint", () => {
  // Stack
  const stack = new Stack();
  // Build VPC
  const testVpc = defaults.buildVpc(stack, {
    defaultVpcProps: DefaultPublicPrivateVpcProps(),
  });

  const app = () => {
    AddAwsServiceEndpoint(stack, testVpc, "string" as ServiceEndpointTypes);
  };
  // Assertion
  expect(app).toThrowError();
});
