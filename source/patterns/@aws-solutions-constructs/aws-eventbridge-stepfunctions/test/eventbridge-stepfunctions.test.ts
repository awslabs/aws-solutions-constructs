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

import * as events from 'aws-cdk-lib/aws-events';
import { EventbridgeToStepfunctions, EventbridgeToStepfunctionsProps } from '../lib/index';
import { Duration } from 'aws-cdk-lib';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import '@aws-cdk/assert/jest';
import * as cdk from 'aws-cdk-lib';

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

  return new EventbridgeToStepfunctions(stack, 'test-eventbridge-stepfunctions', props);
}

function deployNewStateMachineAndEventBus(stack: cdk.Stack) {

  const startState = new sfn.Pass(stack, 'StartState');

  const props: EventbridgeToStepfunctionsProps = {
    stateMachineProps: {
      definition: startState
    },
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    },
    eventBusProps: { eventBusName: 'test' }
  };

  return new EventbridgeToStepfunctions(stack, 'test-eventbridge-stepfunctions-eventbus', props);
}

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
            Ref: "testeventbridgestepfunctionsStateMachineDD09BCB6"
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
          Ref: "testeventbridgestepfunctionsStateMachineDD09BCB6"
        },
        Id: "Target0",
        RoleArn: {
          "Fn::GetAtt": [
            "testeventbridgestepfunctionsEventsRuleRoleFFAAD2A8",
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

  const construct: EventbridgeToStepfunctions =  new EventbridgeToStepfunctions(stack, 'test-eventbridge-stepfunctions', props);

  expect(construct.cloudwatchAlarms === null);
  expect(construct.stateMachine !== null);
  expect(construct.eventsRule !== null);
  expect(construct.stateMachineLogGroup !== null);
});

test('check eventbus property, snapshot & eventbus exists', () => {
  const stack = new cdk.Stack();

  const construct: EventbridgeToStepfunctions = deployNewStateMachineAndEventBus(stack);

  expect(construct.cloudwatchAlarms !== null);
  expect(construct.stateMachine !== null);
  expect(construct.eventsRule !== null);
  expect(construct.stateMachineLogGroup !== null);
  expect(construct.eventBus !== null);

  // Check whether eventbus exists
  expect(stack).toHaveResource('AWS::Events::EventBus');
});

test('check exception while passing existingEventBus & eventBusProps', () => {
  const stack = new cdk.Stack();
  const startState = new sfn.Pass(stack, 'StartState');

  const props: EventbridgeToStepfunctionsProps = {
    stateMachineProps: {
      definition: startState
    },
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    },
    eventBusProps: { eventBusName: 'test' },
    existingEventBusInterface: new events.EventBus(stack, `test-existing-new-eventbus`, {  eventBusName: 'test'  })
  };

  const app = () => {
    new EventbridgeToStepfunctions(stack, 'test-eventbridge-stepfunctions', props);
  };
  expect(app).toThrowError();
});

test('check custom event bus resource with props when deploy:true', () => {
  const stack = new cdk.Stack();
  const startState = new sfn.Pass(stack, 'StartState');

  const props: EventbridgeToStepfunctionsProps = {
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
  new EventbridgeToStepfunctions(stack, 'test-new-eventbridge-stepfunctions', props);

  expect(stack).toHaveResource('AWS::Events::EventBus', {
    Name: 'testcustomeventbus'
  });
});