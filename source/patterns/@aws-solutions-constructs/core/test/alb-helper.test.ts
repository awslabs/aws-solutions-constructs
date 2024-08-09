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
import * as elb from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as defaults from '../index';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Match, Template } from 'aws-cdk-lib/assertions';

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

  defaults.ObtainAlb(stack, 'test', {
    vpc,
    publicApi: true,
    existingLoadBalancerObj: existingLoadBalancer
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
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

  defaults.ObtainAlb(stack, 'test', {
    vpc,
    publicApi: true,
    loadBalancerProps: {
      loadBalancerName: 'new-loadbalancer',
      internetFacing: true
    }
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
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

  defaults.ObtainAlb(stack, 'test', {
    vpc,
    publicApi: false
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    Scheme: "internal",
  });
});

test('Test ObtainAlb with specific subnets', () => {
  const stack = new Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });
  // Build VPC
  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultPublicPrivateVpcProps(),
    userVpcProps: {
      availabilityZones: [
        "us-east-1a",
        "us-east-1b",
        "us-east-1c",
        "us-east-1d",
        "us-east-1e",
      ],
    }
  });

  defaults.ObtainAlb(stack, 'test', {
    vpc,
    publicApi: true,
    loadBalancerProps: {
      vpc,
      vpcSubnets: { availabilityZones: ["us-east-1b", "us-east-1d"] }
    }
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    Subnets: [
      Match.anyValue(),
      Match.anyValue(),
    ]
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

  defaults.ObtainAlb(stack, 'test', {
    vpc,
    publicApi: false,
    logAccessLogs: true,
    loggingBucketProps: {
      bucketName: testName
    }
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::S3::Bucket', {
    BucketName: testName
  });
});

test('Test with no logging', () => {
  const stack = new Stack();
  // Build VPC
  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultPublicPrivateVpcProps(),
  });

  defaults.ObtainAlb(stack, 'test', {
    vpc,
    publicApi: false,
    logAccessLogs: false
  });

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::S3::Bucket', 0);
});

test('Test add single lambda target group with no customization', () => {
  const stack = new Stack();

  // Set up test framework independent of our code for unit testing
  const testFunction = CreateTestFunction(stack, 'test-function');
  const testVpc = defaults.getTestVpc(stack);
  const testAlb = CreateTestLoadBalancer(stack, testVpc);
  const testListener = CreateTestListener(stack, 'test-listener', testAlb);

  // This is the code we're testing
  defaults.AddLambdaTarget(
    stack,
    'test-lambda-target',
    testListener,
    testFunction,
  );

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    DefaultActions: [
      {
        TargetGroupArn: {
          Ref: "testlambdatargettg7E5C32F4"
        },
        Type: "forward"
      }
    ],
  });
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
    TargetType: "lambda",
  });

});

test('Test add single lambda target group with target group props', () => {
  const stack = new Stack();

  // Set up test framework independent of our code for unit testing
  const testFunction = CreateTestFunction(stack, 'test-function');
  const testVpc = defaults.getTestVpc(stack);
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

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
    TargetType: "lambda",
    Name: targetGroupName,
  });

});

test('Test add rule props for second lambda target group', () => {
  const stack = new Stack();

  // Set up test framework independent of our code for unit testing
  const testFunction = CreateTestFunction(stack, 'test-function');
  const testVpc = defaults.getTestVpc(stack);
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

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::ElasticLoadBalancingV2::TargetGroup', 2);
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::ListenerRule', {
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

test('Test add single fargate target with no customization', () => {
  const stack = new Stack();

  // Set up test framework independent of our code for unit testing
  const testVpc = defaults.getTestVpc(stack);
  const testService = CreateTestFargateService(stack, 'test-service', testVpc);
  const testAlb = CreateTestLoadBalancer(stack, testVpc);
  const testListener = CreateTestListener(stack, 'test-listener', testAlb);

  // This is the code we're testing
  defaults.AddFargateTarget(
    stack,
    'test-fargate-target',
    testListener,
    testService,
    undefined,
    {
      vpc: testVpc,
      protocol: elb.ApplicationProtocol.HTTP
    }
  );

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    DefaultActions: [
      {
        TargetGroupArn: {
          Ref: "testfargatetargettg01FF5AA3"
        },
        Type: "forward"
      }
    ],
  });
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
    TargetType: "ip",
  });

});

test('Test add two fargate targets with rules', () => {
  const stack = new Stack();

  // Set up test framework independent of our code for unit testing
  const testVpc = defaults.getTestVpc(stack);
  const testService = CreateTestFargateService(stack, 'test-service', testVpc);
  const testAlb = CreateTestLoadBalancer(stack, testVpc);
  const testListener = CreateTestListener(stack, 'test-listener', testAlb);
  const pathPattern = '*admin*';

  defaults.AddFargateTarget(
    stack,
    'test-fargate-target',
    testListener,
    testService,
    undefined,
    {
      vpc: testVpc,
      protocol: elb.ApplicationProtocol.HTTP
    }
  );

  // This is the code we're testing
  const ruleProps = {
    conditions: [elb.ListenerCondition.pathPatterns([pathPattern])],
    priority: 10
  };
  defaults.AddFargateTarget(
    stack,
    'test-second-fargate-target',
    testListener,
    testService,
    ruleProps,
    {
      vpc: testVpc,
      protocol: elb.ApplicationProtocol.HTTP
    }
  );

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::ElasticLoadBalancingV2::TargetGroup', 2);
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::ListenerRule', {
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
  const testVpc = defaults.getTestVpc(stack);
  const testAlb = CreateTestLoadBalancer(stack, testVpc);
  const testCert = defaults.getFakeCertificate(stack, 'not-really-a-cert');

  const listener = defaults.AddListener(stack, 'test', testAlb, { certificates: [ testCert ] });

  //  Need to add a target because a listener is not allowed to exist without a target or action
  defaults.AddLambdaTarget(stack, 'dummy-target', listener, CreateTestFunction(stack, 'dummy-function'));

  const template = Template.fromStack(stack);

  // This should create 2 listeners, HTTPS plus redirect of HTTP
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTPS',
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP',
  });
});

test('Test adding an HTTPS listener with no cert (error)', () => {
  const stack = new Stack();

  // Set up test framework independent of our code for unit testing
  const testVpc = defaults.getTestVpc(stack);
  const testAlb = CreateTestLoadBalancer(stack, testVpc);

  const app = () => {
    defaults.AddListener(stack, 'test', testAlb, { });
  };

  expect(app).toThrowError('A listener using HTTPS protocol requires a certificate');
});

test('Test adding an HTTP listener with a cert (error)', () => {
  const stack = new Stack();

  // Set up test framework independent of our code for unit testing
  const testVpc = defaults.getTestVpc(stack);
  const testAlb = CreateTestLoadBalancer(stack, testVpc);
  const testCert = defaults.getFakeCertificate(stack, 'not-really-a-cert');

  const app = () => {
    defaults.AddListener(stack, 'test', testAlb, { protocol: 'HTTP', certificates: [ testCert ] });
  };

  expect(app).toThrowError('HTTP listeners cannot use a certificate');
});

test('Test adding a HTTP listener', () => {
  const stack = new Stack();

  // Set up test framework independent of our code for unit testing
  const testVpc = defaults.getTestVpc(stack);
  const testAlb = CreateTestLoadBalancer(stack, testVpc);

  const listener = defaults.AddListener(stack, 'test', testAlb, { protocol: 'HTTP' });

  //  Need to add a target because a listener is not allowed to exist without a target or action
  defaults.AddLambdaTarget(stack, 'dummy-target', listener, CreateTestFunction(stack, 'dummy-function'));

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Protocol: 'HTTP',
  });
  template.resourceCountIs('AWS::ElasticLoadBalancingV2::Listener', 1);
});

test('Test GetActiveListener with 0 listeners', () => {
  const stack = new Stack();

  // Set up test framework independent of our code for unit testing
  const testVpc = defaults.getTestVpc(stack);
  const testAlb = CreateTestLoadBalancer(stack, testVpc);

  const app = () => {
    defaults.GetActiveListener(testAlb.listeners);
  };

  expect(app).toThrowError('There are no listeners in the ALB');

});

test('Test GetActiveListener with 1 listener', () => {
  const stack = new Stack();

  // Set up test framework independent of our code for unit testing
  const testVpc = defaults.getTestVpc(stack);
  const testAlb = CreateTestLoadBalancer(stack, testVpc);

  defaults.AddListener(stack, 'test', testAlb, { protocol: 'HTTP' });
  const listener = defaults.GetActiveListener(testAlb.listeners);

  expect((listener.node.defaultChild as elb.CfnListener).protocol).toBe('HTTP');

});

test('Test GetActiveListener with 2 listeners', () => {
  const stack = new Stack();

  // Set up test framework independent of our code for unit testing
  const testVpc = defaults.getTestVpc(stack);
  const testAlb = CreateTestLoadBalancer(stack, testVpc);
  const testCert = defaults.getFakeCertificate(stack, 'not-really-a-cert');

  defaults.AddListener(stack, 'test', testAlb, { certificates: [ testCert ] });
  const listener = defaults.GetActiveListener(testAlb.listeners);

  expect((listener.node.defaultChild as elb.CfnListener).protocol).toBe('HTTPS');

});

test('Test use of certificateArns error', () => {
  const props = {
    listenerProps: {
      certificateArns: [ 'arn1'],
    }
  };

  const app = () => {
    defaults.CheckAlbProps(props);
  };

  expect(app).toThrowError("certificateArns is deprecated. Please supply certificates using props.listenerProps.certificates\n");
});

test('Test bad first listener error', () => {
  const props = {
    existingLoadBalancerObj: {
      listeners: [],
    }
  };

  const app = () => {
    defaults.CheckAlbProps(props);
  };

  expect(app).toThrowError("When adding the first listener and target to a load balancer, listenerProps must be specified and include at least a certificate or protocol: HTTP\n");

  const app2 = () => {
    defaults.CheckAlbProps({});
  };

  expect(app2).toThrowError("When adding the first listener and target to a load balancer, listenerProps must be specified and include at least a certificate or protocol: HTTP\n");
});

test('Test second target with no rules error', () => {
  const props = {
    existingLoadBalancerObj: {
      listeners: [ 'fake listener'],
    },
    existingVpc: { fake: 'vpc' }
  };

  const app = () => {
    defaults.CheckAlbProps(props);
  };

  expect(app).toThrowError("When adding a second target to an existing listener, there must be rules provided\n");
});

test('Test existing Load Balancer with no VPC provided error', () => {
  const props = {
    existingLoadBalancerObj: {
      name: 'placeholder',
      listeners: [ ]
    }
  };

  const app = () => {
    defaults.CheckAlbProps(props);
  };

  expect(app).toThrowError("An existing ALB is already in a VPC, that VPC must be provided in props.existingVpc for the rest of the construct to use.\n");
});

test('Test sending listenerProps to existingListener error', () => {
  const props = {
    existingLoadBalancerObj: {
      listeners: [ 'placeholder' ]
    },
    listenerProps: { val: 'placeholder' }
  };

  const app = () => {
    defaults.CheckAlbProps(props);
  };

  expect(app).toThrowError("This load balancer already has a listener, listenerProps may not be specified\n");
});

test('Test sending loadBalancerProps and existingLoadBalancerObj is an error', () => {
  const stack = new Stack();

  const vpc = defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultPublicPrivateVpcProps(),
  });

  const existingLoadBalancer = new elb.ApplicationLoadBalancer(stack, 'load-balancer', {
    vpc,
    internetFacing: true,
    loadBalancerName: 'unique-name'
  });

  const props = {
    vpc,
    existingLoadBalancerObj: existingLoadBalancer,
    loadBalancerProps: {
      loadBalancerName: 'new-loadbalancer',
      internetFacing: true
    }
  };

  const app = () => {
    defaults.CheckAlbProps(props);
  };

  expect(app).toThrowError("Error - Either provide loadBalancerProps or existingLoadBalancerObj, but not both.\n");
});

test('Test sending albLoggingBucketProps when logAlbAccessLogs is false is an error', () => {

  const props = {
    logAlbAccessLogs: false,
    albLoggingBucketProps: {},
    loadBalancerProps: {
      loadBalancerName: 'new-loadbalancer',
      internetFacing: true
    }
  };

  const app = () => {
    defaults.CheckAlbProps(props);
  };

  expect(app).toThrowError("Error - If logAlbAccessLogs is false, supplying albLoggingBucketProps is invalid.\n");
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

function CreateTestLoadBalancer(stack: Stack, vpc: ec2.IVpc): elb.ApplicationLoadBalancer {
  return new elb.ApplicationLoadBalancer(stack, 'load-balancer', {
    vpc,
    internetFacing: true,
    loadBalancerName: 'unique-name'
  });
}

function CreateTestFunction(stack: Stack, id: string): lambda.Function {
  return new lambda.Function(stack, id, {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: "index.handler",
  });
}

function CreateTestFargateService(stack: Stack, id: string, vpc: ec2.IVpc): ecs.FargateService {
  const createFargateServiceResponse = defaults.CreateFargateService(stack, `${id}-fg-svc`, {
    constructVpc: vpc,
    clientClusterProps: undefined,
    ecrRepositoryArn: 'arn:aws:ecr:us-east-1:123456789012:repository/fake-repo',
    ecrImageVersion: 'latest'
  });
  return createFargateServiceResponse.service;
}

function CreateTestListener(stack: Stack, id: string, alb: elb.ApplicationLoadBalancer) {
  return new elb.ApplicationListener(stack, id, {
    loadBalancer: alb,
    protocol: elb.ApplicationProtocol.HTTP
  });
}
