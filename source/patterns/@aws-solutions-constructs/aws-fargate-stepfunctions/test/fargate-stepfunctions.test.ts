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

import * as defaults from '@aws-solutions-constructs/core';
import * as cdk from "aws-cdk-lib";
import { FargateToStepfunctions, FargateToStepfunctionsProps } from "../lib";
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template } from 'aws-cdk-lib/assertions';

const clusterName = "custom-cluster-name";
const containerName = "custom-container-name";
const serviceName = "custom-service-name";
const familyName = "family-name";
const testCidr = "172.0.0.0/16";

test('Check for construct properties', () => {
  const stack = new cdk.Stack();
  const publicApi = true;

  const construct = createFargateConstructWithNewResources(stack, publicApi);

  expect(construct.vpc).toBeDefined();
  expect(construct.service).toBeDefined();
  expect(construct.container).toBeDefined();
  expect(construct.stateMachine).toBeDefined();
  expect(construct.stateMachineLogGroup).toBeDefined();
  expect(construct.cloudwatchAlarms).toBeDefined();
});

test('Check for new service', () => {
  const stack = new cdk.Stack();
  const publicApi = false;

  createFargateConstructWithNewResources(stack, publicApi);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ECS::Service", {
    ServiceName: serviceName,
    LaunchType: 'FARGATE',
    DesiredCount: 2,
    DeploymentConfiguration: {
      MaximumPercent: 150,
      MinimumHealthyPercent: 75
    },
    PlatformVersion: ecs.FargatePlatformVersion.LATEST,
  });
});

test('Check for an existing service', () => {
  const stack = new cdk.Stack();
  const publicApi = true;

  const existingVpc = defaults.getTestVpc(stack);

  const createFargateServiceResponse = defaults.CreateFargateService(stack, 'test', {
    constructVpc: existingVpc,
    clientClusterProps: {
      clusterName
    },
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clientFargateTaskDefinitionProps: {
      family: familyName
    },
    clientContainerDefinitionProps: {
      containerName
    },
    clientFargateServiceProps: {
      serviceName
    }
  });

  new FargateToStepfunctions(stack, 'test-construct', {
    publicApi,
    existingFargateServiceObject: createFargateServiceResponse.service,
    existingContainerDefinitionObject: createFargateServiceResponse.containerDefinition,
    existingVpc,
    stateMachineProps: testStateMachineProps(stack)
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ECS::Service", {
    ServiceName: serviceName,
    LaunchType: 'FARGATE',
    DesiredCount: 2,
    DeploymentConfiguration: {
      MaximumPercent: 150,
      MinimumHealthyPercent: 75
    },
    PlatformVersion: ecs.FargatePlatformVersion.LATEST,
  });
});

test('Check for IAM startExecution policy', () => {
  const stack = new cdk.Stack();
  const publicApi = false;

  createFargateConstructWithNewResources(stack, publicApi);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::IAM::Policy", {
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
    PolicyName: "testconstructtaskdefTaskRoleDefaultPolicyF34A1535",
    Roles: [
      {
        Ref: "testconstructtaskdefTaskRoleC60414C4"
      }
    ]
  });
});

test('Check for public/private VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = true;

  createFargateConstructWithNewResources(stack, publicApi);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: testCidr
  });

  template.hasResourceProperties('AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::StepFunctions::StateMachine', 1);
  template.resourceCountIs('AWS::ECS::Service', 1);
});

test('Check for isolated VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = false;

  createFargateConstructWithNewResources(stack, publicApi);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: testCidr
  });

  defaults.expectNonexistence(stack, 'AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::StepFunctions::StateMachine', 1);
  template.resourceCountIs('AWS::ECS::Service', 1);
});

test('Check for an existing VPC', () => {
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

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: "172.168.0.0/16"
  });

  template.resourceCountIs("AWS::EC2::VPC", 1);
});

test('Check for custom ARN resource', () => {
  const stack = new cdk.Stack();
  const publicApi = true;
  const customEnvName = "TEST_CUSTOM_ARN";

  new FargateToStepfunctions(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { ipAddresses: ec2.IpAddresses.cidr(testCidr) },
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    stateMachineProps: testStateMachineProps(stack),
    stateMachineEnvironmentVariableName: customEnvName
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ECS::TaskDefinition", {
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
    vpcProps: { ipAddresses: ec2.IpAddresses.cidr(testCidr) },
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    stateMachineProps: testStateMachineProps(stack),
    createCloudWatchAlarms: false
  });

  expect(construct.cloudwatchAlarms).not.toBeDefined();

  defaults.expectNonexistence(stack, "AWS::CloudWatch::Alarm", {
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
  });
});

test('Check for custom log group props', () => {
  const stack = new cdk.Stack();
  const publicApi = true;
  const logGroupName = "custom-log-group";

  new FargateToStepfunctions(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { ipAddresses: ec2.IpAddresses.cidr(testCidr) },
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    stateMachineProps: testStateMachineProps(stack),
    logGroupProps: {
      logGroupName
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Logs::LogGroup", {
    LogGroupName: logGroupName
  });
});

test('Confirm that CheckVpcProps was called', () => {
  const stack = new cdk.Stack();
  const publicApi = true;

  const props: FargateToStepfunctionsProps = {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    stateMachineProps: testStateMachineProps(stack),
    existingVpc: defaults.getTestVpc(stack),
    vpcProps: { ipAddresses: ec2.IpAddresses.cidr(testCidr) },
  };

  const app = () => {
    new FargateToStepfunctions(stack, 'test-construct', props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide an existingVpc or some combination of deployVpc and vpcProps, but not both.\n');
});

function createFargateConstructWithNewResources(stack: cdk.Stack, publicApi: boolean) {
  return new FargateToStepfunctions(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { ipAddresses: ec2.IpAddresses.cidr(testCidr) },
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    stateMachineProps: testStateMachineProps(stack),
  });
}

function testStateMachineProps(stack: cdk.Stack, userProps?: stepfunctions.StateMachineProps):
  stepfunctions.StateMachineProps {
  const defaultTestProp = {
    definitionBody: defaults.CreateTestStateMachineDefinitionBody(stack, 'farstp-test')
  };

  return defaults.consolidateProps(defaultTestProp, userProps);
}
