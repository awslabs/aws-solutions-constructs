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
import { Aws, App, Stack } from "aws-cdk-lib";
import { AlbToFargate, AlbToFargateProps } from "../lib";
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as defaults from '@aws-solutions-constructs/core';
import { SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { CfnSecurityGroup } from "aws-cdk-lib/aws-ec2";
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

// Setup
const app = new App();
const stack = new Stack(app, defaults.generateIntegStackName(__filename), {
  env: { account: Aws.ACCOUNT_ID, region: 'us-east-1' },
});
SetConsistentFeatureFlags(stack);
stack.templateOptions.description = 'Integration Test for private HTTPS API with existing VPC, LoadBalancer and Service';

// This is a minimal web server in our account that passes health checks
const image = ecs.ContainerImage.fromRegistry('public.ecr.aws/m7z7i5e4/integration-test-image:latest');

const testExistingVpc = defaults.getTestVpc(stack);

const createFargateServiceResponse = defaults.CreateFargateService(stack, 'test', {
  constructVpc: testExistingVpc,
  clientContainerDefinitionProps: { image }, // contaainer definition props
});

const existingAlb = new elb.ApplicationLoadBalancer(stack, 'test-alb', {
  vpc: testExistingVpc,
  internetFacing: true,
});

const testProps: AlbToFargateProps = {
  existingVpc: testExistingVpc,
  publicApi: true,
  existingFargateServiceObject: createFargateServiceResponse.service,
  existingContainerDefinitionObject: createFargateServiceResponse.containerDefinition,
  existingLoadBalancerObj: existingAlb,
  listenerProps: {
    protocol: 'HTTP'
  },
};

const albToFargate = new AlbToFargate(stack, 'test-construct', testProps);

defaults.addCfnSuppressRules(existingAlb, [{ id: 'W52', reason: 'This ALB is created only for test purposes, is never accessed and is destroyed immediately'}]);

defaults.addCfnSuppressRules(albToFargate.listener, [
  { id: 'W56', reason: 'All integration tests must be HTTP because of certificate limitations.' },
]);
defaults.addCfnGuardSuppressRules(albToFargate.listener, ["ELBV2_LISTENER_SSL_POLICY_RULE"]);

const newSecurityGroup = albToFargate.loadBalancer.connections.securityGroups[0].node.defaultChild as CfnSecurityGroup;
defaults.addCfnSuppressRules(newSecurityGroup, [
  { id: 'W29', reason: 'CDK created rule that blocks all traffic.'},
  { id: 'W2', reason: 'Rule does not apply for ELB.'},
  { id: 'W9', reason: 'Rule does not apply for ELB.'}
]);
defaults.suppressCustomHandlerCfnNagWarnings(stack, 'Custom::VpcRestrictDefaultSGCustomResourceProvider');
defaults.addCfnGuardSuppressRules(newSecurityGroup, ["SECURITY_GROUP_MISSING_EGRESS_RULE"]);

// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
