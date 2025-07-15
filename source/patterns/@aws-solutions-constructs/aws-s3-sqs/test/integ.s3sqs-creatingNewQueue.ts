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
import { S3ToSqs, S3ToSqsProps } from "../lib";
import * as kms from 'aws-cdk-lib/aws-kms';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { generateIntegStackName, SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as defaults from '@aws-solutions-constructs/core';

// Setup
const app = new App({
  postCliContext: {
    '@aws-cdk/aws-s3:keepNotificationInImportedBucket': false,
  },
});
const stack = new Stack(app, generateIntegStackName(__filename));
SetConsistentFeatureFlags(stack);
stack.templateOptions.description = 'Integration Test for aws-s3-sqs with standard Queue';

// For S3 to SQS bucket notification a customer managed CMK must be used:
const encryptionKeyProps: kms.KeyProps = {
  enableKeyRotation: true
};
const kmsKey = new kms.Key(stack, 'ImportedEncryptionKey', encryptionKeyProps);

// Configure notification filter
const filter: s3.NotificationKeyFilter = {
  prefix: 'the/place',
  suffix: '*.mp3'
};

// Define construct properties so that a new queue myQueue is created
const props: S3ToSqsProps = {
  queueProps: {
    queueName: `myQueue`,
    encryptionMasterKey: kmsKey
  },
  deadLetterQueueProps: {
    queueName: `myDLQueue`
  },
  s3EventTypes: [s3.EventType.OBJECT_REMOVED],
  s3EventFilters: [filter],
  bucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
  },
  logS3AccessLogs: false
};

const construct = new S3ToSqs(stack, 'test-s3-sqs', props);
const s3Bucket = construct.s3Bucket as s3.Bucket;

defaults.addCfnSuppressRules(s3Bucket, [
  { id: 'W35',
    reason: 'This S3 bucket is created for unit/ integration testing purposes only.' },
]);

defaults.SuppressCfnNagLambdaWarnings(stack);
// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
