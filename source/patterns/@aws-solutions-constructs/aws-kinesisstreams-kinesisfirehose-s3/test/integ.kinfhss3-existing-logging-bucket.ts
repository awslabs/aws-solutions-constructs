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
import * as s3 from 'aws-cdk-lib/aws-s3';
import { App, Stack, RemovalPolicy } from 'aws-cdk-lib';
import { CreateScrapBucket, suppressCustomHandlerCfnNagWarnings } from '@aws-solutions-constructs/core';
import { KinesisStreamsToKinesisFirehoseToS3 } from '../lib';
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-kinesisstreams-kinesisfirehose-s3';
stack.node.setContext("@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy", true);

const existingBucket = CreateScrapBucket(stack, "scrapBucket", {
  bucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
  }
});

const myLoggingBucket: s3.IBucket = s3.Bucket.fromBucketName(stack, 'myLoggingBucket', existingBucket.bucketName);
new KinesisStreamsToKinesisFirehoseToS3(stack, 'test-existing-logging-bucket-streams-firehose-s3-stack', {
  existingLoggingBucketObj: myLoggingBucket,
  bucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
  },
  logGroupProps: {
    removalPolicy: RemovalPolicy.DESTROY
  }
});
suppressCustomHandlerCfnNagWarnings(stack, 'Custom::S3AutoDeleteObjectsCustomResourceProvider');

// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
