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
import { App, Stack } from 'aws-cdk-lib';
import { ComprehendUseCase, LambdaToComprehend, LambdaToComprehendProps } from '../lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { generateIntegStackName, SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as defaults from '@aws-solutions-constructs/core';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
SetConsistentFeatureFlags(stack);
stack.templateOptions.description = 'Integration Test for aws-lambda-comprehend with Client-supplied existing buckets';

// CreateScrapBucket sets RemovalPolicy.DESTROY and autoDeleteObjects itself, and gives each bucket
// its own access logging bucket
const existingSourceBucket = defaults.CreateScrapBucket(stack, 'existing-source-bucket');
const existingDestinationBucket = defaults.CreateScrapBucket(stack, 'existing-destination-bucket');

const props: LambdaToComprehendProps = {
  lambdaFunctionProps: {
    code: new lambda.InlineCode('exports.handler = async (event) => { console.log(event); return {\'statusCode\': 200, \'body\': \'\'}; }'),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  },
  comprehendUseCases: [ ComprehendUseCase.ASYNC_BATCH ],
  existingSourceBucketObj: existingSourceBucket,
  existingDestinationBucketObj: existingDestinationBucket
};

new LambdaToComprehend(stack, 'test-lambda-comprehend-async-existing-buckets', props);

defaults.suppressCustomHandlerCfnNagWarnings(stack, 'Custom::S3AutoDeleteObjectsCustomResourceProvider');

/*
 * Stack verification steps:
 * * Confirm the four S3 buckets in the stack are the two supplied buckets and their two logging buckets -
 *   the construct creates none of its own
 * * Confirm the data access role and the Lambda function both hold grants against the supplied buckets,
 *   which proves the grants are applied to the bucket interface rather than only to buckets the construct built
 * * Confirm the SOURCE_BUCKET_NAME and DESTINATION_BUCKET_NAME environment variables name the supplied buckets
 */

new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
