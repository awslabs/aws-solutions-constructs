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
import { Stack } from '@aws-cdk/core';
import * as events from '@aws-cdk/aws-events';
import * as defaults from '../index';
import '@aws-cdk/assert/jest';

// --------------------------------------------------------------
// Test deployment with no properties
// --------------------------------------------------------------
test('Test deployment with no properties', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  defaults.buildEventBus(stack, {});
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  // Assertion 2
  expect(stack).not.toHaveResource("AWS::EventBridge::EventBus");
});

// --------------------------------------------------------------
// Test deployment with existing EventBus
// --------------------------------------------------------------
test('Test deployment with existing EventBus', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  defaults.buildEventBus(stack, {
    existingEventBus: new events.EventBus(stack, `existing-event-bus`, {})
  });
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  // Assertion 2
  expect(stack).toHaveResource('AWS::Events::EventBus', {});
});

// --------------------------------------------------------------
// Test deployment with new EventBus no props
// --------------------------------------------------------------
test('Test deployment with new EventBus no props', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  defaults.buildEventBus(stack, {
    eventBusProps: {}
  });
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  // Assertion 2
  expect(stack).toHaveResource('AWS::Events::EventBus', {});
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
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  // Assertion 2
  expect(stack).toHaveResource('AWS::Events::EventBus', {
    Name: 'testneweventbus'
  });
});