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

// In order to confirm that we avoid name collisions on the event binding with both multiple constructs and multiple stacks,
// launch two stacks with two constructs at the same time using
//  cdk-integ integ.second-long-stack-name.js integ.long-stack-name.js --no-clean
// and confirm that all topics are publishing messages.

import { Duration } from 'aws-cdk-lib';
import { EventbridgeToSns, EventbridgeToSnsProps } from '../lib';
import * as events from 'aws-cdk-lib/aws-events';
import { App, Stack } from 'aws-cdk-lib';
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

const app = new App();

const stackTwo = new Stack(app, generateIntegStackName(__filename) + 'ThisIsTheLongestNameForAStackItMustBeGreaterThanSixtyFourCharactersLongAndThisShouldJustAboutDoItNoItMustBeABitLessShort');

const propsTwo: EventbridgeToSnsProps = {
  eventRuleProps: {
    schedule: events.Schedule.rate(Duration.minutes(1))
  }
};

new EventbridgeToSns(stackTwo, 'test-construct', propsTwo);
new EventbridgeToSns(stackTwo, 'second-construct', propsTwo);

new IntegTest(stackTwo, 'Integ', { testCases: [
  stackTwo
] });
