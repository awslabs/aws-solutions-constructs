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
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sftasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ConstructsFactories, /* S3BucketFactoryProps, S3BucketFactoryResponse */ } from "../../lib";

test('All defaults', () => {
  const stack = new Stack();

  const factories = new ConstructsFactories(stack, 'target');
  const taskOne = new sftasks.EvaluateExpression(stack, 'simpleTask', {
    expression: '$.a + $.b'
  });

  const startState = sfn.DefinitionBody.fromChainable(taskOne);

  const newStateMachineResources = factories.stateMachineFactory('testsm', {
    stateMachineProps: {
      definitionBody: startState,
    }
  });

  expect(newStateMachineResources.stateMachine).toBeDefined();
  expect(newStateMachineResources.logGroup).toBeDefined();

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::StepFunctions::StateMachine", 1);
  template.resourceCountIs("AWS::Logs::LogGroup", 1);
  template.hasResourceProperties("AWS::StepFunctions::StateMachine", {
    DefinitionString: Match.anyValue(),
    LoggingConfiguration: Match.anyValue()
  });
});

test('Existing Log Group', () => {
  const stack = new Stack();

  const factories = new ConstructsFactories(stack, 'target');
  const taskOne = new sftasks.EvaluateExpression(stack, 'simpleTask', {
    expression: '$.a + $.b'
  });

  const existingLogGroup = new logs.LogGroup(stack, 'existingLogGroup');

  const startState = sfn.DefinitionBody.fromChainable(taskOne);

  const newStateMachineResources = factories.stateMachineFactory('testsm', {
    stateMachineProps: {
      definitionBody: startState,
      logs: {
        destination: existingLogGroup
      }
    }
  });

  expect(newStateMachineResources.stateMachine).toBeDefined();
  expect(newStateMachineResources.logGroup).toBeDefined();

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::StepFunctions::StateMachine", 1);
  template.resourceCountIs("AWS::Logs::LogGroup", 1);
  template.hasResourceProperties("AWS::StepFunctions::StateMachine", {
    DefinitionString: Match.anyValue(),
    LoggingConfiguration: Match.anyValue()
  });
});
