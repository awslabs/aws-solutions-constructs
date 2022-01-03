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

import * as events from '@aws-cdk/aws-events';
import * as kinesis from '@aws-cdk/aws-kinesis';
import { App, Stack } from '@aws-cdk/core';
import { EventsRuleToKinesisStreams, EventsRuleToKinesisStreamsProps } from '../lib';
import { generateIntegStackName } from '@aws-solutions-constructs/core';

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-eventsrule-kinesisstreams with existing kinesis stream';

const stream = new kinesis.Stream(stack, 'test-stream', {
  shardCount: 2,
  encryption: kinesis.StreamEncryption.MANAGED
});

const existingEventBus = new events.EventBus(stack, `existing-event-bus`, {  eventBusName: 'test'  });
const props: EventsRuleToKinesisStreamsProps = {
  eventRuleProps: {
    eventPattern: {
      source: ['solutionsconstructs']
    }
  },
  existingStreamObj: stream,
  existingEventBusInterface: existingEventBus
};

new EventsRuleToKinesisStreams(stack, 'test-eventsrule-kinesis-stream-existing', props);

app.synth();
