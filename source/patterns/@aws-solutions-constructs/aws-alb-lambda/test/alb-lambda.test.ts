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

import { AlbToLambda, AlbToLambdaProps } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as cdk from "aws-cdk-lib";
import * as defaults from '@aws-solutions-constructs/core';
import { Template } from 'aws-cdk-lib/assertions';

test('Test new load balancer and new lambda function', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const props: AlbToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    listenerProps: {
      certificates: [defaults.getFakeCertificate(stack, "fake-cert")]
    },
    publicApi: true
  };
  new AlbToLambda(stack, 'test-one', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    Scheme: 'internet-facing',
    LoadBalancerAttributes: [
      {
        Key: "deletion_protection.enabled",
        Value: "false"
      },
      {
        Key: "access_logs.s3.enabled",
        Value: "true"
      },
      {
        Key: "access_logs.s3.bucket",
        Value: {
          Ref: "testoneE6ACFBB6"
        }
      },
      {
        Key: "access_logs.s3.prefix",
        Value: ""
      }
    ],
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP'
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTPS'
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
    TargetType: 'lambda'
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::ListenerCertificate', {
  });

});

test('Test new load balancer and new lambda function for HTTP api', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const props: AlbToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    listenerProps: {
      protocol: 'HTTP'
    },
    publicApi: true
  };
  new AlbToLambda(stack, 'test-one', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    Scheme: 'internet-facing'
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP'
  });

  defaults.expectNonexistence(stack, 'AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTPS'
  });

  defaults.expectNonexistence(stack, 'AWS::ElasticLoadBalancingV2::ListenerCertificate', {
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
    TargetType: 'lambda'
  });

  template.resourceCountIs('AWS::Lambda::Function', 1);

});

test('Test existing load balancer and new lambda function', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const testExistingVpc = defaults.getTestVpc(stack);

  const existingAlb = new elb.ApplicationLoadBalancer(stack, 'test-alb', {
    vpc: testExistingVpc,
    internetFacing: true
  });

  const props: AlbToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    listenerProps: {
      protocol: 'HTTP'
    },
    existingLoadBalancerObj: existingAlb,
    existingVpc: testExistingVpc,
    publicApi: true,
  };
  new AlbToLambda(stack, 'test-one', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP'
  });

  defaults.expectNonexistence(stack, 'AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTPS'
  });

  template.resourceCountIs('AWS::EC2::VPC', 1);

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
    TargetType: 'lambda'
  });

  template.resourceCountIs('AWS::Lambda::Function', 1);

  template.hasResourceProperties("AWS::ElasticLoadBalancingV2::LoadBalancer", {
    Scheme: "internet-facing",
  });
});

test('Test new load balancer and existing lambda function', () => {
  const testFunctionName = 'fixed-name';

  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const testExistingVpc = defaults.getTestVpc(stack);

  const lambdaFunction = new lambda.Function(stack, 'existing-function', {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    functionName: testFunctionName,
    vpc: testExistingVpc
  });

  const props: AlbToLambdaProps = {
    existingLambdaObj: lambdaFunction,
    listenerProps: {
      protocol: 'HTTP'
    },
    publicApi: true,
    existingVpc: testExistingVpc
  };
  new AlbToLambda(stack, 'test-one', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    Scheme: 'internet-facing'
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP'
  });

  defaults.expectNonexistence(stack, 'AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTPS'
  });

  defaults.expectNonexistence(stack, 'AWS::ElasticLoadBalancingV2::ListenerCertificate', {
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
    TargetType: 'lambda'
  });

  template.hasResourceProperties('AWS::Lambda::Function', {
    FunctionName: testFunctionName
  });

});

test("Test existing load balancer and existing lambda function", () => {
  const testFunctionName = "fixed-name";

  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: "us-east-1" },
  });

  const testExistingVpc = defaults.getTestVpc(stack);

  const existingAlb = new elb.ApplicationLoadBalancer(stack, "test-alb", {
    vpc: testExistingVpc,
  });

  const lambdaFunction = new lambda.Function(stack, "existing-function", {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: "index.handler",
    functionName: testFunctionName,
    vpc: testExistingVpc,
  });

  const props: AlbToLambdaProps = {
    existingLambdaObj: lambdaFunction,
    existingLoadBalancerObj: existingAlb,
    listenerProps: {
      certificates: [defaults.getFakeCertificate(stack, "fake-cert")],
    },
    publicApi: true,
    existingVpc: testExistingVpc,
  };
  new AlbToLambda(stack, "test-one", props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ElasticLoadBalancingV2::LoadBalancer", {
    Scheme: "internal",
  });

  template.hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
    Protocol: "HTTP",
  });

  template.hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
    Protocol: "HTTPS",
  });

  template.hasResourceProperties(
    "AWS::ElasticLoadBalancingV2::ListenerCertificate",
    {}
  );

  template.hasResourceProperties("AWS::ElasticLoadBalancingV2::TargetGroup", {
    TargetType: "lambda",
  });

  template.hasResourceProperties("AWS::Lambda::Function", {
    FunctionName: testFunctionName,
  });
});

test('Test new load balancer and new lambda function', () => {
  const testFunctionName = 'fixed-name';

  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const props: AlbToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      functionName: testFunctionName,
    },
    listenerProps: {
      certificates: [defaults.getFakeCertificate(stack, "fake-cert")],
    },
    publicApi: true,
  };
  new AlbToLambda(stack, 'test-one', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    Scheme: 'internet-facing'
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP'
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTPS'
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::ListenerCertificate', {
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
    TargetType: 'lambda'
  });

  template.hasResourceProperties('AWS::Lambda::Function', {
    FunctionName: testFunctionName
  });

  template.resourceCountIs('AWS::EC2::VPC', 1);

});

test('Test HTTPS adding 2 lambda targets, second with rules', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const props: AlbToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    listenerProps: {
      certificates: [defaults.getFakeCertificate(stack, "fake-cert")]
    },
    publicApi: true
  };
  const firstConstruct = new AlbToLambda(stack, 'test-one', props);

  const secondProps: AlbToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    ruleProps: {
      conditions: [elb.ListenerCondition.pathPatterns(["*admin*"])],
      priority: 10
    },
    existingVpc: firstConstruct.vpc,
    existingLoadBalancerObj: firstConstruct.loadBalancer,
    publicApi: true
  };
  new AlbToLambda(stack, 'test-two', secondProps);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    Scheme: 'internet-facing'
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP'
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTPS'
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
    TargetType: 'lambda'
  });

  template.resourceCountIs('AWS::ElasticLoadBalancingV2::TargetGroup', 2);

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::ListenerCertificate', {
  });

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
});

test('Test HTTP adding 2 lambda targets, second with rules', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const props: AlbToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    listenerProps: {
      protocol: 'HTTP'
    },
    publicApi: true
  };
  const firstConstruct = new AlbToLambda(stack, 'test-one', props);

  const secondProps: AlbToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    ruleProps: {
      conditions: [elb.ListenerCondition.pathPatterns(["*admin*"])],
      priority: 10
    },
    existingVpc: firstConstruct.vpc,
    existingLoadBalancerObj: firstConstruct.loadBalancer,
    publicApi: true
  };
  new AlbToLambda(stack, 'test-two', secondProps);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    Scheme: 'internet-facing'
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP'
  });

  defaults.expectNonexistence(stack, 'AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTPS'
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
    TargetType: 'lambda'
  });

  template.resourceCountIs('AWS::ElasticLoadBalancingV2::TargetGroup', 2);

  defaults.expectNonexistence(stack, 'AWS::ElasticLoadBalancingV2::ListenerCertificate', {
  });

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
});

test('Test new load balancer and new lambda function', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const props: AlbToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    listenerProps: {
      certificates: [defaults.getFakeCertificate(stack, "fake-cert")]
    },
    targetProps: {
      targetGroupName: 'different-name'
    },
    publicApi: true
  };
  new AlbToLambda(stack, 'test-one', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    Scheme: 'internet-facing'
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP'
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTPS'
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
    TargetType: 'lambda',
    Name: 'different-name'
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::ListenerCertificate', {
  });
});

test('Test logging turned off', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const props: AlbToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    listenerProps: {
      certificates: [defaults.getFakeCertificate(stack, "fake-cert")]
    },
    targetProps: {
      targetGroupName: 'different-name'
    },
    publicApi: true,
    logAlbAccessLogs: false,
  };
  new AlbToLambda(stack, 'test-one', props);

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::S3::Bucket', 0);

});

test('Check Properties', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const props: AlbToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    listenerProps: {
      certificates: [defaults.getFakeCertificate(stack, "fake-cert")]
    },
    publicApi: true
  };
  const target = new AlbToLambda(stack, 'test-one', props);

  expect(target.loadBalancer);
  expect(target.vpc);
  expect(target.lambdaFunction);
  expect(target.listener);

});

test('Test custom ALB properties', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const props: AlbToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    listenerProps: {
      certificates: [defaults.getFakeCertificate(stack, "fake-cert")]
    },
    publicApi: true,
    loadBalancerProps: {
      loadBalancerName: 'custom-name',
    }
  };
  new AlbToLambda(stack, 'test-one', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    Scheme: 'internet-facing',
    Name: 'custom-name',
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP'
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTPS'
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
    TargetType: 'lambda'
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::ListenerCertificate', {
  });

});

test('Test custom logging bucket', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const props: AlbToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    listenerProps: {
      certificates: [defaults.getFakeCertificate(stack, "fake-cert")]
    },
    publicApi: true,
    albLoggingBucketProps: {
      bucketName: 'custom-name',
    }
  };
  new AlbToLambda(stack, 'test-one', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    Scheme: 'internet-facing',
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP'
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTPS'
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
    TargetType: 'lambda'
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::ListenerCertificate', {
  });

  template.hasResourceProperties('AWS::S3::Bucket', {
    BucketName: 'custom-name'
  });

});

test('Test providing certificateArns is an error', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const props: AlbToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    listenerProps: {
      certificateArns: ['	arn:aws:acm:us-east-1:123456789012:certificate/11112222-3333-1234-1234-123456789012']
    },
    targetProps: {
      targetGroupName: 'different-name'
    },
    publicApi: true,
    albLoggingBucketProps: {
      bucketName: 'should-fail'
    }
  };
  const app = () => {
    new AlbToLambda(stack, 'test-one', props);
  };
  expect(app).toThrowError(/certificateArns is deprecated. Please supply certificates using props.listenerProps.certificates/);
});

test('Test logging off with logBucketProperties provided is an error', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const props: AlbToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    listenerProps: {
      certificates: [defaults.getFakeCertificate(stack, "fake-cert")]
    },
    targetProps: {
      targetGroupName: 'different-name'
    },
    publicApi: true,
    logAlbAccessLogs: false,
    albLoggingBucketProps: {
      bucketName: 'should-fail'
    }
  };
  const app = () => {
    new AlbToLambda(stack, 'test-one', props);
  };
  expect(app).toThrowError(/Error - If logAlbAccessLogs is false, supplying albLoggingBucketProps is invalid./);
});

test('Test certificate with HTTP is an error', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const props: AlbToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    listenerProps: {
      certificates: [defaults.getFakeCertificate(stack, "fake-cert")],
      protocol: 'HTTP',
    },
    publicApi: true
  };
  const app = () => {
    new AlbToLambda(stack, 'test-one', props);
  };
  expect(app).toThrowError(/HTTP listeners cannot use a certificate/);
});

test('Test new ALB with no listenerProps is an error', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const props: AlbToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    publicApi: true
  };

  const app = () => {
    new AlbToLambda(stack, 'test-one', props);
  };
  // Assertion
  expect(app).toThrowError(/When adding the first listener and target to a load balancer, listenerProps must be specified and include at least a certificate or protocol: HTTP/);
});

test('Test existing ALB with no listener with no listenerProps is an error', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const testExistingVpc = defaults.getTestVpc(stack);

  const existingAlb = new elb.ApplicationLoadBalancer(stack, 'test-alb', {
    vpc: testExistingVpc,
    internetFacing: true
  });

  const props: AlbToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    existingLoadBalancerObj: existingAlb,
    existingVpc: testExistingVpc,
    publicApi: true,
  };
  const app = () => {
    new AlbToLambda(stack, 'test-one', props);
  };
  // Assertion
  expect(app).toThrowError(/When adding the first listener and target to a load balancer, listenerProps must be specified and include at least a certificate or protocol: HTTP/);
});

test('Test existing ALB with a listener with listenerProps is an error', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const props: AlbToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    listenerProps: {
      certificates: [defaults.getFakeCertificate(stack, "fake-cert")]
    },
    publicApi: true
  };
  const firstConstruct = new AlbToLambda(stack, 'test-one', props);

  const secondProps: AlbToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    ruleProps: {
      conditions: [elb.ListenerCondition.pathPatterns(["*admin*"])],
      priority: 10
    },
    listenerProps: {
      protocol: 'HTTPS'
    },
    existingVpc: firstConstruct.vpc,
    existingLoadBalancerObj: firstConstruct.loadBalancer,
    publicApi: true
  };
  const app = () => {
    new AlbToLambda(stack, 'test-two', secondProps);
  };
  // Assertion
  expect(app).toThrowError(/This load balancer already has a listener, listenerProps may not be specified/);

});

test('Test second target with no rules is an error', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const props: AlbToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    listenerProps: {
      certificates: [defaults.getFakeCertificate(stack, "fake-cert")]
    },
    publicApi: true
  };
  const firstConstruct = new AlbToLambda(stack, 'test-one', props);

  const secondProps: AlbToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    existingVpc: firstConstruct.vpc,
    existingLoadBalancerObj: firstConstruct.loadBalancer,
    publicApi: true
  };
  const app = () => {
    new AlbToLambda(stack, 'test-two', secondProps);
  };
  // Assertion
  expect(app).toThrowError(/When adding a second target to an existing listener, there must be rules provided/);
});

test('Test no cert for an HTTPS listener is an error', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const props: AlbToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    listenerProps: {
    },
    publicApi: true
  };
  const app = () => {
    new AlbToLambda(stack, 'test-one', props);
  };
  // Assertion
  expect(app).toThrowError(/A listener using HTTPS protocol requires a certificate/);
});

test('Test existingLoadBalancerObj and loadBalancerProps is an error', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const testExistingVpc = defaults.getTestVpc(stack);

  const existingAlb = new elb.ApplicationLoadBalancer(stack, 'test-alb', {
    vpc: testExistingVpc,
    internetFacing: true
  });

  const props: AlbToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    listenerProps: {
      protocol: 'HTTP'
    },
    existingLoadBalancerObj: existingAlb,
    existingVpc: testExistingVpc,
    publicApi: true,
    loadBalancerProps: {
      internetFacing: true
    }
  };
  const app = () => {
    new AlbToLambda(stack, 'test-one', props);
  };
  // Assertion
  expect(app).toThrowError(/Error - Either provide loadBalancerProps or existingLoadBalancerObj, but not both./);
});

test('Test existingLoadBalancerObj and no existingVpc is an error', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const testExistingVpc = defaults.getTestVpc(stack);

  const existingAlb = new elb.ApplicationLoadBalancer(stack, 'test-alb', {
    vpc: testExistingVpc,
    internetFacing: true
  });

  const props: AlbToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    listenerProps: {
      protocol: 'HTTP'
    },
    existingLoadBalancerObj: existingAlb,
    publicApi: true,
  };
  const app = () => {
    new AlbToLambda(stack, 'test-one', props);
  };
  // Assertion
  expect(app).toThrowError(
    /An existing ALB is already in a VPC, that VPC must be provided in props.existingVpc for the rest of the construct to use./);
});

test('Confirm that CheckLambdaProps is called', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });
  const testExistingVpc = defaults.getTestVpc(stack);

  const lambdaFunction = new lambda.Function(stack, 'existing-function', {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    functionName: 'name',
    vpc: testExistingVpc
  });

  const props: AlbToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    existingLambdaObj: lambdaFunction,
    listenerProps: {
      certificates: [defaults.getFakeCertificate(stack, "fake-cert")]
    },
    publicApi: false,
    existingVpc: testExistingVpc,
  };
  const app = () => {
    new AlbToLambda(stack, 'new-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n');
});

test('Confirm that CheckVpcProps is called', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const props: AlbToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    listenerProps: {
      certificates: [defaults.getFakeCertificate(stack, "fake-cert")]
    },
    publicApi: false,
    vpcProps: {},
    existingVpc: defaults.getTestVpc(stack),
  };
  const app = () => {
    new AlbToLambda(stack, 'new-construct', props);
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

  const props: AlbToLambdaProps = {
    existingVpc,
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
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
    new AlbToLambda(stack, 'new-construct', props);
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
