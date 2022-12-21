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

import { AlbToFargate, AlbToFargateProps } from "../lib";
// import * as ecs from '@aws-cdk/aws-ecs';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as cdk from "aws-cdk-lib";
import '@aws-cdk/assert/jest';
import * as defaults from '@aws-solutions-constructs/core';

test('Test new vpc, load balancer, service', () => {
  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });
  const testProps: AlbToFargateProps = {
    publicApi: true,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
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
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
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

  const existingVpc = defaults.getTestVpc(stack);

  const existingAlb = new elb.ApplicationLoadBalancer(stack, 'test-alb', {
    vpc: existingVpc,
    internetFacing: true,
    loadBalancerName: testName,
  });

  const testProps: AlbToFargateProps = {
    existingVpc,
    publicApi: true,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
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

  const existingVpc = defaults.getTestVpc(stack);

  const [testService, testContainer] = defaults.CreateFargateService(stack,
    'test',
    existingVpc,
    undefined,
    defaults.fakeEcrRepoArn);

  const existingAlb = new elb.ApplicationLoadBalancer(stack, 'test-alb', {
    vpc: existingVpc,
    internetFacing: true,
    loadBalancerName: testName,
  });

  const testProps: AlbToFargateProps = {
    existingVpc,
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
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
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
  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::ListenerRule', {
    Conditions: [
      {
        Field: "path-pattern",
        PathPatternConfig: {
          Values: [
            "*admin*"
          ]
        }
      }
    ],
  });
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
  const serviceName = 'test-value';

  const testProps: AlbToFargateProps = {
    publicApi: true,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    listenerProps: {
      protocol: 'HTTP'
    },
    fargateServiceProps: {
      serviceName
    }
  };

  new AlbToFargate(stack, 'test-construct', testProps);

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    LaunchType: 'FARGATE',
    ServiceName: serviceName,
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
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
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
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
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
  const fakeCert = defaults.getFakeCertificate(stack, 'fake-cert');

  const testProps: AlbToFargateProps = {
    publicApi: true,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    listenerProps: {
      protocol: 'HTTPS',
      certificates: [ fakeCert ]
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
  const fakeCert = defaults.getFakeCertificate(stack, 'fake-cert');

  const testProps: AlbToFargateProps = {
    publicApi: false,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    listenerProps: {
      protocol: 'HTTPS',
      certificates: [ fakeCert ]
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
