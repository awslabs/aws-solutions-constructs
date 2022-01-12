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
import { FargateToSns } from "../lib";
import * as sns from '@aws-cdk/aws-sns';
import * as ecs from '@aws-cdk/aws-ecs';

// TODO: Is deployVpc needed?

test('New service/new topic, public API, new VPC', () => {

  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });
  const publicApi = true;

  new FargateToSns(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { cidr: '172.0.0.0/16' }
  });

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    LaunchType: 'FARGATE',
    DesiredCount: 2,
    DeploymentConfiguration: {
      MaximumPercent: 150,
      MinimumHealthyPercent: 75
    },
    PlatformVersion: ecs.FargatePlatformVersion.LATEST,
  });

  expect(stack).toHaveResourceLike("AWS::SNS::Topic", {

  });

  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: '172.0.0.0/16'
  });
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::SNS::Topic', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
});

test('New service/new topic, private API, new VPC', () => {

  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });
  const publicApi = false;

  new FargateToSns(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { cidr: '172.0.0.0/16' }
  });

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    LaunchType: 'FARGATE',
    DesiredCount: 2,
    DeploymentConfiguration: {
      MaximumPercent: 150,
      MinimumHealthyPercent: 75
    },
    PlatformVersion: ecs.FargatePlatformVersion.LATEST,
  });

  expect(stack).toHaveResourceLike("AWS::SNS::Topic", {

  });

  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: '172.0.0.0/16'
  });
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::SNS::Topic', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
});

test('New service/existing topic, private API, existing VPC', () => {
  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });
  const publicApi = false;
  const topicName = 'custom-topic-name';

  const existingVpc = defaults.getTestVpc(stack, publicApi);

  const existingTopic = new sns.Topic(stack, 'MyTopic', {
    topicName
  });

  new FargateToSns(stack, 'test-construct', {
    publicApi,
    existingVpc,
    existingTopicObject: existingTopic,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
  });

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    LaunchType: 'FARGATE',
    DesiredCount: 2,
    DeploymentConfiguration: {
      MaximumPercent: 150,
      MinimumHealthyPercent: 75
    },
    PlatformVersion: ecs.FargatePlatformVersion.LATEST,
  });

  expect(stack).toHaveResourceLike("AWS::SNS::Topic", {
    TopicName: topicName
  });
  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::SNS::Topic', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
});

test('Existing service/new topic, public API, existing VPC', () => {
  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });
  const publicApi = true;
  const serviceName = 'custom-name';

  const existingVpc = defaults.getTestVpc(stack);

  const [testService, testContainer] = defaults.CreateFargateService(stack,
    'test',
    existingVpc,
    undefined,
    defaults.fakeEcrRepoArn,
    undefined,
    undefined,
    undefined,
    { serviceName });

  new FargateToSns(stack, 'test-construct', {
    publicApi,
    existingFargateServiceObject: testService,
    existingContainerDefinitionObject: testContainer,
    existingVpc,
    topicArnEnvironmentVariableName: 'CUSTOM_ARN',
    topicNameEnvironmentVariableName: 'CUSTOM_NAME',
  });

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    ServiceName: serviceName
  });

  expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      {
        Environment: [
          {
            Name: 'CUSTOM_ARN',
            Value: {
              Ref: "testconstructSnsTopic44188529"
            }
          },
          {
            Name: 'CUSTOM_NAME',
            Value: {
              "Fn::GetAtt": [
                "testconstructSnsTopic44188529",
                "TopicName"
              ]
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
        Name: "test-container",
        PortMappings: [
          {
            ContainerPort: 8080,
            Protocol: "tcp"
          }
        ]
      }
    ]
  });
  expect(stack).toHaveResourceLike("AWS::SNS::Topic", {
  });
  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::SNS::Topic', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
});

// Test existing service/existing topic, private API, new VPC
test('Existing service/existing topic, private API, existing VPC', () => {
  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });
  const publicApi = false;
  const serviceName = 'custom-name';
  const topicName = 'custom-topic-name';

  const existingVpc = defaults.getTestVpc(stack, publicApi);

  const [testService, testContainer] = defaults.CreateFargateService(stack,
    'test',
    existingVpc,
    undefined,
    defaults.fakeEcrRepoArn,
    undefined,
    undefined,
    undefined,
    { serviceName });

  const existingTopic = new sns.Topic(stack, 'MyTopic', {
    topicName
  });

  new FargateToSns(stack, 'test-construct', {
    publicApi,
    existingFargateServiceObject: testService,
    existingContainerDefinitionObject: testContainer,
    existingVpc,
    existingTopicObject: existingTopic
  });

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    ServiceName: serviceName,
  });

  expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      {
        Environment: [
          {
            Name: "SNS_TOPIC_ARN",
            Value: {
              Ref: "MyTopic86869434"
            }
          },
          {
            Name: "SNS_TOPIC_NAME",
            Value: {
              "Fn::GetAtt": [
                "MyTopic86869434",
                "TopicName"
              ]
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
        Name: "test-container",
        PortMappings: [
          {
            ContainerPort: 8080,
            Protocol: "tcp"
          }
        ]
      }
    ]
  });

  expect(stack).toHaveResourceLike("AWS::SNS::Topic", {
    TopicName: topicName
  });
  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::SNS::Topic', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
});

// Confirm environment variable is set correctly