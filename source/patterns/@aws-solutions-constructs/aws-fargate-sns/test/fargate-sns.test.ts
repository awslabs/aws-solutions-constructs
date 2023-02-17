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

import '@aws-cdk/assert/jest';
import * as defaults from '@aws-solutions-constructs/core';
import * as cdk from "aws-cdk-lib";
import { FargateToSns } from "../lib";
import * as kms from 'aws-cdk-lib/aws-kms';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

test('New service/new topic, public API, new VPC', () => {

  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });
  const publicApi = true;
  const clusterName = "custom-cluster-name";
  const containerName = "custom-container-name";
  const serviceName = "custom-service-name";
  const topicName = "custom-topic-name";

  new FargateToSns(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { ipAddresses: ec2.IpAddresses.cidr('172.0.0.0/16') },
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: 'family-name' },
    fargateServiceProps: { serviceName },
    topicProps: { topicName },
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

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    ServiceName: serviceName
  });
  expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", {
    Family: 'family-name'
  });

  expect(stack).toHaveResourceLike("AWS::ECS::Cluster", {
    ClusterName: clusterName
  });

  expect(stack).toHaveResourceLike("AWS::SNS::Topic", {
    TopicName: topicName
  });

  expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      {
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

  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: '172.0.0.0/16'
  });
  // Confirm we created a Public/Private VPC
  expect(stack).toHaveResourceLike('AWS::EC2::InternetGateway', {});
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
    vpcProps: { ipAddresses: ec2.IpAddresses.cidr('172.0.0.0/16') }
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
  // Confirm we created an Isolated VPC
  expect(stack).not.toHaveResourceLike('AWS::EC2::InternetGateway', {});
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

  const createFargateServiceResponse = defaults.CreateFargateService(stack,
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
    existingFargateServiceObject: createFargateServiceResponse.service,
    existingContainerDefinitionObject: createFargateServiceResponse.containerDefinition,
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

  const createFargateServiceResponse = defaults.CreateFargateService(stack,
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
    existingFargateServiceObject: createFargateServiceResponse.service,
    existingContainerDefinitionObject: createFargateServiceResponse.containerDefinition,
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

test('Topic is encrypted with imported CMK when set on encryptionKey prop', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const cmk = new kms.Key(stack, 'cmk');
  new FargateToSns(stack, 'test-construct', {
    publicApi: true,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    encryptionKey: cmk
  });

  expect(stack).toHaveResource("AWS::SNS::Topic", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "cmk01DE03DA",
        "Arn"
      ]
    }
  });
});

test('Topic is encrypted with imported CMK when set on topicProps.masterKey prop', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const cmk = new kms.Key(stack, 'cmk');
  new FargateToSns(stack, 'test-construct', {
    publicApi: true,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    topicProps: {
      masterKey: cmk
    }
  });

  expect(stack).toHaveResource("AWS::SNS::Topic", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "cmk01DE03DA",
        "Arn"
      ]
    }
  });
});

test('Topic is encrypted with provided encrytionKeyProps', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  new FargateToSns(stack, 'test-construct', {
    publicApi: true,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    encryptionKeyProps: {
      alias: 'new-key-alias-from-props'
    }
  });

  expect(stack).toHaveResource('AWS::SNS::Topic', {
    KmsMasterKeyId: {
      'Fn::GetAtt': [
        'testconstructEncryptionKey6153B053',
        'Arn'
      ]
    },
  });

  expect(stack).toHaveResource('AWS::KMS::Alias', {
    AliasName: 'alias/new-key-alias-from-props',
    TargetKeyId: {
      'Fn::GetAtt': [
        'testconstructEncryptionKey6153B053',
        'Arn'
      ]
    }
  });
});

test('Topic is encrypted by default with AWS-managed KMS key when no other encryption properties are set', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  new FargateToSns(stack, 'test-construct', {
    publicApi: true,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
  });

  expect(stack).toHaveResource('AWS::SNS::Topic', {
    KmsMasterKeyId: {
      'Fn::Join': [
        "",
        [
          "arn:",
          {
            Ref: "AWS::Partition"
          },
          ":kms:us-east-1:123456789012:alias/aws/sns"
        ]
      ]
    },
  });
});

test('Topic is encrypted with customer managed KMS Key when enable encryption flag is true', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  new FargateToSns(stack, 'test-construct', {
    publicApi: true,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    enableEncryptionWithCustomerManagedKey: true
  });

  expect(stack).toHaveResource('AWS::SNS::Topic', {
    KmsMasterKeyId: {
      'Fn::GetAtt': [
        'testconstructEncryptionKey6153B053',
        'Arn'
      ]
    },
  });
});