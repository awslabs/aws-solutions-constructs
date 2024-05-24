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
import * as defaults from '../';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template } from 'aws-cdk-lib/assertions';
import { AddAwsServiceEndpoint, ServiceEndpointTypes } from '../lib/vpc-helper';
import { DefaultPublicPrivateVpcProps, DefaultIsolatedVpcProps } from '../lib/vpc-defaults';

test("Test minimal deployment with no properties", () => {
  // Stack
  const stack = new Stack();
  // Build VPC
  defaults.buildVpc(stack, {
    defaultVpcProps: DefaultIsolatedVpcProps(),
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::EC2::VPC', {
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });

  template.resourceCountIs('AWS::EC2::Subnet', 2);
  template.resourceCountIs('AWS::EC2::InternetGateway', 0);
});

test('Test deployment w/ user provided custom properties', () => {
  // Stack
  const stack = new Stack();
  // Build VPC
  defaults.buildVpc(stack, {
    defaultVpcProps: DefaultPublicPrivateVpcProps(),
    userVpcProps: {
      enableDnsHostnames: false,
      enableDnsSupport: false,
      ipAddresses: ec2.IpAddresses.cidr('172.168.0.0/19'),
    },
  });
  Template.fromStack(stack).hasResourceProperties('AWS::EC2::VPC', {
    CidrBlock: '172.168.0.0/19',
    EnableDnsHostnames: false,
    EnableDnsSupport: false,
  });
});

test('Test deployment w/ construct provided custom properties', () => {
  // Stack
  const stack = new Stack();
  // Build VPC
  defaults.buildVpc(stack, {
    defaultVpcProps: DefaultPublicPrivateVpcProps(),
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true,
      ipAddresses: ec2.IpAddresses.cidr('172.168.0.0/19'),
    },
  });
  Template.fromStack(stack).hasResourceProperties('AWS::EC2::VPC', {
    CidrBlock: '172.168.0.0/19',
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });
});

test('Test deployment w/ construct and user provided custom properties', () => {
  // Stack
  const stack = new Stack();
  // Build VPC
  defaults.buildVpc(stack, {
    defaultVpcProps: DefaultPublicPrivateVpcProps(),
    userVpcProps: {
      enableDnsHostnames: false,
      enableDnsSupport: false,
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
    },
    constructVpcProps: {
      enableDnsHostnames: false,
      enableDnsSupport: false,
      ipAddresses: ec2.IpAddresses.cidr('172.168.0.0/19'),
    },
  });
  Template.fromStack(stack).hasResourceProperties('AWS::EC2::VPC', {
    CidrBlock: '172.168.0.0/19',
    EnableDnsHostnames: false,
    EnableDnsSupport: false,
  });
});

test('Test deployment w/ construct and user provided custom properties', () => {
  // Stack
  const stack = new Stack();
  // Build VPC
  const v = defaults.buildVpc(stack, {
    defaultVpcProps: DefaultPublicPrivateVpcProps(),
    userVpcProps: {
      enableDnsHostnames: false,
      enableDnsSupport: false,
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
    },
    constructVpcProps: {
      enableDnsHostnames: true,
      enableDnsSupport: true,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 18,
          name: 'isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    },
  });
  AddAwsServiceEndpoint(stack, v, defaults.ServiceEndpointTypes.SQS);

  // Expect 2 isolated subnets (usual error condition is 2 public/2 private)
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::EC2::Subnet', 2);
  template.resourceCountIs('AWS::EC2::InternetGateway', 0);
});

test('Test deployment w/ existing VPC provided', () => {
  // Stack
  const stack = new Stack();
  // Build VPC
  const testExistingVpc = defaults.getTestVpc(stack);

  const newVpc = defaults.buildVpc(stack, {
    defaultVpcProps: DefaultPublicPrivateVpcProps(),
    existingVpc: testExistingVpc,
  });

  expect(newVpc).toBe(testExistingVpc);
});

test('Test adding Gateway Endpoint', () => {
  // Stack
  const stack = new Stack();
  // Build VPC
  const testVpc = defaults.buildVpc(stack, {
    defaultVpcProps: DefaultPublicPrivateVpcProps(),
  });

  AddAwsServiceEndpoint(stack, testVpc, ServiceEndpointTypes.DYNAMODB);
  AddAwsServiceEndpoint(stack, testVpc, ServiceEndpointTypes.SQS);
  AddAwsServiceEndpoint(stack, testVpc, ServiceEndpointTypes.SNS);

  // Assertion
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
    VpcEndpointType: 'Gateway',
  });
  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
    VpcEndpointType: 'Interface',
  });
  template.resourceCountIs('AWS::EC2::VPCEndpoint', 3);
});

test('Test adding Interface Endpoint', () => {
  // Stack
  const stack = new Stack();
  // Build VPC
  const testVpc = defaults.buildVpc(stack, {
    defaultVpcProps: DefaultPublicPrivateVpcProps(),
  });

  AddAwsServiceEndpoint(stack, testVpc, ServiceEndpointTypes.SNS);

  // Assertion
  Template.fromStack(stack).hasResourceProperties('AWS::EC2::VPCEndpoint', {
    VpcEndpointType: 'Interface',
  });
});

test('Test adding SAGEMAKER_RUNTIME Interface Endpoint', () => {
  // Stack
  const stack = new Stack();
  // Build VPC
  const testVpc = defaults.buildVpc(stack, {
    defaultVpcProps: DefaultPublicPrivateVpcProps(),
  });

  AddAwsServiceEndpoint(stack, testVpc, ServiceEndpointTypes.SAGEMAKER_RUNTIME);

  // Assertion
  Template.fromStack(stack).hasResourceProperties('AWS::EC2::VPCEndpoint', {
    VpcEndpointType: 'Interface',
  });
});

test('Test adding a second Endpoint of same service', () => {
  // Stack
  const stack = new Stack();
  // Build VPC
  const testVpc = defaults.buildVpc(stack, {
    defaultVpcProps: DefaultPublicPrivateVpcProps(),
  });

  AddAwsServiceEndpoint(stack, testVpc, ServiceEndpointTypes.SNS);
  AddAwsServiceEndpoint(stack, testVpc, ServiceEndpointTypes.SNS);

  // Assertion
  Template.fromStack(stack).resourceCountIs('AWS::EC2::VPCEndpoint', 1);
});

test('Test adding bad Endpoint', () => {
  // Stack
  const stack = new Stack();
  // Build VPC
  const testVpc = defaults.buildVpc(stack, {
    defaultVpcProps: DefaultPublicPrivateVpcProps(),
  });

  const app = () => {
    AddAwsServiceEndpoint(stack, testVpc, 'string' as ServiceEndpointTypes);
  };
  // Assertion
  expect(app).toThrowError();
});

test('Test adding Events Interface Endpoint', () => {
  // Stack
  const stack = new Stack();
  // Build VPC
  const testVpc = defaults.buildVpc(stack, {
    defaultVpcProps: DefaultPublicPrivateVpcProps(),
  });

  AddAwsServiceEndpoint(stack, testVpc, ServiceEndpointTypes.EVENTS);

  // Assertion
  Template.fromStack(stack).hasResourceProperties('AWS::EC2::VPCEndpoint', {
    VpcEndpointType: 'Interface',
  });
});

// ---------------------------
// Prop Tests
// ---------------------------
test('Test fail Vpc check with deployVpc', () => {
  const stack = new Stack();

  const props: defaults.VpcPropsSet = {
    deployVpc: true,
    existingVpc: defaults.buildVpc(stack, {
      defaultVpcProps: defaults.DefaultPublicPrivateVpcProps(),
    }),
  };

  const app = () => {
    defaults.CheckVpcProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide an existingVpc or some combination of deployVpc and vpcProps, but not both.\n');
});

test('Test fail Vpc check with vpcProps', () => {
  const stack = new Stack();

  const props: defaults.VpcPropsSet = {
    vpcProps: defaults.DefaultPublicPrivateVpcProps(),
    existingVpc: defaults.buildVpc(stack, {
      defaultVpcProps: defaults.DefaultPublicPrivateVpcProps(),
    }),
  };

  const app = () => {
    defaults.CheckVpcProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide an existingVpc or some combination of deployVpc and vpcProps, but not both.\n');
});
