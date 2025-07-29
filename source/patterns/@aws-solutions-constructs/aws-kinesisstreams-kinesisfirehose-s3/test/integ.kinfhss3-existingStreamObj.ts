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
import { KinesisStreamsToKinesisFirehoseToS3 } from '../lib';
import { KinesisStreamsToLambda } from '@aws-solutions-constructs/aws-kinesisstreams-lambda';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { generateIntegStackName, SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as defaults from '@aws-solutions-constructs/core';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
SetConsistentFeatureFlags(stack);
stack.templateOptions.description = 'Integration Test for aws-kinesisstreams-kinesisfirehose-s3';

const construct = new KinesisStreamsToLambda(stack, 'test-kinesis-lambda', {
  lambdaFunctionProps: {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`)
  },
});

const streamFirehoseS3 = new KinesisStreamsToKinesisFirehoseToS3(stack, 'test-existing-stream-firehose-s3-stack', {
  existingStreamObj: construct.kinesisStream,
  createCloudWatchAlarms: false,
  bucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
  },
  logGroupProps: {
    removalPolicy: RemovalPolicy.DESTROY
  },
  logS3AccessLogs: false
});

const s3Bucket = streamFirehoseS3.s3Bucket as s3.Bucket;

defaults.addCfnSuppressRules(s3Bucket, [
  { id: 'W35',
    reason: 'This S3 bucket is created for unit/ integration testing purposes only.' },
]);

// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
