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
import { FargateToDynamoDB } from "../lib";
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ecs from 'aws-cdk-lib/aws-ecs';

test('New service/new table, public API, new VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = true;
  const clusterName = "custom-cluster-name";
  const containerName = "custom-container-name";
  const serviceName = "custom-service-name";
  const tableName = "custom-table-name";
  const familyName = "family-name";

  const construct = new FargateToDynamoDB(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { cidr: '172.0.0.0/16' },
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    dynamoTableProps: {
      tableName,
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING
      },
    },
    tablePermissions: 'ReadWrite'
  });

  expect(construct.vpc !== null);
  expect(construct.service !== null);
  expect(construct.container !== null);
  expect(construct.dynamoTable !== null);
  expect(construct.dynamoTableInterface !== null);

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

  expect(stack).toHaveResourceLike("AWS::ECS::Cluster", {
    ClusterName: clusterName
  });

  expect(stack).toHaveResourceLike("AWS::DynamoDB::Table", {
    TableName: tableName
  });

  expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "dynamodb:BatchGetItem",
            "dynamodb:GetRecords",
            "dynamodb:GetShardIterator",
            "dynamodb:Query",
            "dynamodb:GetItem",
            "dynamodb:Scan",
            "dynamodb:ConditionCheckItem",
            "dynamodb:BatchWriteItem",
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem",
            "dynamodb:DescribeTable"
          ],
          Effect: "Allow",
          Resource: [
            {
              "Fn::GetAtt": [
                "testconstructDynamoTable67BDAFC5",
                "Arn"
              ]
            },
            {
              Ref: "AWS::NoValue"
            }
          ]
        }
      ]
    }
  });

  expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", {
    Family: familyName,
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

  expect(stack).toHaveResource("AWS::EC2::VPCEndpoint", {
    ServiceName: {
      "Fn::Join": [
        "",
        [
          "com.amazonaws.",
          {
            Ref: "AWS::Region"
          },
          ".dynamodb"
        ]
      ]
    },
  });

  // Confirm we created a Public/Private VPC
  expect(stack).toHaveResourceLike('AWS::EC2::InternetGateway', {});
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::DynamoDB::Table', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
});

test('New service/new table, private API, new VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = false;
  const tableName = 'table-name';

  new FargateToDynamoDB(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { cidr: '172.0.0.0/16' },
    dynamoTableProps: {
      tableName,
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING
      },
    },
    tablePermissions: 'Read',
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

  expect(stack).toHaveResourceLike("AWS::DynamoDB::Table", {
    TableName: tableName,
  });

  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: '172.0.0.0/16'
  });

  expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "dynamodb:BatchGetItem",
            "dynamodb:GetRecords",
            "dynamodb:GetShardIterator",
            "dynamodb:Query",
            "dynamodb:GetItem",
            "dynamodb:Scan",
            "dynamodb:ConditionCheckItem",
            "dynamodb:DescribeTable"
          ],
          Effect: "Allow",
          Resource: [
            {
              "Fn::GetAtt": [
                "testconstructDynamoTable67BDAFC5",
                "Arn"
              ]
            },
            {
              Ref: "AWS::NoValue"
            }
          ]
        }
      ]
    }
  });

  expect(stack).toHaveResource("AWS::EC2::VPCEndpoint", {
    ServiceName: {
      "Fn::Join": [
        "",
        [
          "com.amazonaws.",
          {
            Ref: "AWS::Region"
          },
          ".dynamodb"
        ]
      ]
    },
  });

  // Confirm we created an Isolated VPC
  expect(stack).not.toHaveResourceLike('AWS::EC2::InternetGateway', {});
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::DynamoDB::Table', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
});

test('New service/existing table, private API, existing VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = false;
  const tableName = 'custom-table-name';

  const existingVpc = defaults.getTestVpc(stack, publicApi);

  const existingTable = new dynamodb.Table(stack, 'MyTable', {
    tableName,
    partitionKey: {
      name: 'id',
      type: dynamodb.AttributeType.STRING
    },
  });

  const construct = new FargateToDynamoDB(stack, 'test-construct', {
    publicApi,
    existingVpc,
    existingTableInterface: existingTable,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    tablePermissions: 'ALL'
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

  expect(stack).toHaveResourceLike("AWS::DynamoDB::Table", {
    TableName: tableName
  });
  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });

  expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: "dynamodb:*",
          Effect: "Allow",
          Resource: [
            {
              "Fn::GetAtt": [
                "MyTable794EDED1",
                "Arn"
              ]
            },
            {
              Ref: "AWS::NoValue"
            }
          ]
        }
      ]
    }
  });

  expect(stack).toHaveResource("AWS::EC2::VPCEndpoint", {
    ServiceName: {
      "Fn::Join": [
        "",
        [
          "com.amazonaws.",
          {
            Ref: "AWS::Region"
          },
          ".dynamodb"
        ]
      ]
    },
  });

  expect(construct.dynamoTable == null);

  // Confirm we created an Isolated VPC
  expect(stack).not.toHaveResourceLike('AWS::EC2::InternetGateway', {});
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
  expect(stack).toCountResources('AWS::DynamoDB::Table', 1);
});

test('Existing service/new table, public API, existing VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = true;
  const serviceName = 'custom-name';
  const customName = 'CUSTOM_NAME';
  const customArn = 'CUSTOM_ARN';
  const tableName = 'table-name';

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

  const construct = new FargateToDynamoDB(stack, 'test-construct', {
    publicApi,
    existingFargateServiceObject: testService,
    existingContainerDefinitionObject: testContainer,
    existingVpc,
    tableArnEnvironmentVariableName: customArn,
    tableEnvironmentVariableName: customName,
    dynamoTableProps: {
      tableName,
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING
      }
    }
  });

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    ServiceName: serviceName
  });

  expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      {
        Environment: [
          {
            Name: customArn,
            Value: {
              "Fn::GetAtt": [
                "testconstructDynamoTable67BDAFC5",
                "Arn"
              ]
            }
          },
          {
            Name: customName,
            Value: {
              Ref: "testconstructDynamoTable67BDAFC5"
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

  expect(stack).toHaveResourceLike("AWS::DynamoDB::Table", {
    TableName: tableName
  });

  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });

  expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "dynamodb:BatchGetItem",
            "dynamodb:GetRecords",
            "dynamodb:GetShardIterator",
            "dynamodb:Query",
            "dynamodb:GetItem",
            "dynamodb:Scan",
            "dynamodb:ConditionCheckItem",
            "dynamodb:BatchWriteItem",
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem",
            "dynamodb:DescribeTable"
          ],
          Effect: "Allow",
          Resource: [
            {
              "Fn::GetAtt": [
                "testconstructDynamoTable67BDAFC5",
                "Arn"
              ]
            },
            {
              Ref: "AWS::NoValue"
            }
          ]
        }
      ]
    }
  });

  expect(stack).toHaveResource("AWS::EC2::VPCEndpoint", {
    ServiceName: {
      "Fn::Join": [
        "",
        [
          "com.amazonaws.",
          {
            Ref: "AWS::Region"
          },
          ".dynamodb"
        ]
      ]
    },
  });

  expect(construct.dynamoTable == null);

  // Confirm we created a Public/Private VPC
  expect(stack).toHaveResourceLike('AWS::EC2::InternetGateway', {});
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
  expect(stack).toCountResources('AWS::DynamoDB::Table', 1);
});

test('Existing service/existing table, private API, existing VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = false;
  const serviceName = 'custom-name';
  const tableName = 'custom-table-name';

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

  const existingTable = new dynamodb.Table(stack, 'MyTablet', {
    tableName,
    partitionKey: {
      name: 'id',
      type: dynamodb.AttributeType.STRING
    }
  });

  const construct = new FargateToDynamoDB(stack, 'test-construct', {
    publicApi,
    existingFargateServiceObject: testService,
    existingContainerDefinitionObject: testContainer,
    existingVpc,
    tablePermissions: 'Write',
    existingTableInterface: existingTable
  });

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    ServiceName: serviceName,
  });

  expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      {
        Environment: [
          {
            Name: "DYNAMODB_TABLE_ARN",
            Value: {
              "Fn::GetAtt": [
                "MyTabletD7ADAF4F",
                "Arn"
              ]
            }
          },
          {
            Name: "DYNAMODB_TABLE_NAME",
            Value: {
              Ref: "MyTabletD7ADAF4F"
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

  expect(stack).toHaveResourceLike("AWS::DynamoDB::Table", {
    TableName: tableName
  });
  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });

  expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "dynamodb:BatchWriteItem",
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem",
            "dynamodb:DescribeTable"
          ],
          Effect: "Allow",
          Resource: [
            {
              "Fn::GetAtt": [
                "MyTabletD7ADAF4F",
                "Arn"
              ]
            },
            {
              Ref: "AWS::NoValue"
            }
          ]
        }
      ]
    }
  });

  expect(stack).toHaveResource("AWS::EC2::VPCEndpoint", {
    ServiceName: {
      "Fn::Join": [
        "",
        [
          "com.amazonaws.",
          {
            Ref: "AWS::Region"
          },
          ".dynamodb"
        ]
      ]
    },
  });

  expect(construct.dynamoTable == null);

  // Confirm we created an Isolated VPC
  expect(stack).not.toHaveResourceLike('AWS::EC2::InternetGateway', {});
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
  expect(stack).toCountResources('AWS::DynamoDB::Table', 1);
});

test('test error invalid table permission', () => {
  const stack = new cdk.Stack();
  const publicApi = false;
  const serviceName = 'custom-name';
  const tableName = 'custom-table-name';

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

  const existingTable = new dynamodb.Table(stack, 'MyTablet', {
    tableName,
    partitionKey: {
      name: 'id',
      type: dynamodb.AttributeType.STRING
    }
  });

  const app = () => {
    new FargateToDynamoDB(stack, 'test-construct', {
      publicApi,
      existingFargateServiceObject: testService,
      existingContainerDefinitionObject: testContainer,
      existingVpc,
      tablePermissions: 'reed',
      existingTableInterface: existingTable
    });
  };

  expect(app).toThrowError('Invalid tablePermission submitted - REED');
});