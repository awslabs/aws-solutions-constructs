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
import { App, RemovalPolicy, Stack } from "aws-cdk-lib";
import { CloudFrontToApiGateway } from "../lib";
import * as defaults from '@aws-solutions-constructs/core';
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-cloudfront-apigateway';

const testApi = defaults.CreateTestApi(stack, `${generateIntegStackName(__filename)}-api`);

new CloudFrontToApiGateway(stack, 'test-cloudfront-apigateway', {
  existingApiGatewayObj: testApi,
  cloudFrontLoggingBucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true
  },
});

defaults.suppressCustomHandlerCfnNagWarnings(stack, 'Custom::S3AutoDeleteObjectsCustomResourceProvider');
// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
