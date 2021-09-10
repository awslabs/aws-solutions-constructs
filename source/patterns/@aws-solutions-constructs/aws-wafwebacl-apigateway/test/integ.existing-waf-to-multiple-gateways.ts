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

/// !cdk-integ *
import { App, Stack } from "@aws-cdk/core";
import { WafwebaclToApiGateway } from "../lib";
import * as waf from "@aws-cdk/aws-wafv2";
import * as ec2 from '@aws-cdk/aws-ec2';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as lambda from '@aws-cdk/aws-lambda';
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import { ApiGatewayToLambda, ApiGatewayToLambdaProps } from '@aws-solutions-constructs/aws-apigateway-lambda';
import { AutoScalingGroup } from '@aws-cdk/aws-autoscaling';

const app = new App();

// Empty arguments
const stack = new Stack(app, generateIntegStackName(__filename));

const props: ApiGatewayToLambdaProps = {
  lambdaFunctionProps: {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_12_X,
    handler: 'index.handler'
  },
};

const gatewayToLambda = new ApiGatewayToLambda(stack, 'ApiGatewayToLambda', props);

const vpc = new ec2.Vpc(stack, 'TheVPC', {
  cidr: "10.0.0.0/16"
});

// Create the load balancer in a VPC. 'internetFacing' is 'false'
// by default, which creates an internal load balancer.
const lb = new elbv2.ApplicationLoadBalancer(stack, 'LB', {
  vpc,
  internetFacing: true
});

// Add a listener and open up the load balancer's security group
// to the world.
const listener = lb.addListener('Listener', {
  port: 80,

  // 'open: true' is the default, you can leave it out if you want. Set it
  // to 'false' and use `listener.connections` if you want to be selective
  // about who can access the load balancer.
  open: true,
});

// Create an AutoScaling group and add it as a load balancing
// target to the listener.
const asg = new AutoScalingGroup(stack, 'ASG', {
  vpc,
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.MICRO),
  machineImage: new ec2.AmazonLinuxImage() // get the latest Amazon Linux image
});
listener.addTargets('ApplicationFleet', {
  port: 8080,
  targets: [asg]
});

const aclTest = new waf.CfnWebACL(stack, 'test-waf', {
  defaultAction: {
    allow: {}
  },
  scope: 'REGIONAL',
  visibilityConfig: {
    cloudWatchMetricsEnabled: true,
    metricName: 'webACL',
    sampledRequestsEnabled: true
  },
});

new waf.CfnWebACLAssociation(stack, `test-WebACLAssociation`, {
  webAclArn: aclTest.attrArn,
  resourceArn: lb.loadBalancerArn
});

new WafwebaclToApiGateway(stack, 'test-wafwebacl-apigateway-lambda', {
  existingApiGatewayInterface: gatewayToLambda.apiGateway,
  existingWebaclObj: aclTest
});

app.synth();