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

import { App, Stack, RemovalPolicy, Duration } from "aws-cdk-lib";
import { EventbridgeToKinesisFirehoseToS3 } from "../lib";
import { generateIntegStackName, SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as events from 'aws-cdk-lib/aws-events';
import * as defaults from '@aws-solutions-constructs/core';

const app = new App();

// Empty arguments
const stack = new Stack(app, generateIntegStackName(__filename));
SetConsistentFeatureFlags(stack);
stack.node.setContext("@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy", true);

const logBucket = defaults.CreateScrapBucket(stack, "scrapBucket");

new EventbridgeToKinesisFirehoseToS3(stack, 'evtfhss3-existing-log-bucket', {
  eventRuleProps: {
    schedule: events.Schedule.rate(Duration.minutes(5))
  },
  bucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    serverAccessLogsBucket: logBucket,
  },
  logGroupProps: {
    removalPolicy: RemovalPolicy.DESTROY
  },
});

defaults.suppressCustomHandlerCfnNagWarnings(stack, 'Custom::S3AutoDeleteObjectsCustomResourceProvider');
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
