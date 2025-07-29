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
import { App, Stack } from "aws-cdk-lib";
import { generateIntegStackName, SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as defaults from '@aws-solutions-constructs/core';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename), {});
SetConsistentFeatureFlags(stack);

stack.templateOptions.description = 'Dummy Integration Test for aws-route53-apigateway';

// This is an dummy integ test in order to bypass the CodeBuild integ test scans.
// Route53ToApiGateway construct requires a legitimate DNS and certificate to be deployed.
// If a fake DNS and certificate is provided, the deployment will hang and cause it to fail.
// Legitimate DNS and certificate cannot be provided in integ tests as it is user specific
// and will need to be regenerated.

// Create dummy integ with at least one resource to pass CFN scan
const regionalRestApiResponse = defaults.RegionalRestApi(stack);
regionalRestApiResponse.api.root.addMethod('GET');

// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
