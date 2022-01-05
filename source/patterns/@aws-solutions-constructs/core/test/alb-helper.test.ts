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
import * as ec2 from '@aws-cdk/aws-ec2';
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
  const stack = new Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });
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
  const stack = new Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });
  // Build VPC
  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultPublicPrivateVpcProps(),
  });

  defaults.ObtainAlb(stack, 'test', vpc, false);
  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    Scheme: "internal",
  });
});

test('Test with custom logging bucket props', () => {
  // Creating ALB logging requires a region and account (but
  // these can be fake in unit tests)
  const stack = new Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });
  // Build VPC
  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultPublicPrivateVpcProps(),
  });

  const testName = 'test-name';

  defaults.ObtainAlb(stack, 'test', vpc, false, undefined, undefined, true, { bucketName: testName });
  expect(stack).toHaveResourceLike('AWS::S3::Bucket', {
    BucketName: testName
  });
});

test('Test with no logging', () => {
  const stack = new Stack();
  // Build VPC
  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultPublicPrivateVpcProps(),
  });

  defaults.ObtainAlb(stack, 'test', vpc, false, undefined, undefined, false);
  expect(stack).not.toHaveResourceLike('AWS::S3::Bucket', {});
});

function CreateTestVpc(stack: Stack) {
  return defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultPublicPrivateVpcProps(),
  });
}

function CreateTestLoadBalancer(stack: Stack, vpc: ec2.IVpc): elb.ApplicationLoadBalancer {
  return new elb.ApplicationLoadBalancer(stack, 'load-balancer', {
    vpc,
    internetFacing: true,
    loadBalancerName: 'unique-name'
  });
}

function GetCert(stack: Stack): acm.ICertificate {
  return acm.Certificate.fromCertificateArn(
    stack,
    'not-really-a-cert',
    "arn:aws:acm:us-east-1:123456789012:certificate/85c52dc8-1b37-4afd-a7aa-f03aac2db0cc"
  );
}

function CreateTestFunction(stack: Stack, id: string): lambda.Function {
  return new lambda.Function(stack, id, {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: "index.handler",
  });
}

function CreateTestListener(stack: Stack, id: string, alb: elb.ApplicationLoadBalancer) {
  return new elb.ApplicationListener(stack, id, {
    loadBalancer: alb,
    protocol: elb.ApplicationProtocol.HTTP
  });
}

test('Test add single lambda target group with no customization', () => {
  const stack = new Stack();

  // Set up test framework independent of our code for unit testing
  const testFunction = CreateTestFunction(stack, 'test-function');
  const testVpc = CreateTestVpc(stack);
  const testAlb = CreateTestLoadBalancer(stack, testVpc);
  const testListener = CreateTestListener(stack, 'test-listener', testAlb);

  // This is the code we're testing
  defaults.AddLambdaTarget(
    stack,
    'test-lambda-target',
    testListener,
    testFunction,
  );

  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::Listener', {
    DefaultActions: [
      {
        TargetGroupArn: {
          Ref: "testlambdatargettg7E5C32F4"
        },
        Type: "forward"
      }
    ],
  });
  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::TargetGroup', {
    TargetType: "lambda",
  });

});

test('Test add single lambda target group with target group props', () => {
  const stack = new Stack();

  // Set up test framework independent of our code for unit testing
  const testFunction = CreateTestFunction(stack, 'test-function');
  const testVpc = CreateTestVpc(stack);
  const testAlb = CreateTestLoadBalancer(stack, testVpc);
  const testListener = CreateTestListener(stack, 'test-listener', testAlb);
  const targetGroupName = 'test-group';

  // This is the code we're testing
  defaults.AddLambdaTarget(
    stack,
    'test-lambda-target',
    testListener,
    testFunction,
    undefined,
    { targetGroupName },
  );

  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::TargetGroup', {
    TargetType: "lambda",
    Name: targetGroupName,
  });

});

test('Test add rule props for second lambda target group', () => {
  const stack = new Stack();

  // Set up test framework independent of our code for unit testing
  const testFunction = CreateTestFunction(stack, 'test-function');
  const testVpc = CreateTestVpc(stack);
  const testAlb = CreateTestLoadBalancer(stack, testVpc);
  const testListener = CreateTestListener(stack, 'test-listener', testAlb);
  const targetGroupName = 'test-group';
  const pathPattern = '*admin*';

  defaults.AddLambdaTarget(
    stack,
    'test-lambda-target',
    testListener,
    testFunction,
    undefined,
    { targetGroupName },
  );

  // This is the code we're testing
  const ruleProps = {
    conditions: [elb.ListenerCondition.pathPatterns([pathPattern])],
    priority: 10
  };
  defaults.AddLambdaTarget(
    stack,
    'test-second-lambda-target',
    testListener,
    testFunction,
    ruleProps,
    { targetGroupName },
  );

  expect(stack).toCountResources('AWS::ElasticLoadBalancingV2::TargetGroup', 2);
  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::ListenerRule', {
    Conditions: [
      {
        Field: "path-pattern",
        PathPatternConfig: {
          Values: [
            pathPattern
          ]
        }
      }
    ]
  });

});

test('Test adding a listener with defaults', () => {
  const stack = new Stack();

  // Set up test framework independent of our code for unit testing
  const testVpc = CreateTestVpc(stack);
  const testAlb = CreateTestLoadBalancer(stack, testVpc);
  const testCert = GetCert(stack);

  const listener = defaults.AddListener(stack, testAlb, { certificates: [ testCert ] });

  //  Need to add a target because a listener is not allowed to exist without a target or action
  defaults.AddLambdaTarget(stack, 'dummy-target', listener, CreateTestFunction(stack, 'dummy-function'));

  // This should create 2 listeners, HTTPS plus redirect of HTTP
  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTPS',
  });

  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP',
  });
});

test('Test adding an HTTPS listener with no cert (error)', () => {
  const stack = new Stack();

  // Set up test framework independent of our code for unit testing
  const testVpc = CreateTestVpc(stack);
  const testAlb = CreateTestLoadBalancer(stack, testVpc);

  const app = () => {
    defaults.AddListener(stack, testAlb, { });
  };

  expect(app).toThrowError('A listener using HTTPS protocol requires a certificate');
});

test('Test adding an HTTP listener with a cert (error)', () => {
  const stack = new Stack();

  // Set up test framework independent of our code for unit testing
  const testVpc = CreateTestVpc(stack);
  const testAlb = CreateTestLoadBalancer(stack, testVpc);
  const testCert = GetCert(stack);

  const app = () => {
    defaults.AddListener(stack, testAlb, { protocol: 'HTTP', certificates: [ testCert ] });
  };

  expect(app).toThrowError('HTTP listeners cannot use a certificate');
});

test('Test adding a HTTP listener', () => {
  const stack = new Stack();

  // Set up test framework independent of our code for unit testing
  const testVpc = CreateTestVpc(stack);
  const testAlb = CreateTestLoadBalancer(stack, testVpc);

  const listener = defaults.AddListener(stack, testAlb, { protocol: 'HTTP' });

  //  Need to add a target because a listener is not allowed to exist without a target or action
  defaults.AddLambdaTarget(stack, 'dummy-target', listener, CreateTestFunction(stack, 'dummy-function'));

  expect(stack).toHaveResourceLike('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP',
  });
  expect(stack).toCountResources('AWS::ElasticLoadBalancingV2::Listener', 1);
});

test('Test sending custom logging bucket props', () => {
  const stack = new Stack();

  // Set up test framework independent of our code for unit testing
  const testVpc = CreateTestVpc(stack);
  const testAlb = CreateTestLoadBalancer(stack, testVpc);

  const listener = defaults.AddListener(stack, testAlb, { protocol: 'HTTP' });

  //  Need to add a target because a listener is not allowed to exist without a target or action
  defaults.AddLambdaTarget(stack, 'dummy-target', listener, CreateTestFunction(stack, 'dummy-function'));

});

test('Test GetActiveListener with 0 listeners', () => {
  const stack = new Stack();

  // Set up test framework independent of our code for unit testing
  const testVpc = CreateTestVpc(stack);
  const testAlb = CreateTestLoadBalancer(stack, testVpc);

  const app = () => {
    defaults.GetActiveListener(testAlb.listeners);
  };

  expect(app).toThrowError('There are no listeners in the ALB');

});

test('Test GetActiveListener with 1 listener', () => {
  const stack = new Stack();

  // Set up test framework independent of our code for unit testing
  const testVpc = CreateTestVpc(stack);
  const testAlb = CreateTestLoadBalancer(stack, testVpc);

  defaults.AddListener(stack, testAlb, { protocol: 'HTTP' });
  const listener = defaults.GetActiveListener(testAlb.listeners);

  expect((listener.node.defaultChild as elb.CfnListener).protocol).toBe('HTTP');

});

test('Test GetActiveListener with 2 listeners', () => {
  const stack = new Stack();

  // Set up test framework independent of our code for unit testing
  const testVpc = CreateTestVpc(stack);
  const testAlb = CreateTestLoadBalancer(stack, testVpc);
  const testCert = GetCert(stack);

  defaults.AddListener(stack, testAlb, { certificates: [ testCert ] });
  const listener = defaults.GetActiveListener(testAlb.listeners);

  expect((listener.node.defaultChild as elb.CfnListener).protocol).toBe('HTTPS');

});
