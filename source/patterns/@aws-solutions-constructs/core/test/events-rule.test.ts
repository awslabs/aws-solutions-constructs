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

import { Stack } from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as defaults from '../index';
import { Template } from 'aws-cdk-lib/assertions';
import { Schedule } from 'aws-cdk-lib/aws-events';
import { Duration } from 'aws-cdk-lib';
import { overrideProps } from '../lib/utils';

test('test EventsRuleProps override ruleName and description', () => {
  const stack = new Stack();

  const lambdaFunc: events.IRuleTarget = {
    bind: () => ({
      id: '',
      arn: 'ARN'
    })
  };

  const defaultEventsRuleProps = defaults.DefaultEventsRuleProps([lambdaFunc]);
  const eventsRuleProps = overrideProps(defaultEventsRuleProps, {
    ruleName: 'test',
    description: 'hello world',
    schedule: Schedule.rate(Duration.minutes(5))
  } as events.RuleProps);

  new events.Rule(stack, 'Events', eventsRuleProps);

  template.hasResourceProperties('AWS::Events::Rule', {
    Description: "hello world",
    Name: "test",
    ScheduleExpression: "rate(5 minutes)",
    State: "ENABLED",
    Targets: [
      {
        Arn: "ARN",
        Id: "Target0"
      }
    ]
  });
});

test('test EventsRuleProps add more event targets', () => {
  const stack = new Stack();

  const lambdaFunc1: events.IRuleTarget = {
    bind: () => ({
      id: '',
      arn: 'ARN1'
    })
  };

  const defaultEventsRuleProps = defaults.DefaultEventsRuleProps([lambdaFunc1]);

  const lambdaFunc2: events.IRuleTarget = {
    bind: () => ({
      id: '',
      arn: 'ARN2'
    })
  };

  const eventsRuleProps = overrideProps(defaultEventsRuleProps, {
    targets: [lambdaFunc2],
    schedule: Schedule.rate(Duration.minutes(5))
  } as events.RuleProps, true);

  new events.Rule(stack, 'Events', eventsRuleProps);

  template.hasResourceProperties('AWS::Events::Rule', {
    ScheduleExpression: "rate(5 minutes)",
    State: "ENABLED",
    Targets: [
      {
        Arn: "ARN1",
        Id: "Target0"
      },
      {
        Arn: "ARN2",
        Id: "Target1"
      }
    ]
  });
});
