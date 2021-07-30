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

import { SynthUtils } from '@aws-cdk/assert';
import * as events from '@aws-cdk/aws-events';
import { EventbridgeToStepfunctions, EventbridgeToStepfunctionsProps } from '../lib/index';
import { Duration } from '@aws-cdk/core';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import '@aws-cdk/assert/jest';
import * as cdk from '@aws-cdk/core';

function deployNewStateMachine(stack: cdk.Stack) {

  const startState = new sfn.Pass(stack, 'StartState');

  const props: EventbridgeToStepfunctionsProps = {
    stateMachineProps: {
      definition: startState
    },
    eventRuleProps: {
      schedule: events.Schedule.rate(Duration.minutes(5))
    }
  };

  return new EventbridgeToStepfunctions(stack, 'test-events-rule-step-function', props);
}

test('snapshot test EventbridgeToStepfunctions default params', () => {
  const stack = new cdk.Stack();
  deployNewStateMachine(stack);
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('check events rule role policy permissions', () => {
  const stack = new cdk.Stack();

  deployNewStateMachine(stack);

  expect(stack).toHaveResource("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: "states:StartExecution",
          Effect: "Allow",
          Resource: {
            Ref: "testeventsrulestepfunctionStateMachineBB26627E"
          }
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test('check events rule properties', () => {
  const stack = new cdk.Stack();

  deployNewStateMachine(stack);

  expect(stack).toHaveResource('AWS::Events::Rule', {
    ScheduleExpression: "rate(5 minutes)",
    State: "ENABLED",
    Targets: [
      {
        Arn: {
          Ref: "testeventsrulestepfunctionStateMachineBB26627E"
        },
        Id: "Target0",
        RoleArn: {
          "Fn::GetAtt": [
            "testeventsrulestepfunctionEventsRuleRole5AC0B2DC",
            "Arn"
          ]
        }
      }
    ]
  });
});

test('check properties', () => {
  const stack = new cdk.Stack();

  const construct: EventbridgeToStepfunctions = deployNewStateMachine(stack);

  expect(construct.cloudwatchAlarms !== null);
  expect(construct.stateMachine !== null);
  expect(construct.eventsRule !== null);
  expect(construct.stateMachineLogGroup !== null);
});

test('check properties with no CW Alarms', () => {
  const stack = new cdk.Stack();
  const startState = new sfn.Pass(stack, 'StartState');

  const props: EventbridgeToStepfunctionsProps = {
    stateMachineProps: {
      definition: startState
    },
    eventRuleProps: {
      schedule: events.Schedule.rate(Duration.minutes(5))
    },
    createCloudWatchAlarms: false
  };

  const construct: EventbridgeToStepfunctions =  new EventbridgeToStepfunctions(stack, 'test-events-rule-step-function', props);

  expect(construct.cloudwatchAlarms === null);
  expect(construct.stateMachine !== null);
  expect(construct.eventsRule !== null);
  expect(construct.stateMachineLogGroup !== null);
});