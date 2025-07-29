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
import { App, RemovalPolicy, Stack } from "aws-cdk-lib";
import { CloudFrontToS3, CloudFrontToS3Props } from "../lib";
import { buildS3Bucket, generateIntegStackName, suppressCustomHandlerCfnNagWarnings, SetConsistentFeatureFlags  } from '@aws-solutions-constructs/core';
import { BucketEncryption } from "aws-cdk-lib/aws-s3";
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-cloudfront-s3';
SetConsistentFeatureFlags(stack);

// Definitions
const existingBucketObj = buildS3Bucket(stack, {
  bucketProps: {
    encryption: BucketEncryption.S3_MANAGED,
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true
  },
  loggingBucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true
  }
}, 'existing-s3-bucket-encrypted-with-s3-managed-key').bucket;

const props: CloudFrontToS3Props = {
  existingBucketObj,
  cloudFrontLoggingBucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true
  },
  cloudFrontLoggingBucketAccessLogBucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true
  },
  insertHttpSecurityHeaders: false
};

new CloudFrontToS3(stack, 'test-cloudfront-s3-managed-key', props);

suppressCustomHandlerCfnNagWarnings(stack, 'Custom::S3AutoDeleteObjectsCustomResourceProvider');

// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
