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
stack.templateOptions.description = 'Integration Test for aws-lambda-comprehend with one bucket serving as both source and destination';

const destroyBucketProps = {
  removalPolicy: RemovalPolicy.DESTROY,
  autoDeleteObjects: true
};

// Only the source pair of bucket props applies - useSameBucket collapses the destination onto the source,
// so supplying destinationBucketProps or destinationLoggingBucketProps here would be rejected by validation
const props: LambdaToComprehendProps = {
  lambdaFunctionProps: {
    code: new lambda.InlineCode('exports.handler = async (event) => { console.log(event); return {\'statusCode\': 200, \'body\': \'\'}; }'),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  },
  comprehendUseCases: [ ComprehendUseCase.ASYNC_BATCH ],
  useSameBucket: true,
  sourceBucketProps: destroyBucketProps,
  sourceLoggingBucketProps: destroyBucketProps
};

new LambdaToComprehend(stack, 'test-lambda-comprehend-async-same-bucket', props);

defaults.suppressCustomHandlerCfnNagWarnings(stack, 'Custom::S3AutoDeleteObjectsCustomResourceProvider');

/*
 * Stack verification steps:
 * * Confirm the stack deploys exactly two S3 buckets - one shared source/destination bucket and its access
 *   logging bucket
 * * Confirm the SOURCE_BUCKET_NAME and DESTINATION_BUCKET_NAME environment variables on the Lambda function
 *   hold the same bucket name
 * * Confirm the data access role and the Lambda function each hold a single read/write grant on that bucket
 *   rather than a separate read grant and write grant
 */

new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
