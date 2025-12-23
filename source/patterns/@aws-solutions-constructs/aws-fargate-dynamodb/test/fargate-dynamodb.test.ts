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

import { Template } from 'aws-cdk-lib/assertions';
import * as defaults from '@aws-solutions-constructs/core';
import * as cdk from "aws-cdk-lib";
import { FargateToDynamoDB, FargateToDynamoDBProps } from "../lib";
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

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
    vpcProps: { ipAddresses: ec2.IpAddresses.cidr('172.0.0.0/16') },
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

  expect(construct.vpc).toBeDefined();
  expect(construct.service).toBeDefined();
  expect(construct.container).toBeDefined();
  expect(construct.dynamoTable).toBeDefined();
  expect(construct.dynamoTableInterface).toBeDefined();

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

  template.hasResourceProperties("AWS::ECS::Cluster", {
    ClusterName: clusterName
  });

  template.hasResourceProperties("AWS::DynamoDB::Table", {
    TableName: tableName
  });

  template.hasResourceProperties("AWS::IAM::Policy", {
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
          Resource: {
            "Fn::GetAtt": [
              "testconstructDynamoTable67BDAFC5",
              "Arn"
            ]
          },
        }
      ]
    }
  });

  template.hasResourceProperties("AWS::ECS::TaskDefinition", {
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

  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: '172.0.0.0/16'
  });

  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
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
  template.hasResourceProperties('AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::DynamoDB::Table', 1);
  template.resourceCountIs('AWS::ECS::Service', 1);
});

test('New service/new table, private API, new VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = false;
  const tableName = 'table-name';

  new FargateToDynamoDB(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { ipAddresses: ec2.IpAddresses.cidr('172.0.0.0/16') },
    dynamoTableProps: {
      tableName,
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING
      },
    },
    tablePermissions: 'Read',
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ECS::Service", {
    LaunchType: 'FARGATE',
    DesiredCount: 2,
    DeploymentConfiguration: {
      MaximumPercent: 150,
      MinimumHealthyPercent: 75
    },
    PlatformVersion: ecs.FargatePlatformVersion.LATEST,
  });

  template.hasResourceProperties("AWS::DynamoDB::Table", {
    TableName: tableName,
  });

  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: '172.0.0.0/16'
  });

  template.hasResourceProperties("AWS::IAM::Policy", {
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
          Resource: {
            "Fn::GetAtt": [
              "testconstructDynamoTable67BDAFC5",
              "Arn"
            ]
          },
        }
      ]
    }
  });

  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
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
  defaults.expectNonexistence(stack, 'AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::DynamoDB::Table', 1);
  template.resourceCountIs('AWS::ECS::Service', 1);
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

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ECS::Service", {
    LaunchType: 'FARGATE',
    DesiredCount: 2,
    DeploymentConfiguration: {
      MaximumPercent: 150,
      MinimumHealthyPercent: 75
    },
    PlatformVersion: ecs.FargatePlatformVersion.LATEST,
  });

  template.hasResourceProperties("AWS::DynamoDB::Table", {
    TableName: tableName
  });
  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });

  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: "dynamodb:*",
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "MyTable794EDED1",
              "Arn"
            ]
          }
        }
      ]
    }
  });

  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
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

  expect(construct.dynamoTable === null);

  // Confirm we created an Isolated VPC
  defaults.expectNonexistence(stack, 'AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::ECS::Service', 1);
  template.resourceCountIs('AWS::DynamoDB::Table', 1);
});

test('Existing service/new table, public API, existing VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = true;
  const serviceName = 'custom-name';
  const customName = 'CUSTOM_NAME';
  const customArn = 'CUSTOM_ARN';
  const tableName = 'table-name';

  const existingVpc = defaults.getTestVpc(stack);

  const createFargateServiceResponse = defaults.CreateFargateService(stack, 'test', {
    constructVpc: existingVpc,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clientFargateServiceProps: {
      serviceName
    }
  });

  const construct = new FargateToDynamoDB(stack, 'test-construct', {
    publicApi,
    existingFargateServiceObject: createFargateServiceResponse.service,
    existingContainerDefinitionObject: createFargateServiceResponse.containerDefinition,
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

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ECS::Service", {
    ServiceName: serviceName
  });

  template.hasResourceProperties("AWS::ECS::TaskDefinition", {
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

  template.hasResourceProperties("AWS::DynamoDB::Table", {
    TableName: tableName
  });

  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });

  template.hasResourceProperties("AWS::IAM::Policy", {
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
          Resource: {
            "Fn::GetAtt": [
              "testconstructDynamoTable67BDAFC5",
              "Arn"
            ]
          },
        }
      ]
    }
  });

  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
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

  expect(construct.dynamoTable === null);

  // Confirm we created a Public/Private VPC
  template.hasResourceProperties('AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::ECS::Service', 1);
  template.resourceCountIs('AWS::DynamoDB::Table', 1);
});

test('Existing service/existing table, private API, existing VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = false;
  const serviceName = 'custom-name';
  const tableName = 'custom-table-name';

  const existingVpc = defaults.getTestVpc(stack, publicApi);

  const createFargateServiceResponse = defaults.CreateFargateService(stack, 'test', {
    constructVpc: existingVpc,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clientFargateServiceProps: {
      serviceName
    }
  });

  const existingTable = new dynamodb.Table(stack, 'MyTablet', {
    tableName,
    partitionKey: {
      name: 'id',
      type: dynamodb.AttributeType.STRING
    }
  });

  const construct = new FargateToDynamoDB(stack, 'test-construct', {
    publicApi,
    existingFargateServiceObject: createFargateServiceResponse.service,
    existingContainerDefinitionObject: createFargateServiceResponse.containerDefinition,
    existingVpc,
    tablePermissions: 'Write',
    existingTableInterface: existingTable
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ECS::Service", {
    ServiceName: serviceName,
  });

  template.hasResourceProperties("AWS::ECS::TaskDefinition", {
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

  template.hasResourceProperties("AWS::DynamoDB::Table", {
    TableName: tableName
  });
  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });

  template.hasResourceProperties("AWS::IAM::Policy", {
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
          Resource: {
            "Fn::GetAtt": [
              "MyTabletD7ADAF4F",
              "Arn"
            ]
          },
        }
      ]
    }
  });

  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
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

  expect(construct.dynamoTable === null);

  // Confirm we created an Isolated VPC
  defaults.expectNonexistence(stack, 'AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::ECS::Service', 1);
  template.resourceCountIs('AWS::DynamoDB::Table', 1);
});

test('test error invalid table permission', () => {
  const stack = new cdk.Stack();
  const publicApi = false;
  const serviceName = 'custom-name';
  const tableName = 'custom-table-name';

  const existingVpc = defaults.getTestVpc(stack, publicApi);

  const createFargateServiceResponse = defaults.CreateFargateService(stack, 'test', {
    constructVpc: existingVpc,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clientFargateServiceProps: {
      serviceName
    }
  });

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
      existingFargateServiceObject: createFargateServiceResponse.service,
      existingContainerDefinitionObject: createFargateServiceResponse.containerDefinition,
      existingVpc,
      tablePermissions: 'reed',
      existingTableInterface: existingTable
    });
  };

  expect(app).toThrowError('Invalid tablePermission submitted - REED');
});

test('test that DDB input args are getting checked', () => {
  const stack = new cdk.Stack();
  const publicApi = false;
  const serviceName = 'custom-name';
  const tableName = 'custom-table-name';

  const existingVpc = defaults.getTestVpc(stack, publicApi);

  const createFargateServiceResponse = defaults.CreateFargateService(stack, 'test', {
    constructVpc: existingVpc,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clientFargateServiceProps: {
      serviceName
    }
  });

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
      existingFargateServiceObject: createFargateServiceResponse.service,
      existingContainerDefinitionObject: createFargateServiceResponse.containerDefinition,
      existingVpc,
      existingTableInterface: existingTable,
      dynamoTableProps: {
        tableName,
        partitionKey: {
          name: 'id',
          type: dynamodb.AttributeType.STRING
        },
      },
    });
  };

  expect(app).toThrowError('Error - Either provide existingTableInterface or dynamoTableProps, but not both.\n');
});

test('Confirm that CheckVpcProps was called', () => {
  const stack = new cdk.Stack();
  const publicApi = true;
  const clusterName = "custom-cluster-name";
  const containerName = "custom-container-name";
  const serviceName = "custom-service-name";
  const familyName = "custom-family-name";

  const props: FargateToDynamoDBProps = {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    dynamoTableProps: {
      tableName: 'fake-name',
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING
      },
    },
    existingVpc: defaults.getTestVpc(stack),
    vpcProps: {},
  };

  const app = () => {
    new FargateToDynamoDB(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide an existingVpc or some combination of deployVpc and vpcProps, but not both.\n');
});
