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

import { EventsRuleToSns, EventsRuleToSnsProps } from '../lib';
import * as events from '@aws-cdk/aws-events';
import { App, Stack } from '@aws-cdk/core';
import { generateIntegStackName } from '@aws-solutions-constructs/core';

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));

const props: EventsRuleToSnsProps = {
  eventRuleProps: {
    eventPattern: {
      source: ['solutionsconstructs']
    }
  },
  existingEventBusInterface: new events.EventBus(stack, `existing-event-bus`, {}) // Create existing custom EventBus
};

new EventsRuleToSns(stack, 'test-construct', props);

app.synth();