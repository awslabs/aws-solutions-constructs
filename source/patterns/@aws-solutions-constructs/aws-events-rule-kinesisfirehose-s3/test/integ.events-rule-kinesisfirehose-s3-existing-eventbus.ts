/**
 *  Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import * as events from '@aws-cdk/aws-events';
import { App, RemovalPolicy, Stack } from '@aws-cdk/core';
import { EventsRuleToKinesisFirehoseToS3, EventsRuleToKinesisFirehoseToS3Props } from '../lib';
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import * as defaults from '@aws-solutions-constructs/core';
import * as s3 from "@aws-cdk/aws-s3";

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-eventsrule-kinesisfirehose-s3';
const existingEventBus = new events.EventBus(stack, `test-existing-eventbus`, {  eventBusName: 'test'  });
const props: EventsRuleToKinesisFirehoseToS3Props = {
  eventRuleProps: {
    eventPattern: {
      source: ['solutionsconstructs']
    }
  },
  existingEventBusInterface: existingEventBus,
  bucketProps: {
    removalPolicy: RemovalPolicy.DESTROY
  },
  logGroupProps: {
    removalPolicy: RemovalPolicy.DESTROY
  },
  logS3AccessLogs: false
};

const construct = new EventsRuleToKinesisFirehoseToS3(stack, 'test-events-rule-kinesisfirehose-s3', props);
const s3Bucket = construct.s3Bucket as s3.Bucket;

defaults.addCfnSuppressRules(s3Bucket, [
  {
    id: 'W35',
    reason: 'This S3 bucket is created for unit/ integration testing purposes only.'
  },
]);

app.synth();
