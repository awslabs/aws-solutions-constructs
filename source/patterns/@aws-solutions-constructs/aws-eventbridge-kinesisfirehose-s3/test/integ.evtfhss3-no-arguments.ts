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

import * as events from 'aws-cdk-lib/aws-events';
import { App, Stack, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { EventbridgeToKinesisFirehoseToS3, EventbridgeToKinesisFirehoseToS3Props } from '../lib';
import { SuppressCfnNagLambdaWarnings, generateIntegStackName } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-eventbridge-kinesisfirehose-s3';

const props: EventbridgeToKinesisFirehoseToS3Props = {
  eventRuleProps: {
    schedule: events.Schedule.rate(Duration.minutes(5))
  },
  logGroupProps: {
    removalPolicy: RemovalPolicy.DESTROY,
  },
  bucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
  },
  loggingBucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
  }
};

new EventbridgeToKinesisFirehoseToS3(stack, 'evtfhss3-no-args', props);

SuppressCfnNagLambdaWarnings(stack);
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
