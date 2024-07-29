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
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as cdk from "aws-cdk-lib";
import * as defaults from '@aws-solutions-constructs/core';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template } from "aws-cdk-lib/assertions";

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

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ECS::Service", {
    LaunchType: 'FARGATE'
  });
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP'
  });
  defaults.expectNonexistence(stack, 'AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTPS'
  });
  template.hasResourceProperties('AWS::EC2::VPC', {
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

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ECS::Service", {
    LaunchType: 'FARGATE'
  });
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP'
  });
  template.hasResourceProperties('AWS::EC2::VPC', {
    EnableDnsHostnames: true,
    CidrBlock: '172.168.0.0/16'
  });
  template.resourceCountIs('AWS::EC2::VPC', 1);
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

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ECS::Service", {
    LaunchType: 'FARGATE'
  });
  template.resourceCountIs('AWS::ECS::Service', 1);
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP'
  });
  template.resourceCountIs('AWS::ElasticLoadBalancingV2::Listener', 1);
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    Name: testName
  });
  template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
  template.hasResourceProperties('AWS::EC2::VPC', {
    EnableDnsHostnames: true,
    CidrBlock: '172.168.0.0/16'
  });
  template.resourceCountIs('AWS::EC2::VPC', 1);
});

test('Test existing load balancer, vpc, service', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });
  const testName = 'test-value';

  const existingVpc = defaults.getTestVpc(stack);

  const createFargateServiceResponse = defaults.CreateFargateService(stack, 'test', {
    constructVpc: existingVpc,
    ecrRepositoryArn: defaults.fakeEcrRepoArn
  });

  const existingAlb = new elb.ApplicationLoadBalancer(stack, 'test-alb', {
    vpc: existingVpc,
    internetFacing: true,
    loadBalancerName: testName,
  });

  const testProps: AlbToFargateProps = {
    existingVpc,
    publicApi: true,
    existingFargateServiceObject: createFargateServiceResponse.service,
    existingContainerDefinitionObject: createFargateServiceResponse.containerDefinition,
    existingLoadBalancerObj: existingAlb,
    listenerProps: {
      protocol: 'HTTP'
    },
  };

  new AlbToFargate(stack, 'test-construct', testProps);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ECS::Service", {
    LaunchType: 'FARGATE'
  });
  template.resourceCountIs('AWS::ECS::Service', 1);
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP'
  });
  template.resourceCountIs('AWS::ElasticLoadBalancingV2::Listener', 1);
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    Name: testName
  });
  template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
  template.hasResourceProperties('AWS::EC2::VPC', {
    EnableDnsHostnames: true,
    CidrBlock: '172.168.0.0/16'
  });
  template.resourceCountIs('AWS::EC2::VPC', 1);
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

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ECS::Service", {
    LaunchType: 'FARGATE'
  });
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP'
  });
  template.resourceCountIs('AWS::ElasticLoadBalancingV2::TargetGroup', 2);
  template.resourceCountIs('AWS::ElasticLoadBalancingV2::ListenerRule', 1);
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::ListenerRule', {
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
  template.hasResourceProperties('AWS::EC2::VPC', {
    EnableDnsHostnames: true,
    CidrBlock: '172.168.0.0/16'
  });
  template.resourceCountIs('AWS::EC2::VPC', 1);
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

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ECS::Service", {
    LaunchType: 'FARGATE',
    ServiceName: serviceName,
  });
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP'
  });
  defaults.expectNonexistence(stack, 'AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTPS'
  });
  template.hasResourceProperties('AWS::EC2::VPC', {
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
    vpcProps: { ipAddresses: ec2.IpAddresses.cidr(testCidr) },
  };

  new AlbToFargate(stack, 'test-construct', testProps);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ECS::Service", {
    LaunchType: 'FARGATE',
  });
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP'
  });
  defaults.expectNonexistence(stack, 'AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTPS'
  });
  template.hasResourceProperties('AWS::EC2::VPC', {
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

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ECS::Service", {
    LaunchType: 'FARGATE',
  });
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP'
  });
  defaults.expectNonexistence(stack, 'AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTPS'
  });
  template.hasResourceProperties('AWS::EC2::VPC', {
    EnableDnsHostnames: true,
  });
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    Name: testLoadBalancerName
  });
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
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

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ECS::Service", {
    LaunchType: 'FARGATE'
  });
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
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
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTPS',
    Port: 443,
  });
  template.hasResourceProperties('AWS::EC2::VPC', {
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

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ECS::Service", {
    LaunchType: 'FARGATE'
  });
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
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
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTPS',
    Port: 443,
  });
  template.hasResourceProperties('AWS::EC2::VPC', {
    EnableDnsHostnames: true,
  });
  template.resourceCountIs("AWS::EC2::Subnet", 3);
  template.hasResourceProperties("AWS::EC2::Subnet", {
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
  defaults.expectNonexistence(stack, "AWS::EC2::Subnet", {
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

test('Confirm that CheckVpcProps is called', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const props: AlbToFargateProps = {
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    listenerProps: {
      certificates: [defaults.getFakeCertificate(stack, "fake-cert")]
    },
    publicApi: false,
    vpcProps: {},
    existingVpc: defaults.getTestVpc(stack),
  };
  const app = () => {
    new AlbToFargate(stack, 'new-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide an existingVpc or some combination of deployVpc and vpcProps, but not both.\n');
});

test('Confirm that CheckAlbProps is called', () => {
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

  const props: AlbToFargateProps = {
    existingVpc,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    listenerProps: {
      certificates: [defaults.getFakeCertificate(stack, "fake-cert")]
    },
    publicApi: false,
    vpcProps: {},
    loadBalancerProps: {
      loadBalancerName: 'new-loadbalancer',
      internetFacing: true,
    },
    existingLoadBalancerObj: existingAlb,
  };
  const app = () => {
    new AlbToFargate(stack, 'new-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide loadBalancerProps or existingLoadBalancerObj, but not both.\n');
});

test('Test sending VPC in loadBalancerProps error', () => {
  const props = {
    loadBalancerProps: {
      vpc: { val: 'placeholder' }
    }
  };

  const app = () => {
    defaults.CheckAlbProps(props);
  };

  expect(app).toThrowError("Any existing VPC must be defined in the construct props (props.existingVpc). A VPC specified in the loadBalancerProps must be the same VPC");
});

test('WHen providing VPC in construct and resource props, the vpcId must match', () => {
  const fakeVpcOne = {vpcId: 'one'};
  const fakeVpcTwo = {vpcId: 'two'};

  const props = {
    existingVpc: fakeVpcOne,
    loadBalancerProps: {
      vpc: fakeVpcTwo
    }
  };

  const app = () => {
    defaults.CheckAlbProps(props);
  };

  expect(app).toThrowError("Any existing VPC must be defined in the construct props (props.existingVpc). A VPC specified in the loadBalancerProps must be the same VPC");
});
