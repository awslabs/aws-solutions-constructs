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
import { FargateToSecretsmanager } from "../lib";
import * as ecs from '@aws-cdk/aws-ecs';
import { buildSecretsManagerSecret } from '@aws-solutions-constructs/core';

const clusterName = "custom-cluster-name";
const containerName = "custom-container-name";
const serviceName = "custom-service-name";
const familyName = "family-name";
const secretName = 'custom-name';
const envName = 'CUSTOM_SECRET_ARN';

test('New service/new secret, public API, new VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = true;

  const construct = new FargateToSecretsmanager(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { cidr: '172.0.0.0/16' },
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    secretProps: {
      secretName
    },
  });

  expect(construct.vpc !== null);
  expect(construct.service !== null);
  expect(construct.container !== null);
  expect(construct.secret !== null);

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

  expect(stack).toHaveResourceLike("AWS::SecretsManager::Secret", {
    Name: secretName
  });

  expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "secretsmanager:GetSecretValue",
            "secretsmanager:DescribeSecret"
          ],
          Effect: "Allow",
          Resource: {
            Ref: "testconstructsecret1A43460A"
          }
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
          ".secretsmanager"
        ]
      ]
    }
  });

  // Confirm we created a Public/Private VPC
  expect(stack).toHaveResourceLike('AWS::EC2::InternetGateway', {});
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::SecretsManager::Secret', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
});

test('New service/new secret, private API, new VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = false;

  new FargateToSecretsmanager(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { cidr: '172.0.0.0/16' },
    secretProps: {
      secretName
    },
    grantWriteAccess: 'readwrite',
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

  expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      {
        Environment: [
          {
            Name: "SECRET_ARN",
            Value: {
              Ref: "testconstructsecret1A43460A"
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
        Name: "test-construct-container",
        PortMappings: [
          {
            ContainerPort: 8080,
            Protocol: "tcp"
          }
        ]
      }
    ]
  });

  expect(stack).toHaveResourceLike("AWS::SecretsManager::Secret", {
    Name: secretName,
  });

  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: '172.0.0.0/16'
  });

  expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "secretsmanager:GetSecretValue",
            "secretsmanager:DescribeSecret"
          ],
          Effect: "Allow",
          Resource: {
            Ref: "testconstructsecret1A43460A"
          }
        },
        {
          Action: [
            "secretsmanager:PutSecretValue",
            "secretsmanager:UpdateSecret"
          ],
          Effect: "Allow",
          Resource: {
            Ref: "testconstructsecret1A43460A"
          }
        }
      ],
      Version: "2012-10-17"
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
          ".secretsmanager"
        ]
      ]
    }
  });

  // Confirm we created an Isolated VPC
  expect(stack).not.toHaveResourceLike('AWS::EC2::InternetGateway', {});
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::SecretsManager::Secret', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
});

test('New service/existing secret, private API, existing VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = false;

  const existingVpc = defaults.getTestVpc(stack, publicApi);

  const existingSecretObj = defaults.buildSecretsManagerSecret(stack, 'secret', {
    secretName
  });

  new FargateToSecretsmanager(stack, 'test-construct', {
    publicApi,
    existingVpc,
    existingSecretObj,
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

  expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      {
        Environment: [
          {
            Name: "SECRET_ARN",
            Value: {
              Ref: "secret4DA88516"
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
        Name: "test-construct-container",
        PortMappings: [
          {
            ContainerPort: 8080,
            Protocol: "tcp"
          }
        ]
      }
    ]
  });

  expect(stack).toHaveResourceLike("AWS::SecretsManager::Secret", {
    Name: secretName
  });
  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });

  expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "secretsmanager:GetSecretValue",
            "secretsmanager:DescribeSecret"
          ],
          Effect: "Allow",
          Resource: {
            Ref: "secret4DA88516"
          }
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
          ".secretsmanager"
        ]
      ]
    }
  });

  // Confirm we created an Isolated VPC
  expect(stack).not.toHaveResourceLike('AWS::EC2::InternetGateway', {});
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
  expect(stack).toCountResources('AWS::SecretsManager::Secret', 1);
});

test('Existing service/new secret, public API, existing VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = true;

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

  new FargateToSecretsmanager(stack, 'test-construct', {
    publicApi,
    existingFargateServiceObject: testService,
    existingContainerDefinitionObject: testContainer,
    existingVpc,
    secretEnvironmentVariableName: envName,
    secretProps: {
      secretName,
    },
    grantWriteAccess: 'readwrite'
  });

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    ServiceName: serviceName
  });

  expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      {
        Environment: [
          {
            Name: envName,
            Value: {
              Ref: "testconstructsecret1A43460A"
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

  expect(stack).toHaveResourceLike("AWS::SecretsManager::Secret", {
    Name: secretName,
  });

  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });

  expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "secretsmanager:GetSecretValue",
            "secretsmanager:DescribeSecret"
          ],
          Effect: "Allow",
          Resource: {
            Ref: "testconstructsecret1A43460A"
          }
        },
        {
          Action: [
            "secretsmanager:PutSecretValue",
            "secretsmanager:UpdateSecret"
          ],
          Effect: "Allow",
          Resource: {
            Ref: "testconstructsecret1A43460A"
          }
        }
      ],
      Version: "2012-10-17"
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
          ".secretsmanager"
        ]
      ]
    }
  });

  // Confirm we created a Public/Private VPC
  expect(stack).toHaveResourceLike('AWS::EC2::InternetGateway', {});
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
  expect(stack).toCountResources('AWS::SecretsManager::Secret', 1);
});

test('Existing service/existing secret, private API, existing VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = false;

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

  const existingSecretObj = defaults.buildSecretsManagerSecret(stack, 'secret', {
    secretName
  });

  new FargateToSecretsmanager(stack, 'test-construct', {
    publicApi,
    existingFargateServiceObject: testService,
    existingContainerDefinitionObject: testContainer,
    existingVpc,
    existingSecretObj
  });

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    ServiceName: serviceName,
  });

  expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      {
        Environment: [
          {
            Name: "SECRET_ARN",
            Value: {
              Ref: "secret4DA88516"
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

  expect(stack).toHaveResourceLike("AWS::SecretsManager::Secret", {
    Name: secretName,
  });

  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });

  expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "secretsmanager:GetSecretValue",
            "secretsmanager:DescribeSecret"
          ],
          Effect: "Allow",
          Resource: {
            Ref: "secret4DA88516"
          }
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
          ".secretsmanager"
        ]
      ]
    }
  });

  // Confirm we created an Isolated VPC
  expect(stack).not.toHaveResourceLike('AWS::EC2::InternetGateway', {});
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
  expect(stack).toCountResources('AWS::SecretsManager::Secret', 1);
});

test('Test error invalid secret permission', () => {
  const stack = new cdk.Stack();
  const publicApi = false;

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

  const existingSecretObj = buildSecretsManagerSecret(stack, 'secret', {});

  const app = () => {
    new FargateToSecretsmanager(stack, 'test-construct', {
      publicApi,
      existingFargateServiceObject: testService,
      existingContainerDefinitionObject: testContainer,
      existingVpc,
      grantWriteAccess: 'reed',
      existingSecretObj
    });
  };

  expect(app).toThrowError('Invalid grantWriteAccess submitted - REED');
});