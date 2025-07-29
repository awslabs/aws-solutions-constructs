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
import { App, Stack, RemovalPolicy } from "aws-cdk-lib";
import { CloudFrontToS3 } from "../lib";
import { generateIntegStackName, SetConsistentFeatureFlags  } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as defaults from '@aws-solutions-constructs/core';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-cloudfront-s3';
SetConsistentFeatureFlags(stack);

const construct = new CloudFrontToS3(stack, 'test-cloudfront-s3', {
  logS3AccessLogs: false,
  logCloudFrontAccessLog: false,
  cloudFrontDistributionProps: {
  },
  cloudFrontLoggingBucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true
  },
  bucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true
  }
});

defaults.addCfnSuppressRules(construct.cloudFrontWebDistribution, [
  { id: 'W10',
    reason: 'Test case only' },
]);

defaults.addCfnSuppressRules(construct.s3Bucket!, [
  { id: 'W35',
    reason: 'Test case only' },
]);

defaults.addCfnSuppressRules(construct.cloudFrontLoggingBucket!, [
  { id: 'W35',
    reason: 'Test case only' },
]);

defaults.addCfnSuppressRules(construct.cloudFrontWebDistribution, [
  { id: 'W35',
    reason: 'Test case only' },
]);

defaults.addCfnGuardSuppressRules(construct.cloudFrontLoggingBucket, ["S3_BUCKET_LOGGING_ENABLED"]);
defaults.suppressCustomHandlerCfnNagWarnings(stack, 'Custom::S3AutoDeleteObjectsCustomResourceProvider');
// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
