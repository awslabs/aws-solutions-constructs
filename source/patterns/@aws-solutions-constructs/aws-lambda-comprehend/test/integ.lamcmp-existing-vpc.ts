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
stack.templateOptions.description = 'Integration Test for aws-lambda-comprehend with a Client-supplied existing VPC';

const destroyBucketProps = {
  removalPolicy: RemovalPolicy.DESTROY,
  autoDeleteObjects: true
};

// getTestVpc defaults to a public/private VPC, which is deliberately a different shape from the
// isolated VPC deployVpc builds - so this test covers the construct attaching to a VPC it did not
// create and shaped by someone else, rather than repeating integ.lamcmp-vpc-async
const existingVpc = defaults.getTestVpc(stack);

// Paired with ASYNC_BATCH because that is the combination that adds the S3 Gateway Endpoint on top
// of the Comprehend Interface Endpoint, and both have to land in the supplied VPC rather than in a
// VPC of the construct's own
const props: LambdaToComprehendProps = {
  lambdaFunctionProps: {
    code: new lambda.InlineCode('exports.handler = async (event) => { console.log(event); return {\'statusCode\': 200, \'body\': \'\'}; }'),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  },
  comprehendUseCases: [ ComprehendUseCase.ASYNC_BATCH ],
  existingVpc,
  sourceBucketProps: destroyBucketProps,
  sourceLoggingBucketProps: destroyBucketProps,
  destinationBucketProps: destroyBucketProps,
  destinationLoggingBucketProps: destroyBucketProps
};

new LambdaToComprehend(stack, 'test-lambda-comprehend-existing-vpc', props);

defaults.suppressCustomHandlerCfnNagWarnings(stack, 'Custom::S3AutoDeleteObjectsCustomResourceProvider');
defaults.suppressCustomHandlerCfnNagWarnings(stack, 'Custom::VpcRestrictDefaultSGCustomResourceProvider');

/*
 * Stack verification steps:
 * * Confirm the stack holds exactly one VPC, the one the test supplied - the construct created none of its own
 * * Confirm both endpoints were added to the supplied VPC: the Comprehend interface endpoint and the S3 gateway
 *   endpoint the asynchronous use case requires
 * * Confirm the Lambda function is attached to the private subnets of the supplied VPC and still holds the
 *   asynchronous job actions and the iam:PassRole grant
 * * Confirm the deployment emits the warning that asynchronous analysis jobs run in an Amazon Comprehend service
 *   account rather than inside the Client's VPC
 */

new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
