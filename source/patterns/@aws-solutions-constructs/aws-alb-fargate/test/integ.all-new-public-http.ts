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

// Imports
import { Aws, App, Stack } from "@aws-cdk/core";
import { AlbToFargate, AlbToFargateProps } from "../lib";
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import * as ecs from '@aws-cdk/aws-ecs';
import * as defaults from '@aws-solutions-constructs/core';
import { CfnSecurityGroup } from "@aws-cdk/aws-ec2";

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename), {
  env: { account: Aws.ACCOUNT_ID, region: 'us-east-1' },
});
stack.templateOptions.description = 'Integration Test for public HTTP API with new VPC, LoadBalancer and Service';

const image = ecs.ContainerImage.fromRegistry('nginx');

const testProps: AlbToFargateProps = {
  publicApi: true,
  containerDefinitionProps: {
    image
  },
  listenerProps: {
    protocol: 'HTTP'
  },
};

const albToFargate = new AlbToFargate(stack, 'test-construct', testProps);

defaults.addCfnSuppressRules(albToFargate.listener, [
  { id: 'W56', reason: 'All integration tests must be HTTP because of certificate limitations.' },
]);

const newSecurityGroup = albToFargate.loadBalancer.connections.securityGroups[0].node.defaultChild as CfnSecurityGroup;
defaults.addCfnSuppressRules(newSecurityGroup, [
  { id: 'W29', reason: 'CDK created rule that blocks all traffic.'},
  { id: 'W2', reason: 'Rule does not apply for ELB.'},
  { id: 'W9', reason: 'Rule does not apply for ELB.'}
]);

// Synth
app.synth();
