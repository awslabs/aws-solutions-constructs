/**
 *  CopyrightAmazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { Route53ToAlb, Route53ToAlbProps } from '../lib';
import * as r53 from 'aws-cdk-lib/aws-route53';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import '@aws-cdk/assert/jest';
import * as defaults from '@aws-solutions-constructs/core';

test('Test Public API, new VPC', () => {
  // Initial Setup
  const stack = new Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const newZone = new r53.PublicHostedZone(stack, 'test-zone', {
    zoneName: 'www.example-test.com'
  });

  const props: Route53ToAlbProps = {
    publicApi: true,
    existingHostedZoneInterface: newZone,
  };

  new Route53ToAlb(stack, 'test-route53-alb', props);

  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    Scheme: 'internet-facing'
  });

  expect(stack).toHaveResourceLike('AWS::EC2::VPC', {
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
    InstanceTenancy: "default",
  });

  expect(stack).toHaveResourceLike('AWS::Route53::RecordSet', {
    Name: 'www.example-test.com.',
    Type: 'A'
  });

});

test('Test Private API, existing VPC', () => {
  // Initial Setup
  const stack = new Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const testExistingVpc = defaults.getTestVpc(stack);

  const newZone = new r53.PrivateHostedZone(stack, 'test-zone', {
    zoneName: 'www.example-test.com',
    vpc: testExistingVpc
  });

  const props: Route53ToAlbProps = {
    publicApi: false,
    existingHostedZoneInterface: newZone,
    existingVpc: testExistingVpc
  };

  new Route53ToAlb(stack, 'test-route53-alb', props);

  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    Scheme: 'internal'
  });

  expect(stack).toHaveResourceLike('AWS::EC2::VPC', {
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
    InstanceTenancy: "default",
  });

  expect(stack).toHaveResourceLike('AWS::Route53::RecordSet', {
    Name: 'www.example-test.com.',
    Type: 'A'
  });

});

test('Test Private API, new VPC', () => {
  // Initial Setup
  const stack = new Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const props: Route53ToAlbProps = {
    publicApi: false,
    privateHostedZoneProps: {
      zoneName: 'www.example-test.com',
    }
  };

  new Route53ToAlb(stack, 'test-route53-alb', props);

  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    Scheme: 'internal'
  });

  expect(stack).toHaveResourceLike('AWS::EC2::VPC', {
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
    InstanceTenancy: "default",
  });

  expect(stack).toHaveResourceLike('AWS::Route53::RecordSet', {
    Name: 'www.example-test.com.',
    Type: 'A'
  });

});

test('Check publicApi and zone props is an error', () => {
  // Initial Setup
  const stack = new Stack();

  const testExistingVpc = defaults.getTestVpc(stack);

  const props: Route53ToAlbProps = {
    publicApi: true,
    existingVpc: testExistingVpc,
    privateHostedZoneProps: {
      zoneName: 'www.example-test.com',
    }
  };

  const app = () => {
    new Route53ToAlb(stack, 'test-error', props);
  };
  // Assertion
  expect(app).toThrowError();
});

test('Check no Zone props and no existing zone interface is an error', () => {
  // Initial Setup
  const stack = new Stack();

  const testExistingVpc = defaults.getTestVpc(stack);

  const props: Route53ToAlbProps = {
    publicApi: false,
    existingVpc: testExistingVpc,
  };

  const app = () => {
    new Route53ToAlb(stack, 'test-error', props);
  };
  // Assertion
  expect(app).toThrowError();
});

test('Check Zone props with VPC is an error', () => {
  // Initial Setup
  const stack = new Stack();

  const testExistingVpc = defaults.getTestVpc(stack);

  const props: Route53ToAlbProps = {
    publicApi: false,
    existingVpc: testExistingVpc,
    privateHostedZoneProps: {
      zoneName: 'www.example-test.com',
      vpc: testExistingVpc
    }
  };

  const app = () => {
    new Route53ToAlb(stack, 'test-error', props);
  };
  // Assertion
  expect(app).toThrowError();

});

test('Test with privateHostedZoneProps', () => {
  // Initial Setup
  const stack = new Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const testExistingVpc = defaults.getTestVpc(stack);

  const props: Route53ToAlbProps = {
    publicApi: false,
    existingVpc: testExistingVpc,
    privateHostedZoneProps: {
      zoneName: 'www.example-test.com',
    }
  };

  new Route53ToAlb(stack, 'test-error', props);

  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    Scheme: 'internal'
  });

  expect(stack).toHaveResourceLike('AWS::EC2::VPC', {
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
    InstanceTenancy: "default",
  });

  expect(stack).toHaveResourceLike('AWS::Route53::RecordSet', {
    Name: 'www.example-test.com.',
    Type: 'A'
  });
});

test('Check that passing an existing hosted Zone without passing an existingVPC is an error', () => {
  const stack = new Stack();

  const testExistingVpc = defaults.getTestVpc(stack);

  const newZone = new r53.PrivateHostedZone(stack, 'test-zone', {
    zoneName: 'www.example-test.com',
    vpc: testExistingVpc
  });

  const props: Route53ToAlbProps = {
    publicApi: false,
    existingHostedZoneInterface: newZone,
  };

  const app = () => {
    new Route53ToAlb(stack, 'test-error', props);
  };
  // Assertion
  expect(app).toThrowError();

});

test('Check that passing an existing Load Balancer without passing an existingVPC is an error', () => {
  const stack = new Stack();

  const testExistingVpc = defaults.getTestVpc(stack);

  const existingAlb = new elb.ApplicationLoadBalancer(stack, 'test-alb', {
    vpc: testExistingVpc
  });

  const props: Route53ToAlbProps = {
    publicApi: false,
    existingLoadBalancerObj: existingAlb,
    privateHostedZoneProps: {
      zoneName: 'www.example-test.com',
    }
  };

  const app = () => {
    new Route53ToAlb(stack, 'test-error', props);
  };
  // Assertion
  expect(app).toThrowError();

});

test('Check that passing an existing ALB without passing an existingVPC is an error', () => {
  const stack = new Stack();

  const testExistingVpc = defaults.getTestVpc(stack);

  const newZone = new r53.PrivateHostedZone(stack, 'test-zone', {
    zoneName: 'www.example-test.com',
    vpc: testExistingVpc
  });

  const props: Route53ToAlbProps = {
    publicApi: false,
    existingHostedZoneInterface: newZone,
  };

  const app = () => {
    new Route53ToAlb(stack, 'test-error', props);
  };
  // Assertion
  expect(app).toThrowError();

});

test('Check that passing loadBalancerProps with a vpc is an error', () => {
  const stack = new Stack();

  const testExistingVpc = defaults.getTestVpc(stack);

  const newZone = new r53.PrivateHostedZone(stack, 'test-zone', {
    zoneName: 'www.example-test.com',
    vpc: testExistingVpc
  });

  const props: Route53ToAlbProps = {
    publicApi: false,
    existingHostedZoneInterface: newZone,
    loadBalancerProps: {
      loadBalancerName: 'my-alb',
      vpc: testExistingVpc,
    }
  };

  const app = () => {
    new Route53ToAlb(stack, 'test-error', props);
  };
  // Assertion
  expect(app).toThrowError();

});

test('Test providing loadBalancerProps', () => {
  // Initial Setup
  const stack = new Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const testExistingVpc = defaults.getTestVpc(stack);

  const newZone = new r53.PrivateHostedZone(stack, 'test-zone', {
    zoneName: 'www.example-test.com',
    vpc: testExistingVpc
  });

  const props: Route53ToAlbProps = {
    publicApi: false,
    existingHostedZoneInterface: newZone,
    existingVpc: testExistingVpc,
    loadBalancerProps: {
      loadBalancerName: 'find-this-name'
    },
  };

  new Route53ToAlb(stack, 'test-route53-alb', props);

  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    Scheme: 'internal',
    Name: 'find-this-name'
  });

  expect(stack).toHaveResourceLike('AWS::EC2::VPC', {
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
    InstanceTenancy: "default",
  });

  expect(stack).toHaveResourceLike('AWS::Route53::RecordSet', {
    Name: 'www.example-test.com.',
    Type: 'A'
  });

});

test('Test providing an existingLoadBalancer', () => {
  // Initial Setup
  const stack = new Stack();

  const testExistingVpc = defaults.getTestVpc(stack);

  const newZone = new r53.PrivateHostedZone(stack, 'test-zone', {
    zoneName: 'www.example-test.com',
    vpc: testExistingVpc
  });

  const existingAlb = new elb.ApplicationLoadBalancer(stack, 'test-alb', {
    vpc: testExistingVpc,
    loadBalancerName: 'find-this-name'
  });

  const props: Route53ToAlbProps = {
    publicApi: false,
    existingHostedZoneInterface: newZone,
    existingVpc: testExistingVpc,
    existingLoadBalancerObj: existingAlb,
  };

  new Route53ToAlb(stack, 'test-route53-alb', props);

  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    Scheme: 'internal',
    Name: 'find-this-name'
  });

  expect(stack).toHaveResourceLike('AWS::EC2::VPC', {
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
    InstanceTenancy: "default",
  });

  expect(stack).toHaveResourceLike('AWS::Route53::RecordSet', {
    Name: 'www.example-test.com.',
    Type: 'A'
  });

});

test('Check publicApi and without an existing hosted zone is an error', () => {
  // Initial Setup
  const stack = new Stack();

  const testExistingVpc = defaults.getTestVpc(stack);

  const props: Route53ToAlbProps = {
    publicApi: true,
    existingVpc: testExistingVpc,
  };

  const app = () => {
    new Route53ToAlb(stack, 'test-error', props);
  };
  // Assertion
  expect(app).toThrowError();
});
