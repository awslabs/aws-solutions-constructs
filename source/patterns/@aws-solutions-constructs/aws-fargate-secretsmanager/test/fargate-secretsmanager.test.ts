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
import { FargateToSecretsmanager, FargateToSecretsmanagerProps } from "../lib";
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as secrets from 'aws-cdk-lib/aws-secretsmanager';
import { buildSecretsManagerSecret } from '@aws-solutions-constructs/core';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

const clusterName = "custom-cluster-name";
const containerName = "custom-container-name";
const serviceName = "custom-service-name";
const familyName = "family-name";
const secretName = 'custom-name';
const envName = 'CUSTOM_SECRET_ARN';
const cidr = '172.0.0.0/16';

test('New service/new secret, public API, new VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = true;

  const construct = new FargateToSecretsmanager(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { ipAddresses: ec2.IpAddresses.cidr(cidr) },
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    secretProps: {
      secretName
    },
  });

  expect(construct.vpc).toBeDefined();
  expect(construct.service).toBeDefined();
  expect(construct.container).toBeDefined();
  expect(construct.secret).toBeDefined();

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

  template.hasResourceProperties("AWS::SecretsManager::Secret", {
    Name: secretName
  });

  template.hasResourceProperties("AWS::IAM::Policy", {
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
    CidrBlock: cidr
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
          ".secretsmanager"
        ]
      ]
    }
  });

  // Confirm we created a Public/Private VPC
  template.hasResourceProperties('AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::SecretsManager::Secret', 1);
  template.resourceCountIs('AWS::ECS::Service', 1);
});

test('New service/new secret, private API, new VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = false;

  new FargateToSecretsmanager(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { ipAddresses: ec2.IpAddresses.cidr(cidr) },
    secretProps: {
      secretName
    },
    grantWriteAccess: 'readwrite',
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

  template.hasResourceProperties("AWS::ECS::TaskDefinition", {
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

  template.hasResourceProperties("AWS::SecretsManager::Secret", {
    Name: secretName,
  });

  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: '172.0.0.0/16'
  });

  template.hasResourceProperties("AWS::IAM::Policy", {
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
            "secretsmanager:UpdateSecret",
            "secretsmanager:UpdateSecretVersionStage"
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

  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
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
  defaults.expectNonexistence(stack, 'AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::SecretsManager::Secret', 1);
  template.resourceCountIs('AWS::ECS::Service', 1);
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

  template.hasResourceProperties("AWS::ECS::TaskDefinition", {
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

  template.hasResourceProperties("AWS::SecretsManager::Secret", {
    Name: secretName
  });
  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });

  template.hasResourceProperties("AWS::IAM::Policy", {
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

  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
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
  defaults.expectNonexistence(stack, 'AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::ECS::Service', 1);
  template.resourceCountIs('AWS::SecretsManager::Secret', 1);
});

test('Existing service/new secret, public API, existing VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = true;

  const existingVpc = defaults.getTestVpc(stack);

  const createFargateServiceResponse = defaults.CreateFargateService(stack, 'test', {
    constructVpc: existingVpc,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clientFargateServiceProps: {
      serviceName
    }
  });

  new FargateToSecretsmanager(stack, 'test-construct', {
    publicApi,
    existingFargateServiceObject: createFargateServiceResponse.service,
    existingContainerDefinitionObject: createFargateServiceResponse.containerDefinition,
    existingVpc,
    secretEnvironmentVariableName: envName,
    secretProps: {
      secretName,
    },
    grantWriteAccess: 'readwrite'
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

  template.hasResourceProperties("AWS::SecretsManager::Secret", {
    Name: secretName,
  });

  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });

  template.hasResourceProperties("AWS::IAM::Policy", {
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
            "secretsmanager:UpdateSecret",
            "secretsmanager:UpdateSecretVersionStage"
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

  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
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
  template.hasResourceProperties('AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::ECS::Service', 1);
  template.resourceCountIs('AWS::SecretsManager::Secret', 1);
});

test('Existing service/existing secret, private API, existing VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = false;

  const existingVpc = defaults.getTestVpc(stack, publicApi);

  const createFargateServiceResponse = defaults.CreateFargateService(stack, 'test', {
    constructVpc: existingVpc,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clientFargateServiceProps: {
      serviceName
    }
  });

  const existingSecretObj = defaults.buildSecretsManagerSecret(stack, 'secret', {
    secretName
  });

  new FargateToSecretsmanager(stack, 'test-construct', {
    publicApi,
    existingFargateServiceObject: createFargateServiceResponse.service,
    existingContainerDefinitionObject: createFargateServiceResponse.containerDefinition,
    existingVpc,
    existingSecretObj
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

  template.hasResourceProperties("AWS::SecretsManager::Secret", {
    Name: secretName,
  });

  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });

  template.hasResourceProperties("AWS::IAM::Policy", {
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

  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
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
  defaults.expectNonexistence(stack, 'AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::ECS::Service', 1);
  template.resourceCountIs('AWS::SecretsManager::Secret', 1);
});

test('Test error invalid secret permission', () => {
  const stack = new cdk.Stack();
  const publicApi = false;

  const existingVpc = defaults.getTestVpc(stack, publicApi);

  const createFargateServiceResponse = defaults.CreateFargateService(stack, 'test', {
    constructVpc: existingVpc,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clientFargateServiceProps: {
      serviceName
    }
  });

  const existingSecretObj = buildSecretsManagerSecret(stack, 'secret', {});

  const app = () => {
    new FargateToSecretsmanager(stack, 'test-construct', {
      publicApi,
      existingFargateServiceObject: createFargateServiceResponse.service,
      existingContainerDefinitionObject: createFargateServiceResponse.containerDefinition,
      existingVpc,
      grantWriteAccess: 'reed',
      existingSecretObj
    });
  };

  expect(app).toThrowError('Invalid grantWriteAccess submitted - REED');
});

test('Confirm that CheckVpcProps was called', () => {
  const stack = new cdk.Stack();
  const publicApi = true;

  const props: FargateToSecretsmanagerProps = {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    secretProps: {
      secretName
    },
    existingVpc: defaults.getTestVpc(stack),
    vpcProps: {  },
  };

  const app = () => {
    new FargateToSecretsmanager(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide an existingVpc or some combination of deployVpc and vpcProps, but not both.\n');
});

test('Confirm that CheckSecretsManagerProps was called', () => {
  const stack = new cdk.Stack();
  const publicApi = true;

  const props: FargateToSecretsmanagerProps = {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    secretProps: {
      secretName
    },
    existingSecretObj: new secrets.Secret(stack, 'test', {}),
    vpcProps: {  },
  };

  const app = () => {
    new FargateToSecretsmanager(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide secretProps or existingSecretObj, but not both.\n');
});
