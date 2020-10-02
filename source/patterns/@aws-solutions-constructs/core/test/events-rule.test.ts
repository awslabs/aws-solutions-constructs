/**
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import { SynthUtils } from '@aws-cdk/assert';
import { Stack } from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as events from '@aws-cdk/aws-events';
import * as defaults from '../index';
import '@aws-cdk/assert/jest';
import { Schedule } from '@aws-cdk/aws-events';
import { Duration } from '@aws-cdk/core';
import { overrideProps } from '../lib/utils';

test('snapshot test EventsRuleProps default params', () => {
  const stack = new Stack();

  const lambdaFunctionProps: lambda.FunctionProps = {
    runtime: lambda.Runtime.NODEJS_12_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`)
  };

  const fn = defaults.deployLambdaFunction(stack, lambdaFunctionProps);

  const lambdaFunc: events.IRuleTarget = {
    bind: () => ({
      id: '',
      arn: fn.functionArn
    })
  };

  const defaultEventsRuleProps = defaults.DefaultEventsRuleProps([lambdaFunc]);
  const eventsRuleProps = overrideProps(defaultEventsRuleProps, {
    schedule: Schedule.rate(Duration.minutes(5))
  });

  new events.Rule(stack, 'Events', eventsRuleProps);
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

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

  expect(stack).toHaveResource('AWS::Events::Rule', {
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

  expect(stack).toHaveResource('AWS::Events::Rule', {
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
