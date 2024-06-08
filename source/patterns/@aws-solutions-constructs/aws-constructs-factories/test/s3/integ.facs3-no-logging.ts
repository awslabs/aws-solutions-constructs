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
import { App, Stack, RemovalPolicy } from "aws-cdk-lib";
import { ConstructsFactories } from "../../lib";
import { generateIntegStackName, addCfnSuppressRules, suppressCustomHandlerCfnNagWarnings } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

const app = new App();

// Empty arguments
const stack = new Stack(app, generateIntegStackName(__filename));

const factories = new ConstructsFactories(stack, 'integ-test');

const response = factories.s3BucketFactory('test', {
  bucketProps: { removalPolicy: RemovalPolicy.DESTROY },
  logS3AccessLogs: false,
});

addCfnSuppressRules(response.s3Bucket, [
  {
    id: 'W35',
    reason: "Access Logging disabled intentionally on this bucket for the test."
  }
]);

suppressCustomHandlerCfnNagWarnings(stack, 'Custom::S3AutoDeleteObjectsCustomResourceProvider');

new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
