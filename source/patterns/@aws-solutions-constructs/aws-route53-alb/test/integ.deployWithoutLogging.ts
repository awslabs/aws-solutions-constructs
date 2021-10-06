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

// Imports
import { App, Stack, Aws } from "@aws-cdk/core";
import { Route53ToAlb, Route53ToAlbProps } from "../lib";
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import * as defaults from '@aws-solutions-constructs/core';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename), {
  env: { account: Aws.ACCOUNT_ID, region: 'us-east-1' },
});
stack.templateOptions.description = 'Integration Test for aws-route53-alb';

// Definitions
const props: Route53ToAlbProps = {
  publicApi: false,
  privateHostedZoneProps: {
    zoneName: 'www.example.com'
  },
  logAccessLogs: false,
};

const testConstruct = new Route53ToAlb(stack, 'test-route53-alb', props);

defaults.addCfnSuppressRules(testConstruct.loadBalancer, [{ id: 'W52', reason: 'This test is explicitly to test the no logging case.'}]);

// Synth
app.synth();