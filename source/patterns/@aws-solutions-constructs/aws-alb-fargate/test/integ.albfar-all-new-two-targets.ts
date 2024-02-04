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

// Imports
import { Aws, App, Stack, RemovalPolicy } from "aws-cdk-lib";
import { AlbToFargate, AlbToFargateProps } from "../lib";
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as defaults from '@aws-solutions-constructs/core';
import { CfnSecurityGroup } from "aws-cdk-lib/aws-ec2";
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

// Setup
const app = new App();
const stack = new Stack(app, defaults.generateIntegStackName(__filename), {
  env: { account: Aws.ACCOUNT_ID, region: 'us-east-1' },
});
stack.templateOptions.description = 'Integration Test for public HTTP API with new VPC, LoadBalancer and Service and 2 targets';

// This is a minimal web server in our account that passes health checks
const image = ecs.ContainerImage.fromRegistry('public.ecr.aws/m7z7i5e4/integration-test-image:latest');

const testProps: AlbToFargateProps = {
  publicApi: true,
  containerDefinitionProps: {
    image
  },
  listenerProps: {
    protocol: 'HTTP'
  },
  albLoggingBucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true
  }
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

const albToFargate = new AlbToFargate(stack, 'test-two-construct', testPropsTwo);

defaults.addCfnSuppressRules(albToFargate.listener, [
  { id: 'W56', reason: 'All integration tests must be HTTP because of certificate limitations.' },
]);

const newSecurityGroup = albToFargate.loadBalancer.connections.securityGroups[0].node.defaultChild as CfnSecurityGroup;
defaults.addCfnSuppressRules(newSecurityGroup, [
  { id: 'W29', reason: 'CDK created rule that blocks all traffic.'},
  { id: 'W2', reason: 'Rule does not apply for ELB.'},
  { id: 'W9', reason: 'Rule does not apply for ELB.'}
]);

defaults.suppressCustomHandlerCfnNagWarnings(stack, 'Custom::S3AutoDeleteObjectsCustomResourceProvider');
defaults.suppressCustomHandlerCfnNagWarnings(stack, 'Custom::VpcRestrictDefaultSGCustomResourceProvider');

// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
