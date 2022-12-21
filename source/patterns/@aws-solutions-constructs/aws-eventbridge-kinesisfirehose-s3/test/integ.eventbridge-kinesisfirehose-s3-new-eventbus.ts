/**
 *  CopyrightAmazon.com, Inc. or its affiliates. All Rights Reserved.
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

import { App, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { EventbridgeToKinesisFirehoseToS3, EventbridgeToKinesisFirehoseToS3Props } from '../lib';
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import * as defaults from '@aws-solutions-constructs/core';
import * as s3 from "aws-cdk-lib/aws-s3";

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-eventbridge-kinesisfirehose-s3';

const props: EventbridgeToKinesisFirehoseToS3Props = {
  eventRuleProps: {
    eventPattern: {
      source: ['solutionsconstructs']
    }
  },
  eventBusProps: { eventBusName: 'test' },
  bucketProps: {
    removalPolicy: RemovalPolicy.DESTROY
  },
  logGroupProps: {
    removalPolicy: RemovalPolicy.DESTROY
  },
  logS3AccessLogs: false
};

const construct = new EventbridgeToKinesisFirehoseToS3(stack, 'test-eventbridge-kinesisfirehose-s3', props);
const s3Bucket = construct.s3Bucket as s3.Bucket;

defaults.addCfnSuppressRules(s3Bucket, [
  {
    id: 'W35',
    reason: 'This S3 bucket is created for unit/ integration testing purposes only.'
  },
]);

app.synth();
