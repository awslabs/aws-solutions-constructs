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
import { CfnJob } from 'aws-cdk-lib/aws-glue';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Bucket, BucketEncryption, CfnBucket } from 'aws-cdk-lib/aws-s3';
import { App, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { generateIntegStackName, SinkStoreType } from '@aws-solutions-constructs/core';
import { KinesisstreamsToGluejob } from '../lib';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-kinesisstream-gluejob';

const scriptBucket = new Bucket(stack, 'existingScriptLocation', {
  versioned: false,
  lifecycleRules: [{
    expiration: Duration.days(30)
  }],
  removalPolicy: RemovalPolicy.DESTROY,
  encryption: BucketEncryption.S3_MANAGED
});

(scriptBucket.node.defaultChild as CfnBucket).cfnOptions.metadata = {
  cfn_nag: {
    rules_to_suppress: [{
      id: 'W51',
      reason: 'This S3 bucket is created for unit/ integration testing purposes only and not part of \
      the actual construct implementation'
    }, {
      id: 'W35',
      reason: 'This S3 bucket is created for unit/ integration testing purposes only and not part of \
      the actual construct implementation'
    }, {
      id: 'W41',
      reason: 'This S3 bucket is created for unit/ integration testing purposes only and not part of \
      the actual construct'
    }]
  }
};

const job = new CfnJob(stack, 'ExistingJob', {
  command: {
    name: 'glueetl',
    pythonVersion: '3',
    scriptLocation: scriptBucket.bucketArn,
  },
  role: new Role(stack, 'JobRole', {
    assumedBy: new ServicePrincipal('glue.amazonaws.com')
  }).roleArn
});

// Definitions
new KinesisstreamsToGluejob(stack, 'test-kinesisstreams-lambda', {
  existingGlueJob: job,
  fieldSchema: [{
    name: "id",
    type: "int",
    comment: "Identifier for the record"
  }, {
    name: "name",
    type: "string",
    comment: "The name of the record"
  }, {
    name: "type",
    type: "string",
    comment: "The type of the record"
  }, {
    name: "numericvalue",
    type: "int",
    comment: "Some value associated with the record"
  }],
  outputDataStore: {
    datastoreType: SinkStoreType.S3
  }
});

// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
