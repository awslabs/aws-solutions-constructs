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

import { FargateToKinesisStreams, FargateToKinesisStreamsProps } from "../lib";
import * as cdk from "aws-cdk-lib";
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as defaults from '@aws-solutions-constructs/core';
import { Match, Template } from "aws-cdk-lib/assertions";

test('Default construct has all expected properties', () => {
  const stack = new cdk.Stack();

  const construct = new FargateToKinesisStreams(stack, 'test-fargate-kinesisstreams', {
    publicApi: false,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
  });

  expect(construct.vpc).toBeDefined();
  expect(construct.service).toBeDefined();
  expect(construct.container).toBeDefined();
  expect(construct.kinesisStream).toBeDefined();
  expect(construct.cloudwatchAlarms).toBeDefined();
});

test('Construct deploys Fargate Service in isolated subnets when publicApi is set to false', () => {
  const stack = new cdk.Stack();

  new FargateToKinesisStreams(stack, 'test-fargate-kinesisstreams', {
    publicApi: false,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
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

  new FargateToKinesisStreams(stack, 'test-fargate-kinesisstreams', {
    publicApi: true,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
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
  const [ subnet1, subnet2 ] = Object.keys(subnet1Resources);

  // Verify the Fargate Service is deployed into the two private subnets
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

test('Construct uses vpcProps when provided', () => {
  const stack = new cdk.Stack();

  new FargateToKinesisStreams(stack, 'test-fargate-kinesisstreams', {
    publicApi: false,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
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

  const existingVpc = defaults.getTestVpc(stack, false, {
    vpcName: 'my-vpc'
  });

  new FargateToKinesisStreams(stack, 'test-fargate-kinesisstreams', {
    publicApi: false,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
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

  new FargateToKinesisStreams(stack, 'test-fargate-kinesisstreams', {
    publicApi: false,
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
          '.kinesis-streams'
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

  new FargateToKinesisStreams(stack, 'test-fargate-kinesisstreams', {
    publicApi: false,
    ecrRepositoryArn: defaults.fakeEcrRepoArn
  });

  const template = Template.fromStack(stack);

  // Get Kinesis Data Stream created by the construct
  const kinesisStream = template.findResources('AWS::Kinesis::Stream');
  const [ kinesisStreamId ] = Object.keys(kinesisStream);

  template.hasResourceProperties('AWS::ECS::TaskDefinition', {
    ContainerDefinitions: [
      {
        Environment: [
          {
            Name: 'KINESIS_DATASTREAM_NAME',
            Value: {
              Ref: kinesisStreamId
            }
          }
        ],
      }
    ]
  });
});

test('Container stream name environment variable can be overridden', () => {
  const stack = new cdk.Stack();

  new FargateToKinesisStreams(stack, 'test-fargate-kinesisstreams', {
    publicApi: false,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    streamEnvironmentVariableName: 'my-stream-name'
  });

  const template = Template.fromStack(stack);

  // Get Kinesis Data Stream created by the construct
  const kinesisStream = template.findResources('AWS::Kinesis::Stream');
  const [ kinesisStreamId ] = Object.keys(kinesisStream);

  template.hasResourceProperties('AWS::ECS::TaskDefinition', {
    ContainerDefinitions: [
      {
        Environment: [
          {
            Name: 'my-stream-name',
            Value: {
              Ref: kinesisStreamId
            }
          }
        ],
      }
    ]
  });
});

test('Kinesis Stream is encrypted with AWS-managed CMK by default', () => {
  const stack = new cdk.Stack();

  new FargateToKinesisStreams(stack, 'test-fargate-kinesisstreams', {
    publicApi: false,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Kinesis::Stream', {
    StreamEncryption: {
      EncryptionType: 'KMS',
      KeyId: 'alias/aws/kinesis'
    }
  });
});

test('CloudWatch Alarms are created for Kinesis Stream by default', () => {
  const stack = new cdk.Stack();

  new FargateToKinesisStreams(stack, 'test-fargate-kinesisstreams', {
    publicApi: false,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::CloudWatch::Alarm', {
    Namespace: 'AWS/Kinesis',
    MetricName: 'GetRecords.IteratorAgeMilliseconds'
  });

  template.hasResourceProperties('AWS::CloudWatch::Alarm', {
    Namespace: 'AWS/Kinesis',
    MetricName: 'ReadProvisionedThroughputExceeded'
  });
});

test('CloudWatch Alarms are not created when createCloudWatchAlarms property is set to false', () => {
  const stack = new cdk.Stack();

  new FargateToKinesisStreams(stack, 'test-fargate-kinesisstreams', {
    publicApi: false,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    createCloudWatchAlarms: false
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::CloudWatch::Alarm', 0);
});

test('Construct uses existingStreamObj when provided', () => {
  const stack = new cdk.Stack();

  const existingStreamObj = new kinesis.Stream(stack, 'test-stream', {
    streamName: 'my-stream',
  });

  new FargateToKinesisStreams(stack, 'test-fargate-kinesisstreams', {
    publicApi: false,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    existingStreamObj
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Kinesis::Stream', {
    Name: 'my-stream'
  });

  template.resourceCountIs('AWS::Kinesis::Stream', 1);
});

test('Construct uses kinesisStreamProps when provided', () => {
  const stack = new cdk.Stack();

  new FargateToKinesisStreams(stack, 'test-fargate-kinesisstreams', {
    publicApi: false,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    kinesisStreamProps: {
      streamName: 'my-stream',
      encryption: kinesis.StreamEncryption.UNENCRYPTED
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Kinesis::Stream', {
    Name: 'my-stream'
  });

  defaults.expectNonexistence(stack, 'AWS::Kinesis::Stream', {
    StreamEncryption: {
      EncryptionType: 'KMS',
      KeyId: 'alias/aws/kinesis'
    }
  });

  template.resourceCountIs('AWS::Kinesis::Stream', 1);
});

test('Construct grants PutRecord permission for the Fargate Service to write to the Kinesis Stream', () => {
  const stack = new cdk.Stack();

  new FargateToKinesisStreams(stack, 'test-fargate-kinesisstreams', {
    publicApi: false,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
  });

  const template = Template.fromStack(stack);

  // Get Kinesis Data Stream created by the construct
  const kinesisStream = template.findResources('AWS::Kinesis::Stream');
  const [ kinesisStreamId ] = Object.keys(kinesisStream);

  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            'kinesis:ListShards',
            'kinesis:PutRecord',
            'kinesis:PutRecords'
          ],
          Effect: 'Allow',
          Resource: {
            'Fn::GetAtt': [
              kinesisStreamId,
              'Arn'
            ]
          }
        }
      ]
    }
  });
});

test('Construct defaults to the latest version of the ECR image', () => {
  const stack = new cdk.Stack();

  new FargateToKinesisStreams(stack, 'test-fargate-kinesisstreams', {
    publicApi: false,
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

  new FargateToKinesisStreams(stack, 'test-fargate-kinesisstreams', {
    publicApi: false,
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

  new FargateToKinesisStreams(stack, 'test-fargate-kinesisstreams', {
    publicApi: false,
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

  new FargateToKinesisStreams(stack, 'test-fargate-kinesisstreams', {
    publicApi: false,
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

  new FargateToKinesisStreams(stack, 'test-fargate-kinesisstreams', {
    publicApi: false,
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

  new FargateToKinesisStreams(stack, 'test-fargate-kinesisstreams', {
    publicApi: false,
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

  const existingVpc = defaults.getTestVpc(stack);

  const createFargateServiceResponse = defaults.CreateFargateService(stack, 'test-existing-fargate-service', {
    constructVpc: existingVpc,
    clientClusterProps: {
      clusterName: 'my-cluster'
    },
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

  new FargateToKinesisStreams(stack, 'test-fargate-kinesisstreams', {
    publicApi: false,
    existingVpc,
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

test('Confirm that CheckVpcProps was called', () => {
  const stack = new cdk.Stack();
  const publicApi = true;
  const clusterName = "custom-cluster-name";
  const containerName = "custom-container-name";
  const serviceName = "custom-service-name";
  const familyName = "custom-family-name";

  const props: FargateToKinesisStreamsProps = {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    existingVpc: defaults.getTestVpc(stack),
    vpcProps: {  },
  };

  const app = () => {
    new FargateToKinesisStreams(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide an existingVpc or some combination of deployVpc and vpcProps, but not both.\n');
});

test('Confirm that CheckKinesisStreamsProps was called', () => {
  const stack = new cdk.Stack();
  const publicApi = true;
  const clusterName = "custom-cluster-name";
  const containerName = "custom-container-name";
  const serviceName = "custom-service-name";
  const familyName = "custom-family-name";

  const props: FargateToKinesisStreamsProps = {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    vpcProps: {  },
    existingStreamObj: new kinesis.Stream(stack, 'test', {}),
    kinesisStreamProps: {}
  };

  const app = () => {
    new FargateToKinesisStreams(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide existingStreamObj or kinesisStreamProps, but not both.\n');
});

test('Test that ValidateContainerDefinitionProps() is being called', () => {
  const stack = new cdk.Stack();
  const props: FargateToKinesisStreamsProps = {
    publicApi: true,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    containerDefinitionProps: {
      invalidProperty: true
    }
  };

  const app = () => {
    new FargateToKinesisStreams(stack, 'test-construct', props);
  };

  expect(app).toThrowError();
});

test('Test that ValidateFargateTaskDefinitionProps() is being called', () => {
  const stack = new cdk.Stack();
  const props: FargateToKinesisStreamsProps = {
    publicApi: true,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    fargateTaskDefinitionProps: {
      invalidProperty: true
    }
  };

  const app = () => {
    new FargateToKinesisStreams(stack, 'test-construct', props);
  };

  expect(app).toThrowError();
});

test('Test that ValidateFargateServiceProps() is being called', () => {
  const stack = new cdk.Stack();
  const props: FargateToKinesisStreamsProps = {
    publicApi: true,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    fargateServiceProps: {
      invalidProperty: true
    }
  };

  const app = () => {
    new FargateToKinesisStreams(stack, 'test-construct', props);
  };

  expect(app).toThrowError();
});
