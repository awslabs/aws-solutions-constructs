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
import { Stack, Aws } from "aws-cdk-lib";
import * as defaults from '../';
import '@aws-cdk/assert/jest';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import { buildLogGroup } from '../lib/cloudwatch-log-group-helper';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Template } from 'aws-cdk-lib/assertions';

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
  expect(stack).toCountResources("AWS::Logs::LogGroup", 1);

  expect(stack).toHaveResource("AWS::StepFunctions::StateMachine", {
    StateMachineName: "myStateMachine"
  });
});

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

test('Test deployment with custom role', () => {
  const descriptionText = 'Custom role for State Machine';

  // Stack
  const stack = new Stack();
  // Step function definition
  const startState = new sfn.Pass(stack, 'StartState');

  const customRole = new iam.Role(stack, 'custom-role', {
    assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
    description: descriptionText,
    inlinePolicies: {
      InvokePolicy: new iam.PolicyDocument({
        statements: [new iam.PolicyStatement({
          resources: [`arn:${Aws.PARTITION}:s3:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`],
          actions: ['s3:ListBucket']
        })]
      })
    }
  });

  // Build state machine
  const buildStateMachineResponse = defaults.buildStateMachine(stack, {
    definition: startState,
    role: customRole
  });

  // Assertion
  expect(stack).toCountResources("AWS::IAM::Role", 1);
  expect(buildStateMachineResponse.stateMachine).toBeDefined();

  expect(stack).toHaveResource("AWS::IAM::Role", {
    Description: descriptionText
  });
});

test('Confirm format of name', () => {
  // Stack
  const stack = new Stack();
  // Step function definition
  const startState = new sfn.Pass(stack, 'StartState');
  // Build state machine
  const buildStateMachineResponse = defaults.buildStateMachine(stack, {
    stateMachineName: 'myStateMachine',
    definition: startState,
  });
  // Assertion
  expect(buildStateMachineResponse.stateMachine).toBeDefined();

  expect(stack).toHaveResource("AWS::StepFunctions::StateMachine", {
    StateMachineName: "myStateMachine"
  });

  // Perform some fancy stuff to examine the specifics of the LogGroupName
  const expectedPrefix = '/aws/vendedlogs/states/constructs/';
  const lengthOfDatetimeSuffix = 13;

  const LogGroup = Template.fromStack(stack).findResources("AWS::Logs::LogGroup");
  const logName = LogGroup.StateMachineLogGroup15B91BCB.Properties.LogGroupName;
  const suffix = logName.slice(-lengthOfDatetimeSuffix);

  // Look for the expected Prefix and the 13 digit time suffix
  expect(logName.slice(0, expectedPrefix.length)).toEqual(expectedPrefix);
  expect(IsWholeNumber(suffix)).not.toBe(false);
});

function IsWholeNumber(target: string): boolean {
  const numberPattern = /[0-9]{13}/;
  return target.match(numberPattern) !== null;
}
