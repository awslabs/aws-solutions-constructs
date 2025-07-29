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

import { App, Stack } from "aws-cdk-lib";
import { IotToS3, IotToS3Props } from "../lib";
import * as defaults from '@aws-solutions-constructs/core';
import { generateIntegStackName, SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import { BucketEncryption } from "aws-cdk-lib/aws-s3";

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
SetConsistentFeatureFlags(stack);
stack.node.setContext("@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy", true);

const existingBucket = defaults.CreateScrapBucket(stack, "scrapBucket", {
  bucketProps: {
    encryption: BucketEncryption.KMS_MANAGED,
  }
});

const props: IotToS3Props = {
  iotTopicRuleProps: {
    topicRulePayload: {
      ruleDisabled: false,
      description: "process solutions constructs messages",
      sql: "SELECT * FROM 'solutions/constructs'",
      actions: []
    }
  },
  existingBucketInterface: existingBucket,
  s3Key: 'test/${timestamp()}'
};

new IotToS3(stack, 'test-iot-s3-integration', props);
defaults.suppressCustomHandlerCfnNagWarnings(stack, 'Custom::S3AutoDeleteObjectsCustomResourceProvider');

new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
