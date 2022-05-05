/**
 *  Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import '@aws-cdk/assert/jest';
import * as defaults from '@aws-solutions-constructs/core';
import * as cdk from "@aws-cdk/core";
import { FargateToStepfunctions } from "../lib";
import * as stepfunctions from '@aws-cdk/aws-stepfunctions';
import * as ecs from '@aws-cdk/aws-ecs';

const clusterName = "custom-cluster-name";
const containerName = "custom-container-name";
const serviceName = "custom-service-name";
const familyName = "family-name";
const testCidr = "172.0.0.0/16";
const newRole = "testconstructtaskdefTaskRoleC60414C4";
const newPolicy = "testconstructtaskdefTaskRoleDefaultPolicyF34A1535";
const testExistingCidr = "172.168.0.0/16";
const existingPolicy = "testtaskdefTaskRoleDefaultPolicy5D591D1C";
const existingRole = "testtaskdefTaskRoleB2DEF113";

test('Check for construct properties', () => {
  const stack = new cdk.Stack();

  const construct = new FargateToStepfunctions(stack, 'test-construct', {
    publicApi: true,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { cidr: testCidr },
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    stateMachineProps: testStateMachineProps(stack),
  });

  expect(construct.vpc).toBeDefined();
  expect(construct.service).toBeDefined();
  expect(construct.container).toBeDefined();
  expect(construct.stateMachine).toBeDefined();
  expect(construct.stateMachineLogGroup).toBeDefined();
  expect(construct.cloudwatchAlarms).toBeDefined();
});

test('New service, public API, new VPC', () => {
  const stack = new cdk.Stack();

  new FargateToStepfunctions(stack, 'test-construct', {
    publicApi: true,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { cidr: testCidr },
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    stateMachineProps: testStateMachineProps(stack),
  });

  checkForBaseResources(stack);
  expect(stack).toHaveResourceLike("AWS::IAM::Policy", startExecutionPolicy(newPolicy, newRole));
  expect(stack).toHaveResourceLike("AWS::EC2::VPC", vpcCidrTest(testCidr));

  checkForPublicPrivateVpc(stack);
});

test('New service, private API, new VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = false;

  new FargateToStepfunctions(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    vpcProps: { cidr: testCidr },
    stateMachineProps: testStateMachineProps(stack)
  });

  checkForBaseResources(stack);
  expect(stack).toHaveResourceLike("AWS::IAM::Policy", startExecutionPolicy(newPolicy, newRole));
  expect(stack).toHaveResourceLike("AWS::EC2::VPC", vpcCidrTest(testCidr));

  checkForIsolatedVpc(stack);
});

test('New service, private API, existing VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = false;

  const existingVpc = defaults.getTestVpc(stack, publicApi);

  new FargateToStepfunctions(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    existingVpc,
    stateMachineProps: testStateMachineProps(stack)
  });

  checkForBaseResources(stack);
  expect(stack).toHaveResourceLike("AWS::IAM::Policy", startExecutionPolicy(newPolicy, newRole));
  expect(stack).toHaveResourceLike("AWS::EC2::VPC", vpcCidrTest(testExistingCidr));

  checkForIsolatedVpc(stack);
});

test('Existing service, public API, existing VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = true;

  const existingVpc = defaults.getTestVpc(stack);

  const [testService, testContainer] = defaults.CreateFargateService(stack,
    'test',
    existingVpc,
    { clusterName },
    defaults.fakeEcrRepoArn,
    undefined,
    { family: familyName },
    { containerName },
    { serviceName });

  new FargateToStepfunctions(stack, 'test-construct', {
    publicApi,
    existingFargateServiceObject: testService,
    existingContainerDefinitionObject: testContainer,
    existingVpc,
    stateMachineProps: testStateMachineProps(stack)
  });

  checkForBaseResources(stack);
  expect(stack).toHaveResourceLike("AWS::IAM::Policy", startExecutionPolicy(existingPolicy, existingRole));
  expect(stack).toHaveResourceLike("AWS::EC2::VPC", vpcCidrTest(testExistingCidr));

  checkForPublicPrivateVpc(stack);
});

test('Existing service, private API, existing VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = false;

  const existingVpc = defaults.getTestVpc(stack, publicApi);

  const [testService, testContainer] = defaults.CreateFargateService(stack,
    'test',
    existingVpc,
    { clusterName },
    defaults.fakeEcrRepoArn,
    undefined,
    { family: familyName },
    { containerName },
    { serviceName });

  new FargateToStepfunctions(stack, 'test-construct', {
    publicApi,
    existingFargateServiceObject: testService,
    existingContainerDefinitionObject: testContainer,
    existingVpc,
    stateMachineProps: testStateMachineProps(stack)
  });

  checkForBaseResources(stack);
  expect(stack).toHaveResourceLike("AWS::IAM::Policy", startExecutionPolicy(existingPolicy, existingRole));
  expect(stack).toHaveResourceLike("AWS::EC2::VPC", vpcCidrTest(testExistingCidr));

  checkForIsolatedVpc(stack);
});

test('Check for custom ARN', () => {
  const stack = new cdk.Stack();
  const publicApi = true;
  const customEnvName = "TEST_CUSTOM_ARN";

  new FargateToStepfunctions(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { cidr: testCidr },
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    stateMachineProps: testStateMachineProps(stack),
    stateMachineEnvironmentVariableName: customEnvName
  });

  expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", {
    Family: familyName,
    ContainerDefinitions: [
      {
        Environment: [
          {
            Name: customEnvName,
            Value: {
              Ref: "testconstructStateMachine3333AAA9"
            }
          }
        ],
        Essential: true,
        Image: {
          "Fn::Join": [
            "",
            [
              "123456789012.dkr.ecr.us-east-1.",
              {
                Ref: "AWS::URLSuffix"
              },
              "/fake-repo:latest"
            ]
          ]
        },
        MemoryReservation: 512,
        Name: containerName,
        PortMappings: [
          {
            ContainerPort: 8080,
            Protocol: "tcp"
          }
        ]
      }
    ]
  });
});

test('Check for no cloudwatch creation', () => {
  const stack = new cdk.Stack();
  const publicApi = true;

  const construct = new FargateToStepfunctions(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { cidr: testCidr },
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    stateMachineProps: testStateMachineProps(stack),
    createCloudWatchAlarms: false
  });

  expect(construct.cloudwatchAlarms).not.toBeDefined();
  expect(stack).not.toHaveResource("AWS::CloudWatch::Alarm", cloudwatchTest());
});

test('Check for custom log group props', () => {
  const stack = new cdk.Stack();
  const publicApi = true;
  const logGroupName = "custom-log-group";

  new FargateToStepfunctions(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { cidr: testCidr },
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    stateMachineProps: testStateMachineProps(stack),
    logGroupProps: {
      logGroupName
    }
  });

  checkForBaseResources(stack);
  expect(stack).toHaveResourceLike("AWS::Logs::LogGroup", {
    LogGroupName: logGroupName
  });
});

function testStateMachineProps(stack: cdk.Stack, userProps?: stepfunctions.StateMachineProps):
  stepfunctions.StateMachineProps {
  const defaultTestProp = { definition: new stepfunctions.Pass(stack, 'StartState') };

  return defaults.consolidateProps(defaultTestProp, userProps);
}

function serviceTest() {
  return {
    ServiceName: serviceName,
    LaunchType: 'FARGATE',
    DesiredCount: 2,
    DeploymentConfiguration: {
      MaximumPercent: 150,
      MinimumHealthyPercent: 75
    },
    PlatformVersion: ecs.FargatePlatformVersion.LATEST,
  };
}

function startExecutionPolicy(policy: string, role: string) {
  return {
    PolicyDocument: {
      Statement: [
        {
          Action: "states:StartExecution",
          Effect: "Allow",
          Resource: {
            Ref: "testconstructStateMachine3333AAA9"
          }
        }
      ],
      Version: "2012-10-17"
    },
    PolicyName: policy,
    Roles: [
      {
        Ref: role
      }
    ]
  };
}

function clusterTest() {
  return {
    ClusterName: clusterName
  };
}

function taskDefinitionTest() {
  return {
    Family: familyName,
    ContainerDefinitions: [
      {
        Environment: [
          {
            Name: "STATE_MACHINE_ARN",
            Value: {
              Ref: "testconstructStateMachine3333AAA9"
            }
          }
        ],
        Essential: true,
        Image: {
          "Fn::Join": [
            "",
            [
              "123456789012.dkr.ecr.us-east-1.",
              {
                Ref: "AWS::URLSuffix"
              },
              "/fake-repo:latest"
            ]
          ]
        },
        MemoryReservation: 512,
        Name: containerName,
        PortMappings: [
          {
            ContainerPort: 8080,
            Protocol: "tcp"
          }
        ]
      }
    ]
  };
}

function vpcCidrTest(cidr: string) {
  return {
    CidrBlock: cidr
  };
}

function stepfunctionsEndpoint() {
  return {
    ServiceName: {
      "Fn::Join": [
        "",
        [
          "com.amazonaws.",
          {
            Ref: "AWS::Region"
          },
          ".states"
        ]
      ]
    }
  };
}

function stateMachineTest() {
  return {
    RoleArn: {
      "Fn::GetAtt": [
        "testconstructStateMachineRoleA396E5D3",
        "Arn"
      ]
    },
    DefinitionString: "{\"StartAt\":\"StartState\",\"States\":{\"StartState\":{\"Type\":\"Pass\",\"End\":true}}}",
    LoggingConfiguration: {
      Destinations: [
        {
          CloudWatchLogsLogGroup: {
            LogGroupArn: {
              "Fn::GetAtt": [
                "testconstructStateMachineLogGroup2EB4F48B",
                "Arn"
              ]
            }
          }
        }
      ],
      Level: "ERROR"
    }
  };
}

function cloudwatchTest() {
  return {
    ComparisonOperator: "GreaterThanOrEqualToThreshold",
    EvaluationPeriods: 1,
    AlarmDescription: "Alarm for the number of executions that aborted exceeded the threshold of 1. ",
    Dimensions: [
      {
        Name: "StateMachineArn",
        Value: {
          Ref: "testconstructStateMachine3333AAA9"
        }
      }
    ],
    MetricName: "ExecutionsAborted",
    Namespace: "AWS/States",
    Period: 300,
    Statistic: "Maximum",
    Threshold: 1
  };
}

function checkForPublicPrivateVpc(stack: cdk.Stack) {
  expect(stack).toHaveResourceLike('AWS::EC2::InternetGateway', {});
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::StepFunctions::StateMachine', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
}

function checkForIsolatedVpc(stack: cdk.Stack) {
  expect(stack).not.toHaveResourceLike('AWS::EC2::InternetGateway', {});
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::StepFunctions::StateMachine', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
}

function checkForBaseResources(stack: cdk.Stack) {
  expect(stack).toHaveResourceLike("AWS::ECS::Service", serviceTest());
  expect(stack).toHaveResourceLike("AWS::ECS::Cluster", clusterTest());
  expect(stack).toHaveResourceLike("AWS::StepFunctions::StateMachine", stateMachineTest());
  expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", taskDefinitionTest());
  expect(stack).toHaveResourceLike("AWS::EC2::VPCEndpoint", stepfunctionsEndpoint());
  expect(stack).toHaveResourceLike("AWS::CloudWatch::Alarm", cloudwatchTest());
}
