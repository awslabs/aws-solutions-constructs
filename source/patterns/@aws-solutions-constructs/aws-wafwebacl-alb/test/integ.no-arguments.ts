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
import { WafwebaclToAlb } from "../lib";
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import { Route53ToAlb } from '@aws-solutions-constructs/aws-route53-alb';

const app = new App();

// Empty arguments
const stack = new Stack(app, generateIntegStackName(__filename));

const r53ToAlb = new Route53ToAlb(stack, 'Route53ToAlbPattern', {
  privateHostedZoneProps: {
    zoneName: 'www.example.com',
  },
  publicApi: false,
  logAccessLogs: false
});

// This construct can only be attached to a configured Application Load Balancer.
new WafwebaclToAlb(stack, 'test-wafwebacl-alb', {
  existingLoadBalancerObj: r53ToAlb.loadBalancer
});

app.synth();