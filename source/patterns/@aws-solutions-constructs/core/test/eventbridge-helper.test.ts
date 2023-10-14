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

// --------------------------------------------------------------
// Test deployment with no properties
// --------------------------------------------------------------
test('Test deployment with no properties', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  defaults.buildEventBus(stack, {
    eventBusProps: {
      eventBusName: 'testneweventbus'
    }
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::EventBridge::EventBus", 0);
});

// --------------------------------------------------------------
// Test deployment with existing EventBus
// --------------------------------------------------------------
test('Test deployment with existing EventBus', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  defaults.buildEventBus(stack, {
    existingEventBusInterface: new events.EventBus(stack, `existing-event-bus`, { eventBusName: 'test-bus' })
  });

  Template.fromStack(stack).resourceCountIs('AWS::Events::EventBus', 1);
});

// --------------------------------------------------------------
// Test deployment with new EventBus with props
// --------------------------------------------------------------
test('Test deployment with new EventBus with props', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  defaults.buildEventBus(stack, {
    eventBusProps: {
      eventBusName: 'testneweventbus'
    }
  });

  Template.fromStack(stack).hasResourceProperties('AWS::Events::EventBus', {
    Name: 'testneweventbus'
  });
});

// ---------------------------
// Prop Tests
// ---------------------------

test('Test fail EventBridge bad bus props', () => {
  const stack = new Stack();

  const props: defaults.EventBridgeProps = {
    existingEventBusInterface: new events.EventBus(stack, 'test', {}),
    eventBusProps: {}
  };

  const app = () => {
    defaults.CheckEventBridgeProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide existingEventBusInterface or eventBusProps, but not both.\n');
});
