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

import { AlbToFargate, AlbToFargateProps } from "../lib";
// import * as ecs from '@aws-cdk/aws-ecs';
import * as elb from '@aws-cdk/aws-elasticloadbalancingv2';
import * as cdk from "@aws-cdk/core";
import '@aws-cdk/assert/jest';
import * as defaults from '@aws-solutions-constructs/core';

const testEcrRepoArn = 'arn:aws:ecr:us-east-1:123456789012:repository/fake-repo';

test('Test new vpc, load balancer, service', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });
  const testProps: AlbToFargateProps = {
    publicApi: true,
    ecrRepositoryArn: testEcrRepoArn,
    listenerProps: {
      protocol: 'HTTP'
    },
  };

  new AlbToFargate(stack, 'test-construct', testProps);

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    LaunchType: 'FARGATE'
  });
  expect(stack).toHaveResource('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP'
  });
  expect(stack).not.toHaveResource('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTPS'
  });
  expect(stack).toHaveResource('AWS::EC2::VPC', {
    EnableDnsHostnames: true,
    CidrBlock: '10.0.0.0/16',
  });
});

test('Test new load balancer, service, existing vpc', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });
  const testProps: AlbToFargateProps = {
    existingVpc: defaults.getTestVpc(stack),
    publicApi: true,
    ecrRepositoryArn: testEcrRepoArn,
    listenerProps: {
      protocol: 'HTTP'
    },
  };

  new AlbToFargate(stack, 'test-construct', testProps);

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    LaunchType: 'FARGATE'
  });
  expect(stack).toHaveResource('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP'
  });
  expect(stack).toHaveResource('AWS::EC2::VPC', {
    EnableDnsHostnames: true,
    CidrBlock: '172.168.0.0/16'
  });
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
});

test('Test new service, existing load balancer, vpc', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });
  const testName = 'test-value';

  const testExistingVpc = defaults.getTestVpc(stack);

  const existingAlb = new elb.ApplicationLoadBalancer(stack, 'test-alb', {
    vpc: testExistingVpc,
    internetFacing: true,
    loadBalancerName: testName,
  });

  const testProps: AlbToFargateProps = {
    existingVpc: testExistingVpc,
    publicApi: true,
    ecrRepositoryArn: testEcrRepoArn,
    existingLoadBalancerObj: existingAlb,
    listenerProps: {
      protocol: 'HTTP'
    },
  };

  new AlbToFargate(stack, 'test-construct', testProps);

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    LaunchType: 'FARGATE'
  });
  expect(stack).toCountResources('AWS::ECS::Service', 1);
  expect(stack).toHaveResource('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP'
  });
  expect(stack).toCountResources('AWS::ElasticLoadBalancingV2::Listener', 1);
  expect(stack).toHaveResource('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    Name: testName
  });
  expect(stack).toCountResources('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
  expect(stack).toHaveResource('AWS::EC2::VPC', {
    EnableDnsHostnames: true,
    CidrBlock: '172.168.0.0/16'
  });
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
});

test('Test existing load balancer, vpc, service', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });
  const testName = 'test-value';

  const testExistingVpc = defaults.getTestVpc(stack);

  const [testService, testContainer] = defaults.CreateFargateService(stack,
    'test',
    testExistingVpc,
    undefined,
    testEcrRepoArn);

  const existingAlb = new elb.ApplicationLoadBalancer(stack, 'test-alb', {
    vpc: testExistingVpc,
    internetFacing: true,
    loadBalancerName: testName,
  });

  const testProps: AlbToFargateProps = {
    existingVpc: testExistingVpc,
    publicApi: true,
    existingFargateServiceObject: testService,
    existingContainerDefinitionObject: testContainer,
    existingLoadBalancerObj: existingAlb,
    listenerProps: {
      protocol: 'HTTP'
    },
  };

  new AlbToFargate(stack, 'test-construct', testProps);

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    LaunchType: 'FARGATE'
  });
  expect(stack).toCountResources('AWS::ECS::Service', 1);
  expect(stack).toHaveResource('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP'
  });
  expect(stack).toCountResources('AWS::ElasticLoadBalancingV2::Listener', 1);
  expect(stack).toHaveResource('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    Name: testName
  });
  expect(stack).toCountResources('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
  expect(stack).toHaveResource('AWS::EC2::VPC', {
    EnableDnsHostnames: true,
    CidrBlock: '172.168.0.0/16'
  });
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
});

test('Test add a second target with rules', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });
  const testProps: AlbToFargateProps = {
    existingVpc: defaults.getTestVpc(stack),
    publicApi: true,
    ecrRepositoryArn: testEcrRepoArn,
    listenerProps: {
      protocol: 'HTTP'
    },
  };

  const firstConstruct = new AlbToFargate(stack, 'test-construct', testProps);

  const testPropsTwo: AlbToFargateProps = {
    existingVpc: firstConstruct.vpc,
    existingContainerDefinitionObject: firstConstruct.container,
    existingFargateServiceObject: firstConstruct.service,
    existingLoadBalancerObj: firstConstruct.loadBalancer,
    publicApi: true,
    ruleProps: {
      conditions: [elb.ListenerCondition.pathPatterns(["*admin*"])],
      priority: 10
    },
  };

  new AlbToFargate(stack, 'test-two-construct', testPropsTwo);

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    LaunchType: 'FARGATE'
  });
  expect(stack).toHaveResource('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP'
  });
  expect(stack).toCountResources('AWS::ElasticLoadBalancingV2::TargetGroup', 2);
  expect(stack).toCountResources('AWS::ElasticLoadBalancingV2::ListenerRule', 1);
  expect(stack).toHaveResource('AWS::EC2::VPC', {
    EnableDnsHostnames: true,
    CidrBlock: '172.168.0.0/16'
  });
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
});

test('Test new vpc, load balancer, service - custom Service Props', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });
  const testValue = 'test-value';

  const testProps: AlbToFargateProps = {
    publicApi: true,
    ecrRepositoryArn: testEcrRepoArn,
    listenerProps: {
      protocol: 'HTTP'
    },
    fargateServiceProps: {
      serviceName: testValue
    }
  };

  new AlbToFargate(stack, 'test-construct', testProps);

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    LaunchType: 'FARGATE',
    ServiceName: testValue,
  });
  expect(stack).toHaveResource('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP'
  });
  expect(stack).not.toHaveResource('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTPS'
  });
  expect(stack).toHaveResource('AWS::EC2::VPC', {
    EnableDnsHostnames: true
  });
});

test('Test new vpc, load balancer, service - custom VPC Props', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });
  const testCidr = '192.0.0.0/19';

  const testProps: AlbToFargateProps = {
    publicApi: true,
    ecrRepositoryArn: testEcrRepoArn,
    listenerProps: {
      protocol: 'HTTP'
    },
    vpcProps: { cidr: testCidr },
  };

  new AlbToFargate(stack, 'test-construct', testProps);

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    LaunchType: 'FARGATE',
  });
  expect(stack).toHaveResource('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP'
  });
  expect(stack).not.toHaveResource('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTPS'
  });
  expect(stack).toHaveResource('AWS::EC2::VPC', {
    EnableDnsHostnames: true,
    CidrBlock: testCidr,
  });
});

test('Test new vpc, load balancer, service - custom LoadBalancer and targetGroup Props', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });
  const testLoadBalancerName = "test-lb";
  const testTargetGroupName = 'test-tg';

  const testProps: AlbToFargateProps = {
    publicApi: true,
    ecrRepositoryArn: testEcrRepoArn,
    listenerProps: {
      protocol: 'HTTP'
    },
    loadBalancerProps: {
      loadBalancerName: testLoadBalancerName,
    },
    targetGroupProps: {
      targetGroupName: testTargetGroupName,
    }
  };

  new AlbToFargate(stack, 'test-construct', testProps);

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    LaunchType: 'FARGATE',
  });
  expect(stack).toHaveResource('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP'
  });
  expect(stack).not.toHaveResource('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTPS'
  });
  expect(stack).toHaveResource('AWS::EC2::VPC', {
    EnableDnsHostnames: true,
  });
  expect(stack).toHaveResource('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    Name: testLoadBalancerName
  });
  expect(stack).toHaveResource('AWS::ElasticLoadBalancingV2::TargetGroup', {
    Name: testTargetGroupName
  });
});

test('Test HTTPS API with new vpc, load balancer, service', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });
  const testCert = defaults.getFakeCertificate(stack, 'fake-cert');

  const testProps: AlbToFargateProps = {
    publicApi: true,
    ecrRepositoryArn: testEcrRepoArn,
    listenerProps: {
      protocol: 'HTTPS',
      certificates: [ testCert ]
    },
  };

  new AlbToFargate(stack, 'test-construct', testProps);

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    LaunchType: 'FARGATE'
  });
  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP',
    DefaultActions: [
      {
        RedirectConfig: {
          Port: "443",
          Protocol: "HTTPS",
          StatusCode: "HTTP_302"
        },
        Type: "redirect"
      }
    ],
  });
  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTPS',
    Port: 443,
  });
  expect(stack).toHaveResource('AWS::EC2::VPC', {
    EnableDnsHostnames: true
  });
});

test('Test HTTPS API with new vpc, load balancer, service and private API', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });
  const testCert = defaults.getFakeCertificate(stack, 'fake-cert');

  const testProps: AlbToFargateProps = {
    publicApi: false,
    ecrRepositoryArn: testEcrRepoArn,
    listenerProps: {
      protocol: 'HTTPS',
      certificates: [ testCert ]
    },
  };

  new AlbToFargate(stack, 'test-construct', testProps);

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    LaunchType: 'FARGATE'
  });
  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP',
    DefaultActions: [
      {
        RedirectConfig: {
          Port: "443",
          Protocol: "HTTPS",
          StatusCode: "HTTP_302"
        },
        Type: "redirect"
      }
    ],
  });
  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTPS',
    Port: 443,
  });
  expect(stack).toHaveResource('AWS::EC2::VPC', {
    EnableDnsHostnames: true,
  });
  expect(stack).toCountResources("AWS::EC2::Subnet", 3);
  expect(stack).toHaveResource("AWS::EC2::Subnet", {
    Tags: [
      {
        Key: "aws-cdk:subnet-name",
        Value: "isolated"
      },
      {
        Key: "aws-cdk:subnet-type",
        Value: "Isolated"
      },
      {
        Key: "Name",
        Value: "Default/Vpc/isolatedSubnet1"
      }
    ]
  });
  expect(stack).not.toHaveResource("AWS::EC2::Subnet", {
    Tags: [
      {
        Key: "aws-cdk:subnet-name",
        Value: "Public"
      },
      {
        Key: "aws-cdk:subnet-type",
        Value: "Public"
      },
      {
        Key: "Name",
        Value: "Default/Vpc/PublicSubnet1"
      }
    ]
  });
});
