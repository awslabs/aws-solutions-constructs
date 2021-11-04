/**
 *  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

/// !cdk-integ *
import { App, Stack, RemovalPolicy, Duration } from "@aws-cdk/core";
import { EventbridgeToKinesisFirehoseToS3 } from "../lib";
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import * as s3 from "@aws-cdk/aws-s3";
import * as defaults from '@aws-solutions-constructs/core';
import * as events from '@aws-cdk/aws-events';

const app = new App();

// Empty arguments
const stack = new Stack(app, generateIntegStackName(__filename));

const construct = new EventbridgeToKinesisFirehoseToS3(stack, 'test-kinesisfirehose-s3', {
  eventRuleProps: {
    schedule: events.Schedule.rate(Duration.minutes(5))
  },
  bucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
  },
  loggingBucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    bucketName: 'custom-logging-bucket',
    encryption: s3.BucketEncryption.S3_MANAGED,
    versioned: true
  },
  logGroupProps: {
    removalPolicy: RemovalPolicy.DESTROY
  }
});

const s3Bucket = construct.s3Bucket as s3.Bucket;

defaults.addCfnSuppressRules(s3Bucket, [
  {
    id: 'W35',
    reason: 'This S3 bucket is created for unit/ integration testing purposes only.'
  },
]);

app.synth();