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
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sfnTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { buildLogGroup } from '../lib/cloudwatch-log-group-helper';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Template } from 'aws-cdk-lib/assertions';

test('Test deployment w/ custom properties', () => {
  // Stack
  const stack = new Stack();
  // State Machine definition
  const startState = new sfn.Pass(stack, 'StartState');
  // Build state machine
  const buildStateMachineResponse = defaults.buildStateMachine(stack, defaults.idPlaceholder, {
    definition: startState,
    stateMachineName: 'myStateMachine'
  });
  // Assertion
  expect(buildStateMachineResponse.stateMachine).toBeDefined();
  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::Logs::LogGroup", 1);

  template.hasResourceProperties("AWS::StepFunctions::StateMachine", {
    StateMachineName: "myStateMachine"
  });
});

test('Test deployment w/ logging enabled', () => {
  // Stack
  const stack = new Stack();
  // State Machine definition
  const startState = new sfn.Pass(stack, 'StartState');
  // Log group
  // const logGroup = new LogGroup(stack, 'myLogGroup', defaults.buildLogGroup(stack));
  const logGroup = buildLogGroup(stack, 'StateMachineLogGroup');

  // Build state machine
  const buildStateMachineResponse = defaults.buildStateMachine(stack, defaults.idPlaceholder, {
    definition: startState,
    logs: {
      destination: logGroup,
      level: sfn.LogLevel.FATAL
    }
  });
  // Assertion
  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::Logs::LogGroup", 1);
  expect(buildStateMachineResponse.stateMachine).toBeDefined();
  expect(buildStateMachineResponse.stateMachine).toBeDefined();

  template.hasResourceProperties("AWS::StepFunctions::StateMachine", {
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
  // State Machine definition
  const startState = new sfn.Pass(stack, 'StartState');
  // Build state machine
  const buildStateMachineResponse = defaults.buildStateMachine(stack, defaults.idPlaceholder, {
    definition: startState
  });
  // Assertion
  expect(buildStateMachineResponse.stateMachine).toBeDefined();
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "logs:CreateLogDelivery",
            "logs:GetLogDelivery",
            "logs:UpdateLogDelivery",
            "logs:DeleteLogDelivery",
            "logs:ListLogDeliveries",
            "logs:PutResourcePolicy",
            "logs:DescribeResourcePolicies",
            "logs:DescribeLogGroups"
          ],
          Effect: "Allow",
          Resource: "*"
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test('Check State Machine IAM Policy with 2 Lambda fuctions in State Machine Definition', () => {
  // Stack
  const stack = new Stack();
  // State Machine definition
  const taskOne = new sfnTasks.LambdaInvoke(stack, 'task-one', {
    lambdaFunction: new lambda.Function(stack, 'first-function', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`exports.handler = async (event) => {return;}`)
    }),
  });

  const taskTwo = new sfnTasks.LambdaInvoke(stack, 'task-two', {
    lambdaFunction: new lambda.Function(stack, 'second-function', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`exports.handler = async (event) => {return;}`)
    }),
  });

  // // Launch the construct
  const startState = sfn.DefinitionBody.fromChainable(taskOne.next(taskTwo));
  // Build state machine
  const buildStateMachineResponse = defaults.buildStateMachine(stack, defaults.idPlaceholder, {
    definitionBody: startState
  });
  // Assertion
  expect(buildStateMachineResponse.stateMachine).toBeDefined();
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: "lambda:InvokeFunction",
          Effect: "Allow",
          Resource: [
            {},
            {}
          ]
        },
        {
          Action: "lambda:InvokeFunction",
          Effect: "Allow",
          Resource: [
            {},
            {}
          ]
        },
        {
          Action: [
            "logs:CreateLogDelivery",
            "logs:GetLogDelivery",
            "logs:UpdateLogDelivery",
            "logs:DeleteLogDelivery",
            "logs:ListLogDeliveries",
            "logs:PutResourcePolicy",
            "logs:DescribeResourcePolicies",
            "logs:DescribeLogGroups"
          ],
          Effect: "Allow",
          Resource: "*"
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test('Check State Machine IAM Policy with S3 API call in State Machine Definition', () => {
  // Stack
  const stack = new Stack();
  const sourceBucket = new s3.Bucket(stack, 'SourceBucket', {
    eventBridgeEnabled: true,
  });
  const destinationBucket = new s3.Bucket(stack, 'DestinationBucket', {});

  // State Machine definition
  const stateMachineDefinition = new sfnTasks.CallAwsService(stack, 'Copy S3 object', {
    service: 's3',
    action: 'copyObject',
    iamResources: [
      sourceBucket.bucketArn,
      destinationBucket.bucketArn,
    ],
    parameters: {
      CopySource: sfn.JsonPath.format(
        '{}/{}',
        sfn.JsonPath.stringAt('$.sourceBucketName'),
        sfn.JsonPath.stringAt('$.sourceObjectKey')
      ),
      Bucket: destinationBucket.bucketName,
      Key: sfn.JsonPath.format(
        '{}/{}',
        sfn.JsonPath.stringAt('$.destinationFolder'),
        sfn.JsonPath.stringAt('$.sourceObjectKey')
      ),
    },
    resultPath: sfn.JsonPath.DISCARD,
  });

  // Build state machine
  const buildStateMachineResponse = defaults.buildStateMachine(stack, defaults.idPlaceholder, {
    definitionBody: sfn.DefinitionBody.fromChainable(stateMachineDefinition)
  });
  // Assertion
  expect(buildStateMachineResponse.stateMachine).toBeDefined();
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: "s3:copyObject",
          Effect: "Allow",
          Resource: [
            {},  // Placeholders for source and destination buckets with stack ID specific names
            {}
          ],
        },
        {
          Action: [
            "logs:CreateLogDelivery",
            "logs:GetLogDelivery",
            "logs:UpdateLogDelivery",
            "logs:DeleteLogDelivery",
            "logs:ListLogDeliveries",
            "logs:PutResourcePolicy",
            "logs:DescribeResourcePolicies",
            "logs:DescribeLogGroups"
          ],
          Effect: "Allow",
          Resource: "*"
        },
      ],
      Version: "2012-10-17"
    }
  });
});

test('Count State Machine CW Alarms', () => {
  // Stack
  const stack = new Stack();
  // State Machine definition
  const startState = new sfn.Pass(stack, 'StartState');
  // Build state machine
  const buildStateMachineResponse = defaults.buildStateMachine(stack, defaults.idPlaceholder, {
    definition: startState
  });
  const cwList = defaults.buildStepFunctionCWAlarms(stack, buildStateMachineResponse.stateMachine);
  expect(buildStateMachineResponse.stateMachine).toBeDefined();

  expect(cwList.length).toEqual(3);
});

test('Test deployment with custom role', () => {
  const descriptionText = 'Custom role for State Machine';

  // Stack
  const stack = new Stack();
  // State Machine definition
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
  const buildStateMachineResponse = defaults.buildStateMachine(stack, defaults.idPlaceholder, {
    definition: startState,
    role: customRole
  });

  // Assertion
  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::IAM::Role", 1);
  expect(buildStateMachineResponse.stateMachine).toBeDefined();

  template.hasResourceProperties("AWS::IAM::Role", {
    Description: descriptionText
  });
});

test('Confirm format of name', () => {
  // Stack
  const stack = new Stack(undefined, 'teststack');
  // State Machine definition
  const startState = new sfn.Pass(stack, 'StartState');
  // Build state machine
  const buildStateMachineResponse = defaults.buildStateMachine(stack, defaults.idPlaceholder, {
    stateMachineName: 'myStateMachine',
    definition: startState,
  });
  // Assertion
  expect(buildStateMachineResponse.stateMachine).toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::StepFunctions::StateMachine", {
    StateMachineName: "myStateMachine"
  });

  // Perform some fancy stuff to examine the specifics of the LogGroupName
  const LogGroup = template.findResources("AWS::Logs::LogGroup");
  const logName = LogGroup.StateMachineLogGroup15B91BCB.Properties.LogGroupName;

  expect(logName['Fn::Join']).toBeDefined();
  expect(logName['Fn::Join'].length).toEqual(2);
  expect(logName['Fn::Join'][1][1]['Fn::Select'][1]['Fn::Split'][1].Ref).toEqual("AWS::StackId");
});

test('Confirm format of name with ID provided', () => {
  // Stack
  const stack = new Stack(undefined, 'teststack');
  // State Machine definition
  const startState = new sfn.Pass(stack, 'StartState');
  // Build state machine
  const buildStateMachineResponse = defaults.buildStateMachine(stack, 'zxz', {
    definition: startState,
  });
  // Assertion
  expect(buildStateMachineResponse.stateMachine).toBeDefined();

  const template = Template.fromStack(stack);
  defaults.printWarning(`*****************${JSON.stringify(template)}`);
  template.hasResourceProperties("AWS::StepFunctions::StateMachine", {});

  // Perform some fancy stuff to examine the specifics of the LogGroupName
  const LogGroup = template.findResources("AWS::Logs::LogGroup");
  const logName = LogGroup.StateMachineLogGroupzxz98C28BF8.Properties.LogGroupName;
  expect(logName['Fn::Join'][1][0].includes('zxz')).toBeTruthy();

  expect(logName['Fn::Join']).toBeDefined();
  expect(logName['Fn::Join'].length).toEqual(2);
  expect(logName['Fn::Join'][1][1]['Fn::Select'][1]['Fn::Split'][1].Ref).toEqual("AWS::StackId");
});

test('multiple state machines', () => {
  // Stack
  const stack = new Stack(undefined, 'teststack');
  // State Machine definition
  const startState = new sfn.Pass(stack, 'StartState');
  const startStateTwo = new sfn.Pass(stack, 'StartStateTwo');
  const startStateThree = new sfn.Pass(stack, 'StartStateThree');
  // Build state machine
  const buildStateMachineResponse = defaults.buildStateMachine(stack, 'one', {
    stateMachineName: 'myStateMachine',
    definition: startState,
  });
  const buildStateMachineResponseTwo = defaults.buildStateMachine(stack, 'two', {
    stateMachineName: 'myStateMachine',
    definition: startStateTwo,
  });
  const buildStateMachineResponseThree = defaults.buildStateMachine(stack, defaults.idPlaceholder, {
    stateMachineName: 'myStateMachine',
    definition: startStateThree,
  });
  // Assertion
  expect(buildStateMachineResponse.stateMachine).toBeDefined();
  expect(buildStateMachineResponseTwo.stateMachine).toBeDefined();
  expect(buildStateMachineResponseThree.stateMachine).toBeDefined();
});
