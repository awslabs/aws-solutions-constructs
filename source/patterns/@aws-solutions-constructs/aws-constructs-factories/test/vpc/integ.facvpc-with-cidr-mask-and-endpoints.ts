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

import { App, Stack } from "aws-cdk-lib";
import { ConstructsFactories, ServiceEndpointTypes } from "../../lib";
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

const app = new App();

const stack = new Stack(app, generateIntegStackName(__filename));

const factories = new ConstructsFactories(stack, 'integ-test');

factories.vpcFactory('test', {
  subnetTypes: [
    ec2.SubnetType.PRIVATE_ISOLATED
  ],
  subnetIPAddresses: 160,
  endPoints: [
    ServiceEndpointTypes.BEDROCK,
    ServiceEndpointTypes.SQS
  ]
});

new IntegTest(stack, 'Integ', {
  testCases: [
    stack
  ]
});
