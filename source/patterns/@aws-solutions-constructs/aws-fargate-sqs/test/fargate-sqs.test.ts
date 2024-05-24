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
import { FargateToSqs, FargateToSqsProps } from "../lib";
import * as kms from 'aws-cdk-lib/aws-kms';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

test('New service/new queue, dlq, public API, new VPC', () => {

  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack();
  const publicApi = true;
  const clusterName = "custom-cluster-name";
  const containerName = "custom-container-name";
  const serviceName = "custom-service-name";
  const queueName = "custom-queue-name";
  const familyName = "family-name";
  const deadLetterQueueName = "dlqQueue";

  const construct = new FargateToSqs(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { ipAddresses: ec2.IpAddresses.cidr('172.0.0.0/16') },
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    queueProps: { queueName },
    deadLetterQueueProps: {
      queueName: deadLetterQueueName
    },
    queuePermissions: ['Read', 'Write']
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

  expect(construct.vpc).toBeDefined();
  expect(construct.service).toBeDefined();
  expect(construct.container).toBeDefined();
  expect(construct.sqsQueue).toBeDefined();
  expect(construct.deadLetterQueue).toBeDefined();

  template.hasResourceProperties("AWS::ECS::Service", {
    ServiceName: serviceName
  });
  template.hasResourceProperties("AWS::ECS::TaskDefinition", {
    Family: familyName
  });

  template.hasResourceProperties("AWS::ECS::Cluster", {
    ClusterName: clusterName
  });

  template.hasResourceProperties("AWS::SQS::Queue", {
    QueueName: queueName
  });

  template.hasResourceProperties("AWS::SQS::Queue", {
    QueueName: deadLetterQueueName
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

  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "sqs:ReceiveMessage",
            "sqs:ChangeMessageVisibility",
            "sqs:GetQueueUrl",
            "sqs:DeleteMessage",
            "sqs:GetQueueAttributes"
          ],
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "testconstructtestconstructqueue6D12C99B",
              "Arn"
            ]
          }
        },
        {
          Action: [
            "sqs:SendMessage",
            "sqs:GetQueueAttributes",
            "sqs:GetQueueUrl"
          ],
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "testconstructtestconstructqueue6D12C99B",
              "Arn"
            ]
          }
        },
      ],
    }
  });

  // Confirm we created a Public/Private VPC
  template.hasResourceProperties('AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::SQS::Queue', 2);
  template.resourceCountIs('AWS::ECS::Service', 1);
});

test('New service/new queue, private API, new VPC', () => {

  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack();
  const publicApi = false;

  new FargateToSqs(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { ipAddresses: ec2.IpAddresses.cidr('172.0.0.0/16') },
    deployDeadLetterQueue: false,
    queuePermissions: ['Read']
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

  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: "alias/aws/sqs"
  });

  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: '172.0.0.0/16'
  });

  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "sqs:ReceiveMessage",
            "sqs:ChangeMessageVisibility",
            "sqs:GetQueueUrl",
            "sqs:DeleteMessage",
            "sqs:GetQueueAttributes"
          ],
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "testconstructtestconstructqueue6D12C99B",
              "Arn"
            ]
          }
        }
      ],
    }
  });

  // Confirm we created an Isolated VPC
  defaults.expectNonexistence(stack, 'AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::SQS::Queue', 1);
  template.resourceCountIs('AWS::ECS::Service', 1);
});

test('New service/existing fifo queue, private API, existing VPC', () => {
  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack();
  const publicApi = false;
  const queueName = 'custom-queue-name.fifo';

  const existingVpc = defaults.getTestVpc(stack, publicApi);

  const existingQueue = new sqs.Queue(stack, 'MyQueue', {
    queueName,
    fifo: true
  });

  new FargateToSqs(stack, 'test-construct', {
    publicApi,
    existingVpc,
    existingQueueObj: existingQueue,
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

  template.hasResourceProperties("AWS::SQS::Queue", {
    QueueName: queueName,
    FifoQueue: true
  });

  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });

  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "sqs:SendMessage",
            "sqs:GetQueueAttributes",
            "sqs:GetQueueUrl"
          ],
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "MyQueueE6CA6235",
              "Arn"
            ]
          }
        },
      ],
    }
  });

  // Confirm we created an Isolated VPC
  defaults.expectNonexistence(stack, 'AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::SQS::Queue', 1);
  template.resourceCountIs('AWS::ECS::Service', 1);
});

test('Existing service/new queue, public API, existing VPC', () => {
  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack();
  const publicApi = true;
  const serviceName = 'custom-name';
  const customVariableName = 'CUSTOM_NAME';
  const customArnName = 'CUSTOM_ARN_NAME';
  const queueName = 'testQueue';
  const dlqName = 'dlqQueue';

  const existingVpc = defaults.getTestVpc(stack);

  const createFargateServiceResponse = defaults.CreateFargateService(stack, 'test', {
    constructVpc: existingVpc,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clientFargateServiceProps: { serviceName }
  });

  new FargateToSqs(stack, 'test-construct', {
    publicApi,
    existingFargateServiceObject: createFargateServiceResponse.service,
    existingContainerDefinitionObject: createFargateServiceResponse.containerDefinition,
    existingVpc,
    queueUrlEnvironmentVariableName: customVariableName,
    queueArnEnvironmentVariableName: customArnName,
    queueProps: {
      queueName
    },
    deadLetterQueueProps: {
      queueName: dlqName
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
            Name: customArnName,
            Value: {
              "Fn::GetAtt": [
                "testconstructtestconstructqueue6D12C99B",
                "Arn"
              ]
            }
          },
          {
            Name: customVariableName,
            Value: {
              Ref: "testconstructtestconstructqueue6D12C99B"
            }
          },
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
  template.hasResourceProperties("AWS::SQS::Queue", {
    QueueName: queueName
  });

  template.hasResourceProperties("AWS::SQS::Queue", {
    QueueName: dlqName
  });

  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });

  // Confirm we created a Public/Private VPC
  template.hasResourceProperties('AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::SQS::Queue', 2);
  template.resourceCountIs('AWS::ECS::Service', 1);
});

// Test existing service/existing queue, private API, new VPC
test('Existing service/existing queue, private API, existing VPC', () => {
  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack();
  const publicApi = false;
  const serviceName = 'custom-name';
  const queueName = 'custom-queue-name';

  const existingVpc = defaults.getTestVpc(stack, publicApi);

  const createFargateServiceResponse = defaults.CreateFargateService(stack, 'test', {
    constructVpc: existingVpc,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clientFargateServiceProps: { serviceName }
  });

  const existingQueue = new sqs.Queue(stack, 'MyQueue', {
    queueName
  });

  new FargateToSqs(stack, 'test-construct', {
    publicApi,
    existingFargateServiceObject: createFargateServiceResponse.service,
    existingContainerDefinitionObject: createFargateServiceResponse.containerDefinition,
    existingVpc,
    existingQueueObj: existingQueue
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
            Name: "SQS_QUEUE_ARN",
            Value: {
              "Fn::GetAtt": [
                "MyQueueE6CA6235",
                "Arn"
              ]
            }
          },
          {
            Name: "SQS_QUEUE_URL",
            Value: {
              Ref: "MyQueueE6CA6235"
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

  template.hasResourceProperties("AWS::SQS::Queue", {
    QueueName: queueName
  });
  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });

  // Confirm we created an Isolated VPC
  defaults.expectNonexistence(stack, 'AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::SQS::Queue', 1);
  template.resourceCountIs('AWS::ECS::Service', 1);
});

test('Test bad queuePermissions', () => {

  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack();
  const publicApi = false;

  const props = {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { ipAddresses: ec2.IpAddresses.cidr('172.0.0.0/16') },
    deployDeadLetterQueue: false,
    queuePermissions: ['Reed'],
  };

  const app = () => {
    new FargateToSqs(stack, 'test-construct', props);
  };

  expect(app).toThrowError('Invalid queue permission submitted - Reed');
});

test('Queue is encrypted with imported CMK when set on encryptionKey prop', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const cmk = new kms.Key(stack, 'cmk');
  new FargateToSqs(stack, 'test-construct', {
    publicApi: true,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    encryptionKey: cmk
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "cmk01DE03DA",
        "Arn"
      ]
    }
  });
});

test('Queue is encrypted with imported CMK when set on queueProps.encryptionMasterKey prop', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  const cmk = new kms.Key(stack, 'cmk');
  new FargateToSqs(stack, 'test-construct', {
    publicApi: true,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    queueProps: {
      encryptionMasterKey: cmk
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "cmk01DE03DA",
        "Arn"
      ]
    }
  });
});

test('Queue is encrypted with provided encryptionKeyProps', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  new FargateToSqs(stack, 'test-construct', {
    publicApi: true,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    encryptionKeyProps: {
      alias: 'new-key-alias-from-props'
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: "alias/aws/sqs"
  });

  template.hasResourceProperties('AWS::KMS::Alias', {
    AliasName: 'alias/new-key-alias-from-props',
    TargetKeyId: {
      'Fn::GetAtt': [
        'testconstructtestconstructqueueKey3FE2A0B7',
        'Arn'
      ]
    }
  });
});

test('Queue is encrypted with SQS-managed KMS key when no other encryption properties are set', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  new FargateToSqs(stack, 'test-construct', {
    publicApi: true,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: "alias/aws/sqs"
  });
});

test('Queue is encrypted with customer managed KMS Key when enable encryption flag is true', () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: 'us-east-1' },
  });

  new FargateToSqs(stack, 'test-construct', {
    publicApi: true,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    enableEncryptionWithCustomerManagedKey: true
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "testconstructtestconstructqueueKey3FE2A0B7",
        "Arn"
      ]
    }
  });
});

test('Confirm CheckSqsProps is called', () => {

  // An environment with region is required to enable logging on an ALB
  const stack = new cdk.Stack();
  const publicApi = false;

  const props = {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { ipAddresses: ec2.IpAddresses.cidr('172.0.0.0/16') },
    deployDeadLetterQueue: false,
    queueProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    },
    existingQueueObj: new sqs.Queue(stack, 'test', {})
  };

  const app = () => {
    new FargateToSqs(stack, 'test-fargate-sqs', props);
  };
  expect(app).toThrowError("Error - Either provide queueProps or existingQueueObj, but not both.\n");
});

test('Confirm that CheckVpcProps was called', () => {
  const stack = new cdk.Stack();
  const publicApi = true;
  const clusterName = "custom-cluster-name";
  const containerName = "custom-container-name";
  const serviceName = "custom-service-name";
  const familyName = "custom-family-name";

  const props: FargateToSqsProps = {
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
    new FargateToSqs(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide an existingVpc or some combination of deployVpc and vpcProps, but not both.\n');
});
