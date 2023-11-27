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
import { BucketEncryption } from "aws-cdk-lib/aws-s3";
import { IotToKinesisFirehoseToS3 } from "../lib";
import { generateIntegStackName, suppressAutoDeleteHandlerWarnings } from '@aws-solutions-constructs/core';

const app = new App();

// Empty arguments
const stack = new Stack(app, generateIntegStackName(__filename));

new IotToKinesisFirehoseToS3(stack, 'test-iot-kinesisfirehose-s3', {
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
  },
  loggingBucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
    bucketName: `${generateIntegStackName(__filename).toLowerCase()}-custom-logging-bucket`,
    encryption: BucketEncryption.S3_MANAGED,
    versioned: true
  }
});

suppressAutoDeleteHandlerWarnings(stack);
app.synth();