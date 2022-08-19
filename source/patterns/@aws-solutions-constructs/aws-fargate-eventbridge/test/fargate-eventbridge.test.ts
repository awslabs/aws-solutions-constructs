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
import * as cdk from "aws-cdk-lib";
import { FargateToEventbridge } from "../lib";
import * as events from 'aws-cdk-lib/aws-events';
import * as ecs from 'aws-cdk-lib/aws-ecs';

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
  expect(construct.eventBus).toBeDefined();
});

test('Check for new service', () => {
  const stack = new cdk.Stack();
  const publicApi = false;

  createFargateConstructWithNewResources(stack, publicApi);

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    ServiceName: serviceName,
    LaunchType: 'FARGATE',
    DesiredCount: 2,
    DeploymentConfiguration: {
      MaximumPercent: 150,
      MinimumHealthyPercent: 75
    },
    PlatformVersion: ecs.FargatePlatformVersion.LATEST,
  });

  expect(stack).toHaveResourceLike("AWS::EC2::VPCEndpoint", {
    ServiceName: {
      "Fn::Join": [
        "",
        [
          "com.amazonaws.",
          {
            Ref: "AWS::Region"
          },
          ".events"
        ]
      ]
    }
  });
});

test('Check for an existing service', () => {
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

  new FargateToEventbridge(stack, 'test-construct', {
    publicApi,
    existingFargateServiceObject: testService,
    existingContainerDefinitionObject: testContainer,
    existingVpc,
  });

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    ServiceName: serviceName,
    LaunchType: 'FARGATE',
    DesiredCount: 2,
    DeploymentConfiguration: {
      MaximumPercent: 150,
      MinimumHealthyPercent: 75
    },
    PlatformVersion: ecs.FargatePlatformVersion.LATEST,
  });

  expect(stack).toHaveResourceLike("AWS::EC2::VPCEndpoint", {
    ServiceName: {
      "Fn::Join": [
        "",
        [
          "com.amazonaws.",
          {
            Ref: "AWS::Region"
          },
          ".events"
        ]
      ]
    }
  });

  expect(stack).toCountResources("AWS::ECS::Service", 1);
});

test('Check for IAM put events policy for created bus', () => {
  const stack = new cdk.Stack();
  const publicApi = false;

  createFargateConstructWithNewResources(stack, publicApi);

  expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: "events:PutEvents",
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "testconstructcustomnameA27657F0",
              "Arn"
            ]
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

test('Check for IAM put events policy for default event bus', () => {
  const stack = new cdk.Stack();
  const publicApi = false;

  new FargateToEventbridge(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { cidr: testCidr },
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
  });

  expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: "events:PutEvents",
          Effect: "Allow",
          Resource: {
            "Fn::Join": [
              "",
              [
                "arn:",
                {
                  Ref: "AWS::Partition"
                },
                ":events:",
                {
                  Ref: "AWS::Region"
                },
                ":",
                {
                  Ref: "AWS::AccountId"
                },
                ":event-bus/default"
              ]
            ]
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

  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: testCidr
  });

  expect(stack).toHaveResourceLike('AWS::EC2::InternetGateway', {});
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::Events::EventBus', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
});

test('Check for isolated VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = false;

  createFargateConstructWithNewResources(stack, publicApi);

  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: testCidr
  });

  expect(stack).not.toHaveResourceLike('AWS::EC2::InternetGateway', {});
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::Events::EventBus', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
});

test('Check for an existing VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = false;

  const existingVpc = defaults.getTestVpc(stack, publicApi);

  new FargateToEventbridge(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    existingVpc,
  });

  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: "172.168.0.0/16"
  });

  expect(stack).toCountResources("AWS::EC2::VPC", 1);
});

test('Check for custom ARN resource', () => {
  const stack = new cdk.Stack();
  const publicApi = true;
  const customEnvName = "TEST_CUSTOM_ARN";

  new FargateToEventbridge(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { cidr: testCidr },
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    eventBusEnvironmentVariableName: customEnvName
  });

  expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", {
    Family: familyName,
    ContainerDefinitions: [
      {
        Environment: [
          {
            Name: customEnvName,
            Value: "default"
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

test('Check for an existing event bus', () => {
  const stack = new cdk.Stack();
  const publicApi = true;
  const customName = 'MyCustomEventBus';
  const existingEventBus = new events.EventBus(stack, 'bus', {
    eventBusName: customName
  });

  const construct = new FargateToEventbridge(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { cidr: testCidr },
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    existingEventBusInterface: existingEventBus
  });

  expect(construct.eventBus).toBeDefined();
  expect(stack).toHaveResource("AWS::Events::EventBus", {
    Name: customName
  });
});

test('Check for custom event bus props', () => {
  const stack = new cdk.Stack();
  const publicApi = true;
  const eventBusName = "custom-name";

  createFargateConstructWithNewResources(stack, publicApi);

  expect(stack).toHaveResourceLike("AWS::Events::EventBus", {
    Name: eventBusName
  });
});

function createFargateConstructWithNewResources(stack: cdk.Stack, publicApi: boolean) {
  return new FargateToEventbridge(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { cidr: testCidr },
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    eventBusProps: {
      eventBusName: 'custom-name'
    }
  });
}