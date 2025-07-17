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
import { App, Stack, Aws, RemovalPolicy } from "aws-cdk-lib";
import * as defaults from '@aws-solutions-constructs/core';
import { SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';
import { PrivateHostedZone } from "aws-cdk-lib/aws-route53";
import { Route53ToAlb, Route53ToAlbProps } from "../lib";
import { CfnSecurityGroup } from "aws-cdk-lib/aws-ec2";
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

// Setup
const app = new App();
const stack = new Stack(app, defaults.generateIntegStackName(__filename), {
  env: { account: Aws.ACCOUNT_ID, region: 'us-east-1' },
});
SetConsistentFeatureFlags(stack);
stack.templateOptions.description = 'Integration Test for aws-route53-alb';

const newVpc = defaults.getTestVpc(stack);

const newZone = new PrivateHostedZone(stack, 'new-zone', {
  zoneName: 'www.test-example.com',
  vpc: newVpc,
});

// Definitions
const props: Route53ToAlbProps = {
  publicApi: false,
  existingHostedZoneInterface: newZone,
  existingVpc: newVpc,
  albLoggingBucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
  }
};

const testConstruct = new Route53ToAlb(stack, 'existing-zone-stack', props);

const newSecurityGroup = testConstruct.loadBalancer.connections.securityGroups[0].node.defaultChild as CfnSecurityGroup;
defaults.addCfnSuppressRules(newSecurityGroup, [{ id: 'W29', reason: 'CDK created rule that blocks all traffic.'}]);

defaults.suppressCustomHandlerCfnNagWarnings(stack, 'Custom::S3AutoDeleteObjectsCustomResourceProvider');

defaults.suppressCustomHandlerCfnNagWarnings(stack, 'Custom::VpcRestrictDefaultSGCustomResourceProvider');
// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
