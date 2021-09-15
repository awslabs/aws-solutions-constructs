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
import { EventsRuleToStepFunction, EventsRuleToStepFunctionProps } from '../lib/index';
import { Duration } from '@aws-cdk/core';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import '@aws-cdk/assert/jest';
import * as cdk from '@aws-cdk/core';

function deployNewStateMachine(stack: cdk.Stack) {

  const startState = new sfn.Pass(stack, 'StartState');

  const props: EventsRuleToStepFunctionProps = {
    stateMachineProps: {
      definition: startState
    },
    eventRuleProps: {
      schedule: events.Schedule.rate(Duration.minutes(5))
    }
  };

  return new EventsRuleToStepFunction(stack, 'test-events-rule-step-function', props);
}

function deployNewStateMachineAndEventBus(stack: cdk.Stack) {

  const startState = new sfn.Pass(stack, 'StartState');

  const props: EventsRuleToStepFunctionProps = {
    stateMachineProps: {
      definition: startState
    },
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    },
    eventBusProps: {}
  };

  return new EventsRuleToStepFunction(stack, 'test-eventrules-stepfunctions-eventbus', props);
}

test('snapshot test EventsRuleToStepFunction default params', () => {
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
            Ref: "testeventsrulestepfunctiontesteventsrulestepfunctionWStateMachine64FD5A64"
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
          Ref: "testeventsrulestepfunctiontesteventsrulestepfunctionWStateMachine64FD5A64"
        },
        Id: "Target0",
        RoleArn: {
          "Fn::GetAtt": [
            "testeventsrulestepfunctiontesteventsrulestepfunctionWEventsRuleRole992B57E4",
            "Arn"
          ]
        }
      }
    ]
  });
});

test('check properties', () => {
  const stack = new cdk.Stack();

  const construct: EventsRuleToStepFunction = deployNewStateMachine(stack);

  expect(construct.cloudwatchAlarms !== null);
  expect(construct.stateMachine !== null);
  expect(construct.eventsRule !== null);
  expect(construct.stateMachineLogGroup !== null);
});

test('check properties with no CW Alarms', () => {
  const stack = new cdk.Stack();
  const startState = new sfn.Pass(stack, 'StartState');

  const props: EventsRuleToStepFunctionProps = {
    stateMachineProps: {
      definition: startState
    },
    eventRuleProps: {
      schedule: events.Schedule.rate(Duration.minutes(5))
    },
    createCloudWatchAlarms: false
  };

  const construct: EventsRuleToStepFunction =  new EventsRuleToStepFunction(stack, 'test-events-rule-step-function', props);

  expect(construct.cloudwatchAlarms === null);
  expect(construct.stateMachine !== null);
  expect(construct.eventsRule !== null);
  expect(construct.stateMachineLogGroup !== null);
});

test('check eventbus property, snapshot & eventbus exists', () => {
  const stack = new cdk.Stack();

  const construct: EventsRuleToStepFunction = deployNewStateMachineAndEventBus(stack);

  expect(construct.cloudwatchAlarms !== null);
  expect(construct.stateMachine !== null);
  expect(construct.eventsRule !== null);
  expect(construct.stateMachineLogGroup !== null);
  expect(construct.eventBus !== null);

  // Validate snapshot
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  // Check whether eventbus exists
  expect(stack).toHaveResource('AWS::Events::EventBus');
});

test('check exception while passing existingEventBus & eventBusProps', () => {
  const stack = new cdk.Stack();
  const startState = new sfn.Pass(stack, 'StartState');

  const props: EventsRuleToStepFunctionProps = {
    stateMachineProps: {
      definition: startState
    },
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    },
    eventBusProps: {},
    existingEventBusInterface: new events.EventBus(stack, `test-existing-new-eventbus`, {})
  };

  try {
    new EventsRuleToStepFunction(stack, 'test-eventsrule-stepfunctions', props);
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
  }
});

test('snapshot test EventsRuleToStepfunctions existing event bus params', () => {
  const stack = new cdk.Stack();
  const startState = new sfn.Pass(stack, 'StartState');

  const props: EventsRuleToStepFunctionProps = {
    stateMachineProps: {
      definition: startState
    },
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    },
    eventBusProps: {},
    existingEventBusInterface: new events.EventBus(stack, `test-existing-new-eventbus`, {})
  };

  new EventsRuleToStepFunction(stack, 'test-existing-eventsrule-stepfunctions', props);
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('check custom event bus resource with props when deploy:true', () => {
  const stack = new cdk.Stack();
  const startState = new sfn.Pass(stack, 'StartState');

  const props: EventsRuleToStepFunctionProps = {
    stateMachineProps: {
      definition: startState
    },
    eventBusProps: {
      eventBusName: 'testcustomeventbus'
    },
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    }
  };
  new EventsRuleToStepFunction(stack, 'test-new-eventsrule-stepfunctions', props);

  expect(stack).toHaveResource('AWS::Events::EventBus', {
    Name: 'testcustomeventbus'
  });
});

test('check multiple constructs in a single stack', () => {
  const stack = new cdk.Stack();
  const startState1 = new sfn.Pass(stack, 'StartState1');

  const props1: EventsRuleToStepFunctionProps = {
    stateMachineProps: {
      definition: startState1
    },
    eventBusProps: {},
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    }
  };

  const startState2 = new sfn.Pass(stack, 'StartState2');

  const props2: EventsRuleToStepFunctionProps = {
    stateMachineProps: {
      definition: startState2
    },
    eventBusProps: {},
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    }
  };
  new EventsRuleToStepFunction(stack, 'test-new-eventsrule-stepfunctions1', props1);
  new EventsRuleToStepFunction(stack, 'test-new-eventsrule-stepfunctions2', props2);

  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});