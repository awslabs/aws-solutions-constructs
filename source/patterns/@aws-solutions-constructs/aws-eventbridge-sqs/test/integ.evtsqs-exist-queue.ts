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

import { Duration } from 'aws-cdk-lib';
import { EventbridgeToSqsProps, EventbridgeToSqs } from '../lib';
import * as events from 'aws-cdk-lib/aws-events';
import { App, Stack } from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as kms from 'aws-cdk-lib/aws-kms';
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));

const existingQueueObj = new sqs.Queue(stack, 'MyQueue', {
  encryption: sqs.QueueEncryption.KMS,
  encryptionMasterKey: new kms.Key(stack, 'MyKey', {
    enableKeyRotation: true
  }),
});

const props: EventbridgeToSqsProps = {
  eventRuleProps: {
    schedule: events.Schedule.rate(Duration.minutes(5))
  },
  existingQueueObj
};

new EventbridgeToSqs(stack, 'construct', props);
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
