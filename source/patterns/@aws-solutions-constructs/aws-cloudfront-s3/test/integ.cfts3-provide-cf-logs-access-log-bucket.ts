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
import { App, Stack, RemovalPolicy, aws_s3_deployment } from "aws-cdk-lib";
import { CloudFrontToS3 } from "../lib";
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as defaults from '@aws-solutions-constructs/core';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.node.setContext("@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy", true);
stack.templateOptions.description = 'Integration Test for aws-cloudfront-s3';

const cfLogAccessLogs = new s3.Bucket(stack, 'cfLogAccessLogs', {
  removalPolicy: RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
});

const construct = new CloudFrontToS3(stack, 'test-cloudfront-s3', {
  cloudFrontLoggingBucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
    serverAccessLogsBucket: cfLogAccessLogs
  },
  bucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true
  },
  loggingBucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true
  },
});

new aws_s3_deployment.BucketDeployment(stack, 'DeployIndexFile', {
  sources: [ aws_s3_deployment.Source.data('index.html', '<H3>Hello, World</H3>')],
  destinationBucket: construct.s3BucketInterface,
});

const s3Bucket = construct.s3Bucket as s3.Bucket;

defaults.addCfnSuppressRules(s3Bucket, [
  { id: 'W35',
    reason: 'This S3 bucket is created for unit/ integration testing purposes only.' },
]);

defaults.addCfnSuppressRules(cfLogAccessLogs, [
  { id: 'W35',
    reason: 'This S3 bucket is created for unit/ integration testing purposes only.' },
]);

defaults.suppressAutoDeleteHandlerWarnings(stack);
// Synth
app.synth();
