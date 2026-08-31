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
import { App, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { ComprehendUseCase, LambdaToComprehend, LambdaToComprehendProps } from '../lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { generateIntegStackName, SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as defaults from '@aws-solutions-constructs/core';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
SetConsistentFeatureFlags(stack);
stack.templateOptions.description = 'Integration Test for aws-lambda-comprehend with asynchronous jobs and construct-created buckets';

const destroyBucketProps = {
  removalPolicy: RemovalPolicy.DESTROY,
  autoDeleteObjects: true
};

const props: LambdaToComprehendProps = {
  lambdaFunctionProps: {
    code: new lambda.InlineCode('exports.handler = async (event) => { console.log(event); return {\'statusCode\': 200, \'body\': \'\'}; }'),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  },
  comprehendUseCases: [ ComprehendUseCase.ASYNC_BATCH ],
  sourceBucketProps: destroyBucketProps,
  sourceLoggingBucketProps: destroyBucketProps,
  destinationBucketProps: destroyBucketProps,
  destinationLoggingBucketProps: destroyBucketProps
};

new LambdaToComprehend(stack, 'test-lambda-comprehend-async', props);

defaults.suppressCustomHandlerCfnNagWarnings(stack, 'Custom::S3AutoDeleteObjectsCustomResourceProvider');

/*
 * Stack verification steps:
 * * Confirm the stack deploys four S3 buckets - a source bucket and a destination bucket, each with its own
 *   access logging bucket
 * * Confirm the data access role trusts comprehend.amazonaws.com with an aws:SourceAccount condition, and that
 *   it holds S3 read permission on the source bucket and read/write permission on the destination bucket
 * * Retrieve the Lambda function's inline policy and confirm the twenty-four asynchronous job actions plus an
 *   iam:PassRole grant conditioned on iam:PassedToService of comprehend.amazonaws.com
 * * Confirm the Lambda function carries the SOURCE_BUCKET_NAME, DESTINATION_BUCKET_NAME, and
 *   DATA_ACCESS_ROLE_ARN environment variables
 */

new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
