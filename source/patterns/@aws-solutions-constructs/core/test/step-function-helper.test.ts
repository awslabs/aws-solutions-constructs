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
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sfnTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { buildLogGroup } from '../lib/cloudwatch-log-group-helper';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Template } from 'aws-cdk-lib/assertions';

test('Test deployment w/ custom properties', () => {
  // Stack
  const stack = new Stack();

  // Build state machine
  const buildStateMachineResponse = defaults.buildStateMachine(stack, defaults.idPlaceholder, {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'test'),
      stateMachineName: 'myStateMachine'
    }
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
  // Log group
  // const logGroup = new LogGroup(stack, 'myLogGroup', defaults.buildLogGroup(stack));
  const logGroup = buildLogGroup(stack, 'StateMachineLogGroup');

  // Build state machine
  const buildStateMachineResponse = defaults.buildStateMachine(stack, defaults.idPlaceholder, {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'test'),
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.FATAL
      }
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
  // Build state machine
  const buildStateMachineResponse = defaults.buildStateMachine(stack, defaults.idPlaceholder, {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'test')
    }
  });
  // Assertion
  expect(buildStateMachineResponse.stateMachine).toBeDefined();
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {}, // represents permission to invoke the test lambda function
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
    stateMachineProps: {
      definitionBody: startState
    }
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
    stateMachineProps: {
      definitionBody: sfn.DefinitionBody.fromChainable(stateMachineDefinition)
    }
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
  // Build state machine
  const buildStateMachineResponse = defaults.buildStateMachine(stack, defaults.idPlaceholder, {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'test')
    }
  });
  expect(buildStateMachineResponse.stateMachine).toBeDefined();

  expect(buildStateMachineResponse.cloudWatchAlarms!.length).toEqual(3);
});

test('Confirm CloudWatch Alarm Prefix is used', () => {
  const customPrefix = "SomeText";
  // Stack
  const stack = new Stack();
  // Build state machine
  const buildStateMachineResponse = defaults.buildStateMachine(stack, defaults.idPlaceholder, {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'test')
    },
    cloudWatchAlarmsPrefix: customPrefix
  });
  expect(buildStateMachineResponse.stateMachine).toBeDefined();

  expect(buildStateMachineResponse.cloudWatchAlarms!.length).toEqual(3);
  // expect() checks look for properties, not the resource ID, so we need to
  // exploit knowledge of the internals of template. This may be brittle,
  // take care in the future
  const template = Template.fromStack(stack);
  const keys = Object.keys((template as any).template.Resources);
  const regex = new RegExp(`${customPrefix}Execution`);
  const alarms = keys.filter(alarmName => regex.test(alarmName));
  expect(alarms.length).toEqual(3);
});

test('Skip creating CW alarms', () => {
  // Stack
  const stack = new Stack();
  // Build state machine
  const buildStateMachineResponse = defaults.buildStateMachine(stack, defaults.idPlaceholder, {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'test')
    },
    createCloudWatchAlarms: false
  });
  expect(buildStateMachineResponse.stateMachine).toBeDefined();

  expect(buildStateMachineResponse.cloudWatchAlarms).not.toBeDefined();
});

test('Test deployment with custom role', () => {
  const descriptionText = 'Custom role for State Machine';

  // Stack
  const stack = new Stack();

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
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'test'),
      role: customRole
    }
  });

  // Assertion
  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::IAM::Role", 2);
  expect(buildStateMachineResponse.stateMachine).toBeDefined();

  // Confirm the correct role is assigned to the State Machine
  const stateMachine = template.findResources("AWS::StepFunctions::StateMachine");
  const roleArn = stateMachine.StateMachine2E01A3A5.Properties.RoleArn;
  expect(roleArn["Fn::GetAtt"]).toBeDefined();
  expect(roleArn["Fn::GetAtt"][0]).toEqual('customrole2E09B301');
});

test('Confirm format of name', () => {
  // Stack
  const stack = new Stack(undefined, 'teststack');
  // Build state machine
  const buildStateMachineResponse = defaults.buildStateMachine(stack, defaults.idPlaceholder, {
    stateMachineProps: {
      stateMachineName: 'myStateMachine',
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'test'),
    }
  });
  // Assertion
  expect(buildStateMachineResponse.stateMachine).toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::StepFunctions::StateMachine", {
    StateMachineName: "myStateMachine"
  });

  // Perform some fancy stuff to examine the specifics of the LogGroupName
  const logGroup = template.findResources("AWS::Logs::LogGroup");
  const logName = logGroup.StateMachineLogGroup15B91BCB.Properties.LogGroupName;

  expect(logName['Fn::Join']).toBeDefined();
  expect(logName['Fn::Join'].length).toEqual(2);
  expect(logName['Fn::Join'][1][1]['Fn::Select'][1]['Fn::Split'][1].Ref).toEqual("AWS::StackId");
});

test('Confirm format of name with ID provided', () => {
  // Stack
  const stack = new Stack(undefined, 'teststack');
  // Build state machine
  const buildStateMachineResponse = defaults.buildStateMachine(stack, 'zxz', {
    stateMachineProps: {
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'test'),
    }
  });
  // Assertion
  expect(buildStateMachineResponse.stateMachine).toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::StepFunctions::StateMachine", {});

  // Perform some fancy stuff to examine the specifics of the LogGroupName
  const logGroup = template.findResources("AWS::Logs::LogGroup");
  const logName = logGroup.StateMachineLogGroupzxz98C28BF8.Properties.LogGroupName;
  expect(logName['Fn::Join'][1][0].includes('zxz')).toBeTruthy();

  expect(logName['Fn::Join']).toBeDefined();
  expect(logName['Fn::Join'].length).toEqual(2);
  expect(logName['Fn::Join'][1][1]['Fn::Select'][1]['Fn::Split'][1].Ref).toEqual("AWS::StackId");
});

test('multiple state machines', () => {
  // Stack
  const stack = new Stack(undefined, 'teststack');
  // Build state machine
  const buildStateMachineResponse = defaults.buildStateMachine(stack, 'one', {
    stateMachineProps: {
      stateMachineName: 'myStateMachineOne',
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'smOne'),
    },
    cloudWatchAlarmsPrefix: 'one'
  });
  const buildStateMachineResponseTwo = defaults.buildStateMachine(stack, 'two', {
    stateMachineProps: {
      stateMachineName: 'myStateMachineTwo',
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'smTwo'),
    },
    cloudWatchAlarmsPrefix: 'two'
  });
  const buildStateMachineResponseThree = defaults.buildStateMachine(stack, defaults.idPlaceholder, {
    stateMachineProps: {
      stateMachineName: 'myStateMachineThree',
      definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'smThree'),
    },
    cloudWatchAlarmsPrefix: 'three'
  });
  // Assertion
  expect(buildStateMachineResponse.stateMachine).toBeDefined();
  expect(buildStateMachineResponseTwo.stateMachine).toBeDefined();
  expect(buildStateMachineResponseThree.stateMachine).toBeDefined();
});

test('Confirm cloudWatchAlarmsPrefix requires createCloudWatchAlarms', () => {

  const app = () => {
    defaults.CheckStateMachineProps({
      createCloudWatchAlarms: false,
      cloudWatchAlarmsPrefix: 'prefix'
    });
  };
  // Assertion
  expect(app).toThrowError('Error - cloudWatchAlarmsPrefix is invalid when createCloudWatchAlarms is false\n');
});

test('Confirm existingStateMachine disables all other state machine props', () => {

  const app = () => {
    defaults.CheckStateMachineProps({
      existingStateMachineObj: { pretend: "I'm A State Machine :-)"} as unknown as sfn.StateMachine,
      cloudWatchAlarmsPrefix: 'prefix'
    });
  };
  // Assertion
  expect(app).toThrowError('ERROR - If existingStateMachine is provided, no other state machine props are allowed\n');

  const app2 = () => {
    defaults.CheckStateMachineProps({
      existingStateMachineObj: { pretend: "I'm A State Machine :-)"} as unknown as sfn.StateMachine,
      stateMachineProps: { pretend: "I'm State Machine Props :-)"} as unknown as sfn.StateMachineProps,
    });
  };
  // Assertion
  expect(app2).toThrowError('ERROR - If existingStateMachine is provided, no other state machine props are allowed\n');

  const app3 = () => {
    defaults.CheckStateMachineProps({
      existingStateMachineObj: { pretend: "I'm A State Machine :-)"} as unknown as sfn.StateMachine,
      createCloudWatchAlarms: false
    });
  };
  // Assertion
  expect(app3).toThrowError('ERROR - If existingStateMachine is provided, no other state machine props are allowed\n');

  const app4 = () => {
    defaults.CheckStateMachineProps({
      existingStateMachineObj: { pretend: "I'm A State Machine :-)"} as unknown as sfn.StateMachine,
      logGroupProps: { pretend: "I'm State Machine Props :-)"} as unknown as logs.LogGroupProps,
    });
  };
  // Assertion
  expect(app4).toThrowError('ERROR - If existingStateMachine is provided, no other state machine props are allowed\n');

});
