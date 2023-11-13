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

/// !cdk-integ *
import { App, Stack, RemovalPolicy, Duration } from "aws-cdk-lib";
import { EventbridgeToKinesisFirehoseToS3 } from "../lib";
import { generateIntegStackName, suppressAutoDeleteHandlerWarnings } from '@aws-solutions-constructs/core';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as events from 'aws-cdk-lib/aws-events';

const app = new App();

// Empty arguments
const stack = new Stack(app, generateIntegStackName(__filename));

new EventbridgeToKinesisFirehoseToS3(stack, 'test-kinesisfirehose-s3', {
  eventRuleProps: {
    schedule: events.Schedule.rate(Duration.minutes(5))
  },
  bucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
  },
  loggingBucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
    bucketName: 'custom-logging-bucket',
    encryption: s3.BucketEncryption.S3_MANAGED,
    versioned: true
  },
  logGroupProps: {
    removalPolicy: RemovalPolicy.DESTROY
  }
});

suppressAutoDeleteHandlerWarnings(stack);
app.synth();