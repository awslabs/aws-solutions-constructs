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
import { Construct } from "constructs";
import { KinesisFirehoseToS3 } from '@aws-solutions-constructs/aws-kinesisfirehose-s3';
import { FargateToKinesisFirehose } from "../lib";
import * as ecs from 'aws-cdk-lib/aws-ecs';
// import * as kinesisfirehose from 'aws-cdk-lib/aws-kinesisfirehose';
import { Match, Template } from "aws-cdk-lib/assertions";
// import { getDefaultSettings } from 'http2';

function GetTestDestination(scope: Construct, id: string): KinesisFirehoseToS3 {
  return new KinesisFirehoseToS3(scope, id, {
    bucketProps: {
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    },
    loggingBucketProps: {
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    }
  });
}

test('New service/new bucket, public API, new VPC', () => {
  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack();
  const publicApi = true;
  const clusterName = "custom-cluster-name";
  const containerName = "custom-container-name";
  const serviceName = "custom-service-name";
  const familyName = "family-name";
  const destination = GetTestDestination(stack, 'test-destination');

  const construct = new FargateToKinesisFirehose(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { cidr: '172.0.0.0/16' },
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    existingKinesisFirehose: destination.kinesisFirehose
  });

  expect(construct.vpc !== null);
  expect(construct.service !== null);
  expect(construct.container !== null);
  expect(construct.kinesisFirehose !== null);

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
    Family: familyName
  });

  expect(stack).toHaveResourceLike("AWS::ECS::Cluster", {
    ClusterName: clusterName
  });

  expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "firehose:DeleteDeliveryStream",
            "firehose:PutRecord",
            "firehose:PutRecordBatch",
            "firehose:UpdateDestination"
          ],
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "testdestinationKinesisFirehose5F7F1053",
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
  expect(stack).toCountResources('AWS::ECS::Service', 1);
});

test('New service/new bucket, private API, new VPC', () => {

  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack();
  const publicApi = false;
  // const clusterName = "custom-cluster-name";
  // const containerName = "custom-container-name";
  // const serviceName = "custom-service-name";
  // const familyName = "family-name";
  const destination = GetTestDestination(stack, 'test-destination');

  new FargateToKinesisFirehose(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { cidr: '172.0.0.0/16' },
    //    clusterProps: { clusterName },
    //    containerDefinitionProps: { containerName },
    //    fargateTaskDefinitionProps: { family: familyName },
    //    fargateServiceProps: { serviceName },
    existingKinesisFirehose: destination.kinesisFirehose
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

  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: '172.0.0.0/16'
  });

  expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "firehose:DeleteDeliveryStream",
            "firehose:PutRecord",
            "firehose:PutRecordBatch",
            "firehose:UpdateDestination"
          ],
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "testdestinationKinesisFirehose5F7F1053",
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

  // Confirm we created an Isolated VPC
  expect(stack).not.toHaveResourceLike('AWS::EC2::InternetGateway', {});
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::S3::Bucket', 2);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
});

// TODO: change test-fargate-kinesistreams id to firehose
// TODO: Make sure all integration tests us public repo

test('Default construct has all expected properties', () => {
  const stack = new cdk.Stack();

  const destination = GetTestDestination(stack, 'test-destination');
  const construct = new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    existingKinesisFirehose: destination.kinesisFirehose
  });

  expect(construct.vpc).toBeDefined();
  expect(construct.service).toBeDefined();
  expect(construct.container).toBeDefined();
  expect(construct.kinesisFirehose).toBeDefined();
});

test('Construct deploys Fargate Service in isolated subnets when publicApi is set to false', () => {
  const stack = new cdk.Stack();

  const destination = GetTestDestination(stack, 'test-destination');
  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    existingKinesisFirehose: destination.kinesisFirehose
  });

  const template = Template.fromStack(stack);

  // The default isolated VPC should have two subnets, 2 route tables, and no nat/internet gateway, or routes
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::EC2::Subnet', 2);
  expect(stack).toCountResources('AWS::EC2::RouteTable', 2);
  expect(stack).toCountResources('AWS::EC2::Route', 0);
  expect(stack).toCountResources('AWS::EC2::NatGateway', 0);
  expect(stack).toCountResources('AWS::EC2::InternetGateway', 0);

  // Get the first isolated subnet
  const subnet1Resource = template.findResources('AWS::EC2::Subnet', {
    Properties: {
      MapPublicIpOnLaunch: false,
      Tags: [
        {
          Key: Match.exact("Name"),
          Value: Match.exact("Default/Vpc/IsolatedSubnet1")
        }
      ]
    }
  });
  const [ subnet1 ] = Object.keys(subnet1Resource);

  // Get the second isolated subnet
  const subnet2Resource = template.findResources('AWS::EC2::Subnet', {
    Properties: {
      MapPublicIpOnLaunch: false,
      Tags: [
        {
          Key: Match.exact("Name"),
          Value: Match.exact("Default/Vpc/IsolatedSubnet2")
        }
      ]
    }
  });
  const [ subnet2 ] = Object.keys(subnet2Resource);

  // Verify the Fargate Service is deployed into the two isolated subnets
  expect(stack).toHaveResourceLike('AWS::ECS::Service', {
    NetworkConfiguration: {
      AwsvpcConfiguration: {
        AssignPublicIp: "DISABLED",
        Subnets: [
          {
            Ref: subnet1
          },
          {
            Ref: subnet2
          }
        ]
      },
    }
  });
});

test('Construct deploys Fargate Service in private subnets when publicApi is set to true', () => {
  const stack = new cdk.Stack();
  const destination = GetTestDestination(stack, 'test-destination');

  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: true,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    existingKinesisFirehose: destination.kinesisFirehose
  });

  // The default public/private VPC should have 4 subnets (two public, two private)
  // 4 route tables, 4 routes, 2 NAT Gateways and 1 Internet Gateway
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::EC2::Subnet', 4);
  expect(stack).toCountResources('AWS::EC2::RouteTable', 4);
  expect(stack).toCountResources('AWS::EC2::Route', 4);
  expect(stack).toCountResources('AWS::EC2::NatGateway', 2);
  expect(stack).toCountResources('AWS::EC2::InternetGateway', 1);

  const template = Template.fromStack(stack);

  // Get the first private subnet
  const privateSubnet1Resource = template.findResources('AWS::EC2::Subnet', {
    Properties: {
      MapPublicIpOnLaunch: false,
      Tags: [
        {
          Key: Match.exact("Name"),
          Value: Match.exact("Default/Vpc/PrivateSubnet1")
        }
      ]
    }
  });
  const [ privateSubnet1 ] = Object.keys(privateSubnet1Resource);

  // Get the second private subnet
  const privateSubnet2Resource = template.findResources('AWS::EC2::Subnet', {
    Properties: {
      MapPublicIpOnLaunch: false,
      Tags: [
        {
          Key: Match.exact("Name"),
          Value: Match.exact("Default/Vpc/PrivateSubnet2")
        }
      ]
    }
  });
  const [ privateSubnet2 ] = Object.keys(privateSubnet2Resource);

  // Verify the Fargate Service is deployed into the two private subnets
  expect(stack).toHaveResourceLike('AWS::ECS::Service', {
    NetworkConfiguration: {
      AwsvpcConfiguration: {
        AssignPublicIp: "DISABLED",
        Subnets: [
          {
            Ref: privateSubnet1
          },
          {
            Ref: privateSubnet2
          }
        ]
      },
    }
  });
});

test('Construct uses vpcProps when provided', () => {
  const stack = new cdk.Stack();
  const destination = GetTestDestination(stack, 'test-destination');

  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    existingKinesisFirehose: destination.kinesisFirehose,
    vpcProps: {
      vpcName: 'my-vpc'
    }
  });

  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toHaveResourceLike('AWS::EC2::VPC', {
    Tags: [
      {
        Key: 'Name',
        Value: 'my-vpc'
      }
    ]
  });
});

test('Construct uses existingVpc when provided', () => {
  const stack = new cdk.Stack();
  const destination = GetTestDestination(stack, 'test-destination');

  const existingVpc = defaults.getTestVpc(stack, false, {
    vpcName: 'my-vpc'
  });

  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    existingKinesisFirehose: destination.kinesisFirehose,
    existingVpc
  });

  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toHaveResourceLike('AWS::EC2::VPC', {
    Tags: [
      {
        Key: 'Name',
        Value: 'my-vpc'
      }
    ]
  });
});

test('Construct creates VPC Interface Endpoints for ECR and Kinesis Streams', () => {
  const stack = new cdk.Stack();
  const destination = GetTestDestination(stack, 'test-destination');

  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    existingKinesisFirehose: destination.kinesisFirehose,
    ecrRepositoryArn: defaults.fakeEcrRepoArn
  });

  expect(stack).toHaveResource('AWS::EC2::VPCEndpoint', {
    ServiceName: {
      'Fn::Join': [
        '',
        [
          'com.amazonaws.',
          {
            Ref: 'AWS::Region'
          },
          '.kinesis-firehose'
        ]
      ]
    },
  });

  expect(stack).toHaveResource('AWS::EC2::VPCEndpoint', {
    ServiceName: {
      'Fn::Join': [
        '',
        [
          'com.amazonaws.',
          {
            Ref: 'AWS::Region'
          },
          '.ecr.api'
        ]
      ]
    },
  });
});

test('Container has default stream name environment variable', () => {
  const stack = new cdk.Stack();
  const destination = GetTestDestination(stack, 'test-destination');

  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    existingKinesisFirehose: destination.kinesisFirehose,
    ecrRepositoryArn: defaults.fakeEcrRepoArn
  });

  expect(stack).toHaveResourceLike('AWS::ECS::TaskDefinition', {
    ContainerDefinitions: [
      {
        Environment: [
          {
            Name: 'FIREHOSE_DELIVERYSTREAM_NAME',
            Value: destination.kinesisFirehose.deliveryStreamName
          }
        ],
      }
    ]
  });
});

test('Container stream name environment variable can be overridden', () => {
  const stack = new cdk.Stack();
  const destination = GetTestDestination(stack, 'test-destination');

  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    existingKinesisFirehose: destination.kinesisFirehose,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    firehoseEnvironmentVariableName: 'my-stream-name'
  });

  expect(stack).toHaveResourceLike('AWS::ECS::TaskDefinition', {
    ContainerDefinitions: [
      {
        Environment: [
          {
            Name: 'my-stream-name',
            Value: destination.kinesisFirehose.deliveryStreamName
          }
        ],
      }
    ]
  });
});

test('Construct grants PutRecord permission for the Fargate Service to write to the Kinesis Stream', () => {
  const stack = new cdk.Stack();
  const destination = GetTestDestination(stack, 'test-destination');

  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    existingKinesisFirehose: destination.kinesisFirehose,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
  });

  expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "firehose:DeleteDeliveryStream",
            "firehose:PutRecord",
            "firehose:PutRecordBatch",
            "firehose:UpdateDestination"
          ],
          Effect: 'Allow',
          Resource: {
            "Fn::GetAtt": [
              "testdestinationKinesisFirehose5F7F1053",
              "Arn"
            ]
          }
        }
      ]
    }
  });
});

test('Construct defaults to the latest version of the ECR image', () => {
  const stack = new cdk.Stack();
  const destination = GetTestDestination(stack, 'test-destination');

  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    existingKinesisFirehose: destination.kinesisFirehose,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
  });

  expect(stack).toHaveResourceLike('AWS::ECS::TaskDefinition', {
    ContainerDefinitions: [
      {
        Image: {
          'Fn::Join': [
            '',
            [
              '123456789012.dkr.ecr.us-east-1.',
              {
                Ref: 'AWS::URLSuffix'
              },
              '/fake-repo:latest'
            ]
          ]
        },
      }
    ]
  });
});

test('Construct uses ecrImageVersion when provided', () => {
  const stack = new cdk.Stack();
  const destination = GetTestDestination(stack, 'test-destination');

  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    existingKinesisFirehose: destination.kinesisFirehose,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    ecrImageVersion: 'my-version'
  });

  expect(stack).toHaveResourceLike('AWS::ECS::TaskDefinition', {
    ContainerDefinitions: [
      {
        Image: {
          'Fn::Join': [
            '',
            [
              '123456789012.dkr.ecr.us-east-1.',
              {
                Ref: 'AWS::URLSuffix'
              },
              '/fake-repo:my-version'
            ]
          ]
        },
      }
    ]
  });
});

test('Construct uses clusterProps when provided', () => {
  const stack = new cdk.Stack();
  const destination = GetTestDestination(stack, 'test-destination');

  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    existingKinesisFirehose: destination.kinesisFirehose,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clusterProps: {
      clusterName: 'my-cluster'
    }
  });

  expect(stack).toCountResources('AWS::ECS::Cluster', 1);
  expect(stack).toHaveResourceLike("AWS::ECS::Cluster", {
    ClusterName: 'my-cluster'
  });
});

test('Construct uses containerDefinitionProps when provided', () => {
  const stack = new cdk.Stack();
  const destination = GetTestDestination(stack, 'test-destination');

  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    existingKinesisFirehose: destination.kinesisFirehose,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    containerDefinitionProps: {
      containerName: 'my-container'
    }
  });

  expect(stack).toCountResources('AWS::ECS::TaskDefinition', 1);
  expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      {
        Name: 'my-container'
      }
    ]
  });
});

test('Construct uses fargateTaskDefinitionProps when provided', () => {
  const stack = new cdk.Stack();
  const destination = GetTestDestination(stack, 'test-destination');

  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    existingKinesisFirehose: destination.kinesisFirehose,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    fargateTaskDefinitionProps: {
      family: 'my-family'
    }
  });

  expect(stack).toCountResources('AWS::ECS::TaskDefinition', 1);
  expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", {
    Family: 'my-family'
  });
});

test('Construct uses fargateServiceProps when provided', () => {
  const stack = new cdk.Stack();
  const destination = GetTestDestination(stack, 'test-destination');

  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    existingKinesisFirehose: destination.kinesisFirehose,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    fargateServiceProps: {
      serviceName: 'my-service',
      desiredCount: 7
    }
  });

  expect(stack).toCountResources('AWS::ECS::Service', 1);
  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    ServiceName: 'my-service',
    DesiredCount: 7
  });
});

test('Construct uses existingFargateServiceObject when provided', () => {
  const stack = new cdk.Stack();
  const destination = GetTestDestination(stack, 'test-destination');

  const existingVpc = defaults.getTestVpc(stack);

  const [existingFargateServiceObject, existingContainerDefinitionObject] = defaults.CreateFargateService(stack, 'test-existing-fargate-service',
    existingVpc,
    { clusterName: 'my-cluster' },
    defaults.fakeEcrRepoArn,
    undefined,
    { family: 'my-family' },
    { containerName: 'my-container' },
    { serviceName: 'my-service' }
  );

  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    existingVpc,
    existingKinesisFirehose: destination.kinesisFirehose,
    existingFargateServiceObject,
    existingContainerDefinitionObject
  });

  expect(stack).toCountResources('AWS::ECS::Cluster', 1);
  expect(stack).toHaveResourceLike("AWS::ECS::Cluster", {
    ClusterName: 'my-cluster'
  });

  expect(stack).toCountResources('AWS::ECS::TaskDefinition', 1);
  expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", {
    Family: 'my-family',
    ContainerDefinitions: [
      {
        Name: 'my-container'
      }
    ]
  });

  expect(stack).toCountResources('AWS::ECS::Service', 1);
  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    ServiceName: 'my-service',
  });
});

test('Test fail if existingFirehose does not have a stream name', () => {
  // Stack
  const stack = new cdk.Stack();
  const destination = GetTestDestination(stack, 'test-destination');

  const mutatedFirehose = defaults.overrideProps(destination.kinesisFirehose, {});
  mutatedFirehose.deliveryStreamName = undefined;

  const app = () => {
    new FargateToKinesisFirehose(stack, 'test-target', {
      existingKinesisFirehose: mutatedFirehose,
      publicApi: false,
      ecrRepositoryArn: defaults.fakeEcrRepoArn,
    });
  };

  expect(app).toThrowError(/existingKinesisFirehose must have a defined deliveryStreamName/);
});
