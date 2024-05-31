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
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as defaults from '@aws-solutions-constructs/core';

function deployNewStateMachine(stack: cdk.Stack) {

  const props: EventbridgeToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'test'),
    },
    eventRuleProps: {
      schedule: events.Schedule.rate(Duration.minutes(5))
    }
  };

  return new EventbridgeToStepfunctions(stack, 'test-eventbridge-stepfunctions', props);
}

function deployNewStateMachineAndEventBus(stack: cdk.Stack) {

  const props: EventbridgeToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'test'),
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

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::IAM::Policy", {
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

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Events::Rule', {
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

  expect(construct.cloudwatchAlarms).toBeDefined();
  expect(construct.stateMachine).toBeDefined();
  expect(construct.eventsRule).toBeDefined();
  expect(construct.stateMachineLogGroup).toBeDefined();
});

test('check properties with no CW Alarms', () => {
  const stack = new cdk.Stack();
  const props: EventbridgeToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'test'),
    },
    eventRuleProps: {
      schedule: events.Schedule.rate(Duration.minutes(5))
    },
    createCloudWatchAlarms: false
  };

  const construct: EventbridgeToStepfunctions =  new EventbridgeToStepfunctions(stack, 'test-eventbridge-stepfunctions', props);

  expect(construct.cloudwatchAlarms).not.toBeDefined();
  expect(construct.stateMachine).toBeDefined();
  expect(construct.eventsRule).toBeDefined();
  expect(construct.stateMachineLogGroup).toBeDefined();
});

test('check eventbus property, snapshot & eventbus exists', () => {
  const stack = new cdk.Stack();

  const construct: EventbridgeToStepfunctions = deployNewStateMachineAndEventBus(stack);

  expect(construct.cloudwatchAlarms).toBeDefined();
  expect(construct.stateMachine).toBeDefined();
  expect(construct.eventsRule).toBeDefined();
  expect(construct.stateMachineLogGroup).toBeDefined();
  expect(construct.eventBus).toBeDefined();

  // Check whether eventbus exists
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Events::EventBus', 1);
});

test('Confirm CheckEventBridgeProps is being called', () => {
  const stack = new cdk.Stack();
  const props: EventbridgeToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'test'),
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
  expect(app).toThrowError('Error - Either provide existingEventBusInterface or eventBusProps, but not both.\n');
});

test('check custom event bus resource with props when deploy:true', () => {
  const stack = new cdk.Stack();
  const props: EventbridgeToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'test'),
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

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Events::EventBus', {
    Name: 'testcustomeventbus'
  });
});
