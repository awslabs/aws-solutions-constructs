/**
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { App, Stack, Duration } from '@aws-cdk/core';
import { EventsRuleToKinesisStreams, EventsRuleToKinesisStreamsProps } from '../lib';

const app = new App();
const stack = new Stack(app, 'test-rule-kinesisstream');
stack.templateOptions.description = 'Integration Test for aws-events-rule-kinesisstreams';

const props: EventsRuleToKinesisStreamsProps = {
  eventRuleProps: {
    schedule: events.Schedule.rate(Duration.minutes(5))
  }
};

new EventsRuleToKinesisStreams(stack, 'test-events-rule-kinesis-stream', props);

app.synth();