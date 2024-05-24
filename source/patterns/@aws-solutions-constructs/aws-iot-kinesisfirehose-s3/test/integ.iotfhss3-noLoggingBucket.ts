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
import { App, Stack, RemovalPolicy } from "aws-cdk-lib";
import { IotToKinesisFirehoseToS3 } from "../lib";
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as defaults from '@aws-solutions-constructs/core';

const app = new App();

// Empty arguments
const stack = new Stack(app, generateIntegStackName(__filename));

const construct = new IotToKinesisFirehoseToS3(stack, 'test-iot-kinesisfirehose-s3', {
  iotTopicRuleProps: {
    topicRulePayload: {
      ruleDisabled: false,
      description: "Persistent storage of connected vehicle telematics data",
      sql: "SELECT * FROM 'connectedcar/telemetry/#'",
      actions: []
    }
  },
  bucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true
  },
  logS3AccessLogs: false
});

const s3Bucket = construct.s3Bucket as s3.Bucket;

defaults.addCfnSuppressRules(s3Bucket, [
  {
    id: 'W35',
    reason: 'This S3 bucket is created for unit/ integration testing purposes only.'
  },
]);

defaults.SuppressCfnNagLambdaWarnings(stack);
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
