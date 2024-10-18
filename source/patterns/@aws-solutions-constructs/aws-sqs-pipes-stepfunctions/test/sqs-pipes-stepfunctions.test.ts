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

import { Stack } from "aws-cdk-lib";
import { SqsToPipesToStepfunctions, SqsToPipesToStepfunctionsProps } from "../lib";
import { Template } from 'aws-cdk-lib/assertions';
import * as defaults from '@aws-solutions-constructs/core';

test('Test default behaviors', () => {
  // Initial Setup
  const stack = new Stack();
  const props: SqsToPipesToStepfunctionsProps = {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'lamstp-test')
    }
  };
  const construct = new SqsToPipesToStepfunctions(stack, 'test-sqs-pipes-states', props);
  const template = Template.fromStack(stack);

  expect(construct.sqsQueue).toBeDefined();
  expect(construct.deadLetterQueue).toBeDefined();
  template.resourceCountIs("AWS::SQS::Queue", 2);

  const stateMachine = construct.stateMachine;
  expect(stateMachine).toBeDefined();
  const cwAlarm = construct.cloudwatchAlarms;
  expect(cwAlarm).toBeDefined();
  expect(construct.stateMachineLogGroup).toBeDefined();

  // TODO: Check # of alarms

  // TODO: Add checks for Pipes

});

// Tests for
//   maxRetries
//   pipes properties overrides
//   source or destination included
//   combining pipes properties with properties we set