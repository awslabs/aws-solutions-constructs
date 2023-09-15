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
import { FargateToKinesisFirehose, FargateToKinesisFirehoseProps } from "../lib";
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Match, Template } from "aws-cdk-lib/assertions";
import { GetTestFirehoseDestination } from './test-helper';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

test('New service/new bucket, public API, new VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = true;
  const clusterName = "custom-cluster-name";
  const containerName = "custom-container-name";
  const serviceName = "custom-service-name";
  const familyName = "family-name";
  const destination = GetTestFirehoseDestination(stack, 'test-destination');

  const construct = new FargateToKinesisFirehose(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { ipAddresses: ec2.IpAddresses.cidr('172.0.0.0/16') },
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

  template.hasResourceProperties("AWS::IAM::Policy", {
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
  template.resourceCountIs('AWS::ECS::Service', 1);
});

test('New service/new bucket, private API, new VPC', () => {

  const stack = new cdk.Stack();
  const publicApi = false;

  const destination = GetTestFirehoseDestination(stack, 'test-destination');

  new FargateToKinesisFirehose(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { ipAddresses: ec2.IpAddresses.cidr('172.0.0.0/16') },
    existingKinesisFirehose: destination.kinesisFirehose
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

  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: '172.0.0.0/16'
  });

  template.hasResourceProperties("AWS::IAM::Policy", {
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
  defaults.expectNonexistence(stack, 'AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::S3::Bucket', 2);
  template.resourceCountIs('AWS::ECS::Service', 1);
});

test('Default construct has all expected properties', () => {
  const stack = new cdk.Stack();

  const destination = GetTestFirehoseDestination(stack, 'test-destination');
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

  const destination = GetTestFirehoseDestination(stack, 'test-destination');
  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    existingKinesisFirehose: destination.kinesisFirehose
  });

  const template = Template.fromStack(stack);

  // The default isolated VPC should have two subnets, 2 route tables, and no nat/internet gateway, or routes
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::EC2::Subnet', 2);
  template.resourceCountIs('AWS::EC2::RouteTable', 2);
  template.resourceCountIs('AWS::EC2::Route', 0);
  template.resourceCountIs('AWS::EC2::NatGateway', 0);
  template.resourceCountIs('AWS::EC2::InternetGateway', 0);

  const subnet1Resources = template.findResources('AWS::EC2::Subnet', {
    Properties: {
      Tags: Match.arrayWith([
        {
          Key: "aws-cdk:subnet-type",
          Value: "Isolated"
        }
      ])
    }
  });
  const [ subnet1, subnet2 ] = Object.keys(subnet1Resources);

  // Verify the Fargate Service is deployed into the two isolated subnets
  template.hasResourceProperties('AWS::ECS::Service', {
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
  const destination = GetTestFirehoseDestination(stack, 'test-destination');

  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: true,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    existingKinesisFirehose: destination.kinesisFirehose
  });

  // The default public/private VPC should have 4 subnets (two public, two private)
  // 4 route tables, 4 routes, 2 NAT Gateways and 1 Internet Gateway
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::EC2::Subnet', 4);
  template.resourceCountIs('AWS::EC2::RouteTable', 4);
  template.resourceCountIs('AWS::EC2::Route', 4);
  template.resourceCountIs('AWS::EC2::NatGateway', 2);
  template.resourceCountIs('AWS::EC2::InternetGateway', 1);

  const subnet1Resources = template.findResources('AWS::EC2::Subnet', {
    Properties: {
      Tags: Match.arrayWith([
        {
          Key: "aws-cdk:subnet-type",
          Value: "Private"
        }
      ])
    }
  });
  const [ privateSubnet1, privateSubnet2 ] = Object.keys(subnet1Resources);

  // Verify the Fargate Service is deployed into the two private subnets
  template.hasResourceProperties('AWS::ECS::Service', {
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
  const destination = GetTestFirehoseDestination(stack, 'test-destination');

  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    existingKinesisFirehose: destination.kinesisFirehose,
    vpcProps: {
      vpcName: 'my-vpc'
    }
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.hasResourceProperties('AWS::EC2::VPC', {
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
  const destination = GetTestFirehoseDestination(stack, 'test-destination');

  const existingVpc = defaults.getTestVpc(stack, false, {
    vpcName: 'my-vpc'
  });

  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    existingKinesisFirehose: destination.kinesisFirehose,
    existingVpc
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.hasResourceProperties('AWS::EC2::VPC', {
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
  const destination = GetTestFirehoseDestination(stack, 'test-destination');

  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    existingKinesisFirehose: destination.kinesisFirehose,
    ecrRepositoryArn: defaults.fakeEcrRepoArn
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
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

  template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
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
  const destination = GetTestFirehoseDestination(stack, 'test-destination');

  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    existingKinesisFirehose: destination.kinesisFirehose,
    ecrRepositoryArn: defaults.fakeEcrRepoArn
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ECS::TaskDefinition', {
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
  const destination = GetTestFirehoseDestination(stack, 'test-destination');

  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    existingKinesisFirehose: destination.kinesisFirehose,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    firehoseEnvironmentVariableName: 'my-stream-name'
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ECS::TaskDefinition', {
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
  const destination = GetTestFirehoseDestination(stack, 'test-destination');

  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    existingKinesisFirehose: destination.kinesisFirehose,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::IAM::Policy', {
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
  const destination = GetTestFirehoseDestination(stack, 'test-destination');

  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    existingKinesisFirehose: destination.kinesisFirehose,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ECS::TaskDefinition', {
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
  const destination = GetTestFirehoseDestination(stack, 'test-destination');

  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    existingKinesisFirehose: destination.kinesisFirehose,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    ecrImageVersion: 'my-version'
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ECS::TaskDefinition', {
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
  const destination = GetTestFirehoseDestination(stack, 'test-destination');

  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    existingKinesisFirehose: destination.kinesisFirehose,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clusterProps: {
      clusterName: 'my-cluster'
    }
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::ECS::Cluster', 1);
  template.hasResourceProperties("AWS::ECS::Cluster", {
    ClusterName: 'my-cluster'
  });
});

test('Construct uses containerDefinitionProps when provided', () => {
  const stack = new cdk.Stack();
  const destination = GetTestFirehoseDestination(stack, 'test-destination');

  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    existingKinesisFirehose: destination.kinesisFirehose,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    containerDefinitionProps: {
      containerName: 'my-container'
    }
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::ECS::TaskDefinition', 1);
  template.hasResourceProperties("AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      {
        Name: 'my-container'
      }
    ]
  });
});

test('Construct uses fargateTaskDefinitionProps when provided', () => {
  const stack = new cdk.Stack();
  const destination = GetTestFirehoseDestination(stack, 'test-destination');

  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    existingKinesisFirehose: destination.kinesisFirehose,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    fargateTaskDefinitionProps: {
      family: 'my-family'
    }
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::ECS::TaskDefinition', 1);
  template.hasResourceProperties("AWS::ECS::TaskDefinition", {
    Family: 'my-family'
  });
});

test('Construct uses fargateServiceProps when provided', () => {
  const stack = new cdk.Stack();
  const destination = GetTestFirehoseDestination(stack, 'test-destination');

  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    existingKinesisFirehose: destination.kinesisFirehose,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    fargateServiceProps: {
      serviceName: 'my-service',
      desiredCount: 7
    }
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::ECS::Service', 1);
  template.hasResourceProperties("AWS::ECS::Service", {
    ServiceName: 'my-service',
    DesiredCount: 7
  });
});

test('Construct uses existingFargateServiceObject when provided', () => {
  const stack = new cdk.Stack();
  const destination = GetTestFirehoseDestination(stack, 'test-destination');

  const existingVpc = defaults.getTestVpc(stack);

  const createFargateServiceResponse = defaults.CreateFargateService(stack, 'test-existing-fargate-service', {
    constructVpc: existingVpc,
    clientClusterProps: { clusterName: 'my-cluster' },
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clientFargateTaskDefinitionProps: {
      family: 'my-family'
    },
    clientContainerDefinitionProps: {
      containerName: 'my-container'
    },
    clientFargateServiceProps: {
      serviceName: 'my-service'
    }
  });

  new FargateToKinesisFirehose(stack, 'test-fargate-kinesisfirehose', {
    publicApi: false,
    existingVpc,
    existingKinesisFirehose: destination.kinesisFirehose,
    existingFargateServiceObject: createFargateServiceResponse.service,
    existingContainerDefinitionObject: createFargateServiceResponse.containerDefinition
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::ECS::Cluster', 1);
  template.hasResourceProperties("AWS::ECS::Cluster", {
    ClusterName: 'my-cluster'
  });

  template.resourceCountIs('AWS::ECS::TaskDefinition', 1);
  template.hasResourceProperties("AWS::ECS::TaskDefinition", {
    Family: 'my-family',
    ContainerDefinitions: [
      {
        Name: 'my-container'
      }
    ]
  });

  template.resourceCountIs('AWS::ECS::Service', 1);
  template.hasResourceProperties("AWS::ECS::Service", {
    ServiceName: 'my-service',
  });
});

test('Test fail if existingFirehose does not have a stream name', () => {
  // Stack
  const stack = new cdk.Stack();
  const destination = GetTestFirehoseDestination(stack, 'test-destination');

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

test('Confirm that CheckVpcProps was called', () => {
  const stack = new cdk.Stack();
  const publicApi = true;
  const clusterName = "custom-cluster-name";
  const containerName = "custom-container-name";
  const serviceName = "custom-service-name";
  const familyName = "custom-family-name";
  const destination = GetTestFirehoseDestination(stack, 'test-destination');

  const props: FargateToKinesisFirehoseProps = {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    existingKinesisFirehose: destination.kinesisFirehose,
    existingVpc: defaults.getTestVpc(stack),
    vpcProps: {  },
  };

  const app = () => {
    new FargateToKinesisFirehose(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide an existingVpc or some combination of deployVpc and vpcProps, but not both.\n');
});
