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

// Imports
import { Stack } from "@aws-cdk/core";
import * as defaults from '../';
import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import { LogGroup } from "@aws-cdk/aws-logs";

// --------------------------------------------------------------
// Test minimal deployment with no properties
// --------------------------------------------------------------
test('Test minimal deployment with no properties', () => {
    // Stack
    const stack = new Stack();
    // Step function definition
    const startState = new sfn.Pass(stack, 'StartState');
    // Build state machine
    defaults.buildStateMachine(stack, {
        definition: startState
    });
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test deployment w/ custom properties
// --------------------------------------------------------------
test('Test deployment w/ custom properties', () => {
    // Stack
    const stack = new Stack();
    // Step function definition
    const startState = new sfn.Pass(stack, 'StartState');
    // Build state machine
    defaults.buildStateMachine(stack, {
        definition: startState,
        stateMachineName: 'myStateMachine'
    });
    // Assertion
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
    const logGroup = new LogGroup(stack, 'myLogGroup', defaults.DefaultLogGroupProps());
    // Build state machine
    defaults.buildStateMachine(stack, {
        definition: startState,
        logs: {
            destination: logGroup,
            level: sfn.LogLevel.FATAL
        }
    });
    // Assertion
    expect(stack).toHaveResource("AWS::StepFunctions::StateMachine", {
        LoggingConfiguration: {
            Destinations: [{
                CloudWatchLogsLogGroup: {
                  LogGroupArn: {
                    "Fn::GetAtt": [
                      "myLogGroup46524CAB",
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
// Check default Cloudwatch perissions
// --------------------------------------------------------------
test('Test deployment w/ logging enabled', () => {
    // Stack
    const stack = new Stack();
    // Step function definition
    const startState = new sfn.Pass(stack, 'StartState');
    // Build state machine
    defaults.buildStateMachine(stack, {
        definition: startState
    });
    // Assertion
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
                  "arn:aws:logs:",
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
  const [sm] = defaults.buildStateMachine(stack, {
      definition: startState
  });
  const cwList = defaults.buildStepFunctionCWAlarms(stack, sm);

  expect(cwList.length).toEqual(3);
});