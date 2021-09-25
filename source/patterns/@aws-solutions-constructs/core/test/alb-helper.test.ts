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
import * as elb from "@aws-cdk/aws-elasticloadbalancingv2";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as lambda from "@aws-cdk/aws-lambda";
import * as defaults from '../index';
import '@aws-cdk/assert/jest';

test('Test ObtainAlb with existing ALB', () => {
  const stack = new Stack();
  // Build VPC
  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultPublicPrivateVpcProps(),
  });

  const existingLoadBalancer = new elb.ApplicationLoadBalancer(stack, 'load-balancer', {
    vpc,
    internetFacing: true,
    loadBalancerName: 'unique-name'
  });

  defaults.ObtainAlb(stack, 'test', vpc, true, existingLoadBalancer);
  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    Name: "unique-name",
  });
});

test('Test ObtainAlb for new ALB with provided props', () => {
  const stack = new Stack();
  // Build VPC
  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultPublicPrivateVpcProps(),
  });

  defaults.ObtainAlb(stack, 'test', vpc, true, undefined, {
    loadBalancerName: 'new-loadbalancer',
    vpc,
    internetFacing: true
  });
  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    Name: "new-loadbalancer",
    Scheme: "internet-facing",
  });
});

test('Test ObtainAlb for new ALB with default props', () => {
  const stack = new Stack();
  // Build VPC
  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultPublicPrivateVpcProps(),
  });

  defaults.ObtainAlb(stack, 'test', vpc, false);
  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    Scheme: "internal",
  });
});

test('Test ObtainAlb for new ALB with default props', () => {
  const stack = new Stack();

  const testFunction = new lambda.Function(stack, 'test-function', {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: "index.handler",
  });

  defaults.CreateLambdaTargetGroup(stack, 'test-target', testFunction);

  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::TargetGroup', {
    TargetType: "lambda"
  });
});

test('Test ObtainAlb for new ALB with custom props', () => {
  const stack = new Stack();

  const testFunction = new lambda.Function(stack, 'test-function', {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: "index.handler",
  });

  defaults.CreateLambdaTargetGroup(stack, 'test-target', testFunction, {
    targetGroupName: 'test-target-group'
  });

  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::TargetGroup', {
    TargetType: "lambda",
    Name: 'test-target-group'
  });
});

test('Test Add Target without ruleProps', () => {
  const stack = new Stack();

  const testFunction = new lambda.Function(stack, 'test-function', {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: "index.handler",
  });

  const targetGroup = defaults.CreateLambdaTargetGroup(stack, 'test-target', testFunction, {
    targetGroupName: 'test-target-group'
  });

  // Build VPC
  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultPublicPrivateVpcProps(),
  });

  const existingLoadBalancer = new elb.ApplicationLoadBalancer(stack, 'load-balancer', {
    vpc,
    internetFacing: true,
    loadBalancerName: 'unique-name'
  });

  const testListener = new elb.ApplicationListener(stack, 'test-listener', {
    loadBalancer: existingLoadBalancer,
    protocol: elb.ApplicationProtocol.HTTP
  });

  defaults.AddTarget(stack, targetGroup, testListener);

  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::Listener', {
    DefaultActions: [
      {
        TargetGroupArn: {
          Ref: "testtargettgB2EE41CA"
        },
        Type: "forward"
      }
    ],
  });
});

test('Test Add Target with ruleProps', () => {
  const stack = new Stack();

  const testFunction = new lambda.Function(stack, 'test-function', {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: "index.handler",
  });

  const targetGroup = defaults.CreateLambdaTargetGroup(stack, 'test-target', testFunction, {
    targetGroupName: 'test-target-group'
  });

  const secondTargetGroup = defaults.CreateLambdaTargetGroup(stack, 'second-target', testFunction, {
    targetGroupName: 'second-target-group'
  });

  // Build VPC
  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultPublicPrivateVpcProps(),
  });

  const existingLoadBalancer = new elb.ApplicationLoadBalancer(stack, 'load-balancer', {
    vpc,
    internetFacing: true,
    loadBalancerName: 'unique-name'
  });

  const testListener = new elb.ApplicationListener(stack, 'test-listener', {
    loadBalancer: existingLoadBalancer,
    protocol: elb.ApplicationProtocol.HTTP
  });

  // The first target is default and can't have rules, so
  // we need to add 2 targets
  defaults.AddTarget(stack, targetGroup, testListener);
  defaults.AddTarget(stack, secondTargetGroup, testListener, {
    conditions: [elb.ListenerCondition.pathPatterns(["*admin*"])],
    priority: 10
  });

  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::ListenerRule', {
    Actions: [
      {
        TargetGroupArn: {
          Ref: "secondtargettg0CE37E1F"
        },
        Type: "forward"
      }
    ],
    Conditions: [
      {
        Field: "path-pattern",
        PathPatternConfig: {
          Values: [
            "*admin*"
          ]
        }
      }
    ]
  });
});

test('Test AddListener with defaults', () => {
  const stack = new Stack();
  const testFunction = new lambda.Function(stack, 'test-function', {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: "index.handler",
  });

  const targetGroup = defaults.CreateLambdaTargetGroup(stack, 'test-target', testFunction, {
    targetGroupName: 'test-target-group'
  });

  // Build VPC
  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultPublicPrivateVpcProps(),
  });

  const existingLoadBalancer = new elb.ApplicationLoadBalancer(stack, 'load-balancer', {
    vpc,
    internetFacing: true,
    loadBalancerName: 'unique-name'
  });

  const cert = acm.Certificate.fromCertificateArn(
    stack,
    'not-really-a-cert',
    "arn:aws:acm:us-east-1:123456789012:certificate/85c52dc8-1b37-4afd-a7aa-f03aac2db0cc"
  );

  defaults.AddListener(stack, existingLoadBalancer, targetGroup, {
    certificates: [ cert ],
  });

  // This should create 2 listeners, HTTPS plus redirect of HTTP
  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTPS',
  });

  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP',
  });
});

test('Test AddListener with no cert for an HTTPS listener', () => {
  const stack = new Stack();
  const testFunction = new lambda.Function(stack, 'test-function', {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: "index.handler",
  });

  const targetGroup = defaults.CreateLambdaTargetGroup(stack, 'test-target', testFunction, {
    targetGroupName: 'test-target-group'
  });

  // Build VPC
  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultPublicPrivateVpcProps(),
  });

  const existingLoadBalancer = new elb.ApplicationLoadBalancer(stack, 'load-balancer', {
    vpc,
    internetFacing: true,
    loadBalancerName: 'unique-name'
  });

  const app = () => {
    defaults.AddListener(stack, existingLoadBalancer, targetGroup, {});
  };
  expect(app).toThrowError();
});

test('Test AddListener error for HTTP with a cert', () => {
  const stack = new Stack();
  const testFunction = new lambda.Function(stack, 'test-function', {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: "index.handler",
  });

  const targetGroup = defaults.CreateLambdaTargetGroup(stack, 'test-target', testFunction, {
    targetGroupName: 'test-target-group'
  });

  // Build VPC
  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultPublicPrivateVpcProps(),
  });

  const existingLoadBalancer = new elb.ApplicationLoadBalancer(stack, 'load-balancer', {
    vpc,
    internetFacing: true,
    loadBalancerName: 'unique-name'
  });

  const cert = acm.Certificate.fromCertificateArn(
    stack,
    'not-really-a-cert',
    "arn:aws:acm:us-east-1:123456789012:certificate/85c52dc8-1b37-4afd-a7aa-f03aac2db0cc"
  );

  const app = () => {
    defaults.AddListener(stack, existingLoadBalancer, targetGroup, {
      certificates: [ cert ],
      protocol: elb.ApplicationProtocol.HTTP,
    });
  };
  expect(app).toThrowError();

});

test('Test AddListener for HTTP Listener', () => {
  const stack = new Stack();
  const testFunction = new lambda.Function(stack, 'test-function', {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: "index.handler",
  });

  const targetGroup = defaults.CreateLambdaTargetGroup(stack, 'test-target', testFunction, {
    targetGroupName: 'test-target-group'
  });

  // Build VPC
  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultPublicPrivateVpcProps(),
  });

  const existingLoadBalancer = new elb.ApplicationLoadBalancer(stack, 'load-balancer', {
    vpc,
    internetFacing: true,
    loadBalancerName: 'unique-name'
  });

  defaults.AddListener(stack, existingLoadBalancer, targetGroup, {
    protocol: elb.ApplicationProtocol.HTTP,
  });

  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP',
  });
  expect(stack).not.toHaveResourceLike('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTPS',
  });
});
