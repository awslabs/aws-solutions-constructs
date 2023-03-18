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

// Imports
import { Stack } from "aws-cdk-lib";
import * as defaults from '../';
import '@aws-cdk/assert/jest';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import { buildLogGroup } from '../lib/cloudwatch-log-group-helper';

// --------------------------------------------------------------
// Test deployment w/ custom properties
// --------------------------------------------------------------
test('Test deployment w/ custom properties', () => {
  // Stack
  const stack = new Stack();
  // Step function definition
  const startState = new sfn.Pass(stack, 'StartState');
  // Build state machine
  const buildStateMachineResponse = defaults.buildStateMachine(stack, {
    definition: startState,
    stateMachineName: 'myStateMachine'
  });
  // Assertion
  expect(buildStateMachineResponse.stateMachine).toBeDefined();
  expect(buildStateMachineResponse.stateMachine).toBeDefined();
  expect(stack).toCountResources("AWS::Logs::LogGroup", 1);

  expect(stack).toHaveResource("AWS::StepFunctions::StateMachine", {
    StateMachineName: "myStateMachine"
  });
});

// --------------------------------------------------------------
// Test deployment w/ logging enabled
// --------------------------------------------------------------
test('Test deployment w/ logging enabled', () => {
  // Stack
  const stack = new Stack();
  // Step function definition
  const startState = new sfn.Pass(stack, 'StartState');
  // Log group
  // const logGroup = new LogGroup(stack, 'myLogGroup', defaults.buildLogGroup(stack));
  const logGroup = buildLogGroup(stack, 'StateMachineLogGroup');

  // Build state machine
  const buildStateMachineResponse = defaults.buildStateMachine(stack, {
    definition: startState,
    logs: {
      destination: logGroup,
      level: sfn.LogLevel.FATAL
    }
  });
  // Assertion
  expect(stack).toCountResources("AWS::Logs::LogGroup", 1);
  expect(buildStateMachineResponse.stateMachine).toBeDefined();
  expect(buildStateMachineResponse.stateMachine).toBeDefined();

  expect(stack).toHaveResource("AWS::StepFunctions::StateMachine", {
    LoggingConfiguration: {
      Destinations: [{
        CloudWatchLogsLogGroup: {
          LogGroupArn: {
            "Fn::GetAtt": [
              "StateMachineLogGroup15B91BCB",
              "Arn"
            ]
          }
        }
      }],
      Level: 'FATAL'
    }
  });
});

// --------------------------------------------------------------
// Check default Cloudwatch permissions
// --------------------------------------------------------------
test('Check default Cloudwatch permissions', () => {
  // Stack
  const stack = new Stack();
  // Step function definition
  const startState = new sfn.Pass(stack, 'StartState');
  // Build state machine
  const buildStateMachineResponse = defaults.buildStateMachine(stack, {
    definition: startState
  });
  // Assertion
  expect(buildStateMachineResponse.stateMachine).toBeDefined();
  expect(buildStateMachineResponse.stateMachine).toBeDefined();
  expect(stack).toHaveResource("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "logs:CreateLogDelivery",
            "logs:GetLogDelivery",
            "logs:UpdateLogDelivery",
            "logs:DeleteLogDelivery",
            "logs:ListLogDeliveries"
          ],
          Effect: "Allow",
          Resource: "*"
        },
        {
          Action: [
            "logs:PutResourcePolicy",
            "logs:DescribeResourcePolicies",
            "logs:DescribeLogGroups"
          ],
          Effect: "Allow",
          Resource: {
            "Fn::Join": [
              "",
              [
                "arn:",
                {
                  Ref: "AWS::Partition"
                },
                ":logs:",
                {
                  Ref: "AWS::Region"
                },
                ":",
                {
                  Ref: "AWS::AccountId"
                },
                ":*"
              ]
            ]
          }
        }
      ],
      Version: "2012-10-17"
    }
  });
});

// --------------------------------------------------------------
// Check CW Alarms
// --------------------------------------------------------------
test('Count State Machine CW Alarms', () => {
  // Stack
  const stack = new Stack();
  // Step function definition
  const startState = new sfn.Pass(stack, 'StartState');
  // Build state machine
  const buildStateMachineResponse = defaults.buildStateMachine(stack, {
    definition: startState
  });
  const cwList = defaults.buildStepFunctionCWAlarms(stack, buildStateMachineResponse.stateMachine);
  expect(buildStateMachineResponse.stateMachine).toBeDefined();
  expect(buildStateMachineResponse.stateMachine).toBeDefined();

  expect(cwList.length).toEqual(3);
});