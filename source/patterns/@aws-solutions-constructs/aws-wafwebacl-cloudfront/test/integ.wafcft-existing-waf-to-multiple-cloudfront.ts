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

/// !cdk-integ *
import { App, Stack } from "aws-cdk-lib";
import { WafwebaclToCloudFront } from "../lib";
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import { CreateTestDistro } from './test-helper';

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));

const newDistroOne = CreateTestDistro(stack, "distroOne");
const newDistroTwo = CreateTestDistro(stack, "distroTwo");

const ownsWaf = new WafwebaclToCloudFront(stack, 'first-construct', {
  existingCloudFrontWebDistribution: newDistroOne,
});

new WafwebaclToCloudFront(stack, 'second-construct', {
  existingCloudFrontWebDistribution: newDistroTwo,
  existingWebaclObj: ownsWaf.webacl
});

new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
