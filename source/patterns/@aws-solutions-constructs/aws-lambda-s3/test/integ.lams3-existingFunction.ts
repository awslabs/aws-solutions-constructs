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
import * as defaults from '@aws-solutions-constructs/core';
import { generateIntegStackName, suppressCustomHandlerCfnNagWarnings } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-lambda-s3';

// Definitions
const lambdaFunctionProps = {
  runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
  handler: 'index.handler',
  code: lambda.Code.fromAsset(`${__dirname}/lambda`)
};

const func = defaults.deployLambdaFunction(stack, lambdaFunctionProps);

const props: LambdaToS3Props = {
  existingLambdaObj: func,
  bucketProps: {
    autoDeleteObjects: true,
    removalPolicy: RemovalPolicy.DESTROY,
  },
  loggingBucketProps: {
    autoDeleteObjects: true,
    removalPolicy: RemovalPolicy.DESTROY,
  }
};

new LambdaToS3(stack, 'test-lambda-s3', props);
suppressCustomHandlerCfnNagWarnings(stack, 'Custom::S3AutoDeleteObjectsCustomResourceProvider');

// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
