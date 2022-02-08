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
import { FargateToS3 } from "../lib";
import * as s3 from '@aws-cdk/aws-s3';
import * as ecs from '@aws-cdk/aws-ecs';

test('New service/new bucket, public API, new VPC', () => {
  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });
  const publicApi = true;
  const clusterName = "custom-cluster-name";
  const containerName = "custom-container-name";
  const serviceName = "custom-service-name";
  const bucketName = "custom-bucket-name";

  new FargateToS3(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { cidr: '172.0.0.0/16' },
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: 'family-name' },
    fargateServiceProps: { serviceName },
    bucketProps: { bucketName },
    logS3AccessLogs: false,
    bucketPermissions: ['Delete', 'Put', 'Read', 'ReadWrite', 'Write']
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

  expect(stack).toHaveResourceLike("AWS::S3::Bucket", {
    BucketName: bucketName
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
  expect(stack).toCountResources('AWS::S3::Bucket', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
});

test('New service/new bucket, private API, new VPC', () => {

  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });
  const publicApi = false;

  new FargateToS3(stack, 'test-construct', {
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

  expect(stack).toHaveResourceLike("AWS::S3::Bucket", {
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [{
        ServerSideEncryptionByDefault: {
          SSEAlgorithm: "AES256"
        }
      }]
    }
  });

  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: '172.0.0.0/16'
  });
  // Confirm we created an Isolated VPC
  expect(stack).not.toHaveResourceLike('AWS::EC2::InternetGateway', {});
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::S3::Bucket', 2);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
});

test('New service/existing bucket, private API, existing VPC', () => {
  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });
  const publicApi = false;
  const bucketName = 'custom-bucket-name';

  const existingVpc = defaults.getTestVpc(stack, publicApi);

  const existingBucket = new s3.Bucket(stack, 'MyBucket', {
    bucketName
  });

  new FargateToS3(stack, 'test-construct', {
    publicApi,
    existingVpc,
    existingBucketObj: existingBucket,
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

  expect(stack).toHaveResourceLike("AWS::S3::Bucket", {
    BucketName: bucketName
  });
  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::S3::Bucket', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
});

test('Existing service/new bucket, public API, existing VPC', () => {
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

  new FargateToS3(stack, 'test-construct', {
    publicApi,
    existingFargateServiceObject: testService,
    existingContainerDefinitionObject: testContainer,
    existingVpc,
    bucketArnEnvironmentVariableName: 'CUSTOM_ARN',
    bucketEnvironmentVariableName: 'CUSTOM_NAME',
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
              "Fn::GetAtt": [
                "testconstructS3Bucket81E8552A",
                "Arn"
              ]
            }
          },
          {
            Name: 'CUSTOM_NAME',
            Value: {
              Ref: "testconstructS3Bucket81E8552A"
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
  expect(stack).toHaveResourceLike("AWS::S3::Bucket", {
  });
  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::S3::Bucket', 2);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
});

// Test existing service/existing bucket, private API, new VPC
test('Existing service/existing bucket, private API, existing VPC', () => {
  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });
  const publicApi = false;
  const serviceName = 'custom-name';
  const bucketName = 'custom-bucket-name';

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

  const existingBucket = new s3.Bucket(stack, 'MyBucket', {
    bucketName
  });

  new FargateToS3(stack, 'test-construct', {
    publicApi,
    existingFargateServiceObject: testService,
    existingContainerDefinitionObject: testContainer,
    existingVpc,
    existingBucketObj: existingBucket
  });

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    ServiceName: serviceName,
  });

  expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      {
        Environment: [
          {
            Name: "S3_BUCKET_ARN",
            Value: {
              "Fn::GetAtt": [
                "MyBucketF68F3FF0",
                "Arn"
              ]
            }
          },
          {
            Name: "S3_BUCKET_NAME",
            Value: {
              Ref: "MyBucketF68F3FF0"
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

  expect(stack).toHaveResourceLike("AWS::S3::Bucket", {
    BucketName: bucketName
  });
  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::S3::Bucket', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
});
