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
import { FargateToS3 } from "../lib";
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

test('New service/new bucket, public API, new VPC', () => {
  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack();
  const publicApi = true;
  const clusterName = "custom-cluster-name";
  const containerName = "custom-container-name";
  const serviceName = "custom-service-name";
  const bucketName = "custom-bucket-name";
  const familyName = "family-name";

  const construct = new FargateToS3(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { ipAddresses: ec2.IpAddresses.cidr('172.0.0.0/16') },
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    bucketProps: { bucketName },
    logS3AccessLogs: false,
    bucketPermissions: ['Delete', 'Read', 'Write']
  });

  expect(construct.vpc !== null);
  expect(construct.service !== null);
  expect(construct.container !== null);
  expect(construct.s3Bucket !== null);
  expect(construct.s3BucketInterface !== null);

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

  template.hasResourceProperties("AWS::ECS::Service", {
    ServiceName: serviceName
  });
  template.hasResourceProperties("AWS::ECS::TaskDefinition", {
    Family: familyName
  });

  template.hasResourceProperties("AWS::ECS::Cluster", {
    ClusterName: clusterName
  });

  template.hasResourceProperties("AWS::S3::Bucket", {
    BucketName: bucketName
  });

  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: "s3:DeleteObject*",
          Effect: "Allow",
          Resource: {
            "Fn::Join": [
              "",
              [
                {
                  "Fn::GetAtt": [
                    "testconstructS3Bucket81E8552A",
                    "Arn"
                  ]
                },
                "/*"
              ]
            ]
          }
        },
        {
          Action: [
            "s3:GetObject*",
            "s3:GetBucket*",
            "s3:List*"
          ],
          Effect: "Allow",
          Resource: [
            {
              "Fn::GetAtt": [
                "testconstructS3Bucket81E8552A",
                "Arn"
              ]
            },
            {
              "Fn::Join": [
                "",
                [
                  {
                    "Fn::GetAtt": [
                      "testconstructS3Bucket81E8552A",
                      "Arn"
                    ]
                  },
                  "/*"
                ]
              ]
            }
          ]
        },
        {
          Action: [
            "s3:DeleteObject*",
            "s3:PutObject*",
            "s3:Abort*"
          ],
          Effect: "Allow",
          Resource: [
            {
              "Fn::GetAtt": [
                "testconstructS3Bucket81E8552A",
                "Arn"
              ]
            },
            {
              "Fn::Join": [
                "",
                [
                  {
                    "Fn::GetAtt": [
                      "testconstructS3Bucket81E8552A",
                      "Arn"
                    ]
                  },
                  "/*"
                ]
              ]
            }
          ]
        }
      ]
    }
  });

  template.hasResourceProperties("AWS::ECS::TaskDefinition", {
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

  // Confirm we created a Public/Private VPC
  template.hasResourceProperties('AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::S3::Bucket', 1);
  template.resourceCountIs('AWS::ECS::Service', 1);
});

test('New service/new bucket, private API, new VPC', () => {

  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack();
  const publicApi = false;
  const bucketName = 'bucket-name';
  const loggingBucketName = 'logging-bucket-name';

  new FargateToS3(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { ipAddresses: ec2.IpAddresses.cidr('172.0.0.0/16') },
    bucketProps: {
      bucketName
    },
    bucketPermissions: ['Write', 'Delete'],
    loggingBucketProps: {
      bucketName: loggingBucketName
    }
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

  template.hasResourceProperties("AWS::S3::Bucket", {
    BucketName: bucketName,
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [{
        ServerSideEncryptionByDefault: {
          SSEAlgorithm: "AES256"
        }
      }]
    }
  });

  template.hasResourceProperties("AWS::S3::Bucket", {
    BucketName: loggingBucketName
  });

  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: '172.0.0.0/16'
  });

  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: "s3:DeleteObject*",
          Effect: "Allow",
          Resource: {
            "Fn::Join": [
              "",
              [
                {
                  "Fn::GetAtt": [
                    "testconstructS3Bucket81E8552A",
                    "Arn"
                  ]
                },
                "/*"
              ]
            ]
          }
        },
        {
          Action: [
            "s3:DeleteObject*",
            "s3:PutObject*",
            "s3:Abort*"
          ],
          Effect: "Allow",
          Resource: [
            {
              "Fn::GetAtt": [
                "testconstructS3Bucket81E8552A",
                "Arn"
              ]
            },
            {
              "Fn::Join": [
                "",
                [
                  {
                    "Fn::GetAtt": [
                      "testconstructS3Bucket81E8552A",
                      "Arn"
                    ]
                  },
                  "/*"
                ]
              ]
            }
          ]
        }
      ]
    }
  });

  // Confirm we created an Isolated VPC
  defaults.expectNonexistence(stack, 'AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::S3::Bucket', 2);
  template.resourceCountIs('AWS::ECS::Service', 1);
});

test('Specify bad bucket permission', () => {

  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack();
  const publicApi = false;
  const bucketName = 'bucket-name';
  const loggingBucketName = 'logging-bucket-name';

  const props = {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { ipAddresses: ec2.IpAddresses.cidr('172.0.0.0/16') },
    bucketProps: {
      bucketName
    },
    bucketPermissions: ['Write', 'Delete', 'Reed'],
    loggingBucketProps: {
      bucketName: loggingBucketName
    }
  };

  const app = () => {
    new FargateToS3(stack, 'test-one', props);
  };
  // Assertion
  expect(app).toThrowError(
    /Invalid bucket permission submitted - Reed/);

});

test('New service/existing bucket, private API, existing VPC', () => {
  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack();
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

  template.hasResourceProperties("AWS::S3::Bucket", {
    BucketName: bucketName
  });
  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });

  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "s3:GetObject*",
            "s3:GetBucket*",
            "s3:List*",
            "s3:DeleteObject*",
            "s3:PutObject*",
            "s3:Abort*"
          ],
          Effect: "Allow",
          Resource: [
            {
              "Fn::GetAtt": [
                "MyBucketF68F3FF0",
                "Arn"
              ]
            },
            {
              "Fn::Join": [
                "",
                [
                  {
                    "Fn::GetAtt": [
                      "MyBucketF68F3FF0",
                      "Arn"
                    ]
                  },
                  "/*"
                ]
              ]
            }
          ]
        }
      ]
    }
  });

  // Confirm we created an Isolated VPC
  defaults.expectNonexistence(stack, 'AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::ECS::Service', 1);
  template.resourceCountIs('AWS::S3::Bucket', 1);
});

test('Existing service/new bucket, public API, existing VPC', () => {
  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack();
  const publicApi = true;
  const serviceName = 'custom-name';
  const customName = 'CUSTOM_NAME';
  const customArn = 'CUSTOM_ARN';
  const bucketName = 'bucket-name';
  const loggingBucketName = 'logging-bucket-name';

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

  new FargateToS3(stack, 'test-construct', {
    publicApi,
    existingFargateServiceObject: createFargateServiceResponse.service,
    existingContainerDefinitionObject: createFargateServiceResponse.containerDefinition,
    existingVpc,
    bucketArnEnvironmentVariableName: customArn,
    bucketEnvironmentVariableName: customName,
    bucketProps: {
      bucketName
    },
    loggingBucketProps: {
      bucketName: loggingBucketName
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
                "testconstructS3Bucket81E8552A",
                "Arn"
              ]
            }
          },
          {
            Name: customName,
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

  template.hasResourceProperties("AWS::S3::Bucket", {
    BucketName: bucketName
  });

  template.hasResourceProperties("AWS::S3::Bucket", {
    BucketName: loggingBucketName
  });

  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });

  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "s3:GetObject*",
            "s3:GetBucket*",
            "s3:List*",
            "s3:DeleteObject*",
            "s3:PutObject*",
            "s3:Abort*"
          ],
          Effect: "Allow",
          Resource: [
            {
              "Fn::GetAtt": [
                "testconstructS3Bucket81E8552A",
                "Arn"
              ]
            },
            {
              "Fn::Join": [
                "",
                [
                  {
                    "Fn::GetAtt": [
                      "testconstructS3Bucket81E8552A",
                      "Arn"
                    ]
                  },
                  "/*"
                ]
              ]
            }
          ]
        }
      ]
    }
  });

  // Confirm we created a Public/Private VPC
  template.hasResourceProperties('AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::ECS::Service', 1);
  template.resourceCountIs('AWS::S3::Bucket', 2);
});

// Test existing service/existing bucket, private API, new VPC
test('Existing service/existing bucket, private API, existing VPC', () => {
  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack();
  const publicApi = false;
  const serviceName = 'custom-name';
  const bucketName = 'custom-bucket-name';

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

  const existingBucket = new s3.Bucket(stack, 'MyBucket', {
    bucketName
  });

  new FargateToS3(stack, 'test-construct', {
    publicApi,
    existingFargateServiceObject: createFargateServiceResponse.service,
    existingContainerDefinitionObject: createFargateServiceResponse.containerDefinition,
    existingVpc,
    existingBucketObj: existingBucket,
    bucketPermissions: ['Write']
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

  template.hasResourceProperties("AWS::S3::Bucket", {
    BucketName: bucketName
  });
  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });

  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "s3:DeleteObject*",
            "s3:PutObject*",
            "s3:Abort*"
          ],
          Effect: "Allow",
          Resource: [
            {
              "Fn::GetAtt": [
                "MyBucketF68F3FF0",
                "Arn"
              ]
            },
            {
              "Fn::Join": [
                "",
                [
                  {
                    "Fn::GetAtt": [
                      "MyBucketF68F3FF0",
                      "Arn"
                    ]
                  },
                  "/*"
                ]
              ]
            }
          ]
        }
      ]
    }
  });

  // Confirm we created an Isolated VPC
  defaults.expectNonexistence(stack, 'AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::ECS::Service', 1);
  template.resourceCountIs('AWS::S3::Bucket', 1);
});
