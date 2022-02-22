/**
 *  Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { WafwebaclToAlb } from "../lib";
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import { CfnSecurityGroup } from "@aws-cdk/aws-ec2";
import * as defaults from '@aws-solutions-constructs/core';
import * as elb from "@aws-cdk/aws-elasticloadbalancingv2";

const app = new App();

// Empty arguments
const stack = new Stack(app, generateIntegStackName(__filename));

const myVpc = defaults.getTestVpc(stack);

const loadBalancer = new elb.ApplicationLoadBalancer(stack, 'new-lb', {
  internetFacing: false,
  vpc: myVpc
});

// This construct can only be attached to a configured Application Load Balancer.
new WafwebaclToAlb(stack, 'test-wafwebacl-alb', {
  existingLoadBalancerObj: loadBalancer
});

const newSecurityGroup = loadBalancer.connections.securityGroups[0].node.defaultChild as CfnSecurityGroup;
defaults.addCfnSuppressRules(newSecurityGroup, [{ id: 'W29', reason: 'CDK created rule that blocks all traffic.'}]);
defaults.addCfnSuppressRules(loadBalancer, [{ id: 'W52', reason: 'This test is explicitly to test the no logging case.'}]);

app.synth();