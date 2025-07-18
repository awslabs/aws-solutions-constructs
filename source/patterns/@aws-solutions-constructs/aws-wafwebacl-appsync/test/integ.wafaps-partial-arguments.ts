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
import { WafwebaclToAppsync } from "../lib";
import { generateIntegStackName, SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as appsync from "aws-cdk-lib/aws-appsync";

const app = new App();

// Empty arguments
const stack = new Stack(app, generateIntegStackName(__filename));
SetConsistentFeatureFlags(stack);

const api = new appsync.CfnGraphQLApi(stack, "new-graphql-api", {
  name: "api",
  authenticationType: "API_KEY",
});

// This construct can only be attached to a configured Appsync API.
new WafwebaclToAppsync(stack, "test-wafwebacl-appsync", {
  existingAppsyncApi: api,
  webaclProps: {
    name: 'test-name-appsync'
  }
});

new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
