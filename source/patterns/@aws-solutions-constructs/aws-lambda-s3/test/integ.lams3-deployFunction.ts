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
import { LambdaToS3, LambdaToS3Props } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as defaults from '@aws-solutions-constructs/core';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-lambda-s3';

// Definitions
const props: LambdaToS3Props = {
  lambdaFunctionProps: {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`)
  },
  bucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true
  },
  loggingBucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true
  }
};

const construct = new LambdaToS3(stack, 'test-lambda-s3', props);

defaults.suppressCustomHandlerCfnNagWarnings(stack, 'Custom::S3AutoDeleteObjectsCustomResourceProvider');
const s3Bucket = construct.s3Bucket as s3.Bucket;

defaults.addCfnSuppressRules(s3Bucket, [
  { id: 'W35',
    reason: 'This S3 bucket is created for unit/ integration testing purposes only.' },
]);

// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
