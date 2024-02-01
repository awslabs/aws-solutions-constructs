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
import { WafwebaclToApiGateway } from "../lib";
import { generateIntegStackName, CreateTestApi } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));

const restApiOne = CreateTestApi(stack, 'testOne');
const restApiTwo = CreateTestApi(stack, 'testTwo');

const ownsWaf = new WafwebaclToApiGateway(stack, 'first-construct', {
  existingApiGatewayInterface: restApiOne,
});

new WafwebaclToApiGateway(stack, 'second-construct', {
  existingApiGatewayInterface: restApiTwo,
  existingWebaclObj: ownsWaf.webacl
});

new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
