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
import { FargateToSsmstringparameter } from "../lib";
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as ecs from 'aws-cdk-lib/aws-ecs';

const allowedPattern = '.*';
const description = 'The value Foo';
const parameterName = 'FooParameter';
const stringValue = 'Foo';
const clusterName = "custom-cluster-name";
const containerName = "custom-container-name";
const serviceName = "custom-service-name";
const familyName = "family-name";
const customName = 'custom-name';

test('New service/new parameter store, public API, new VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = true;

  const construct = new FargateToSsmstringparameter(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { cidr: '172.0.0.0/16' },
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    stringParameterProps: {
      parameterName,
      stringValue
    },
  });

  expect(construct.vpc !== null);
  expect(construct.service !== null);
  expect(construct.container !== null);
  expect(construct.stringParameter !== null);

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

  expect(stack).toHaveResourceLike("AWS::SSM::Parameter", {
    Name: parameterName,
    Value: stringValue
  });

  expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "ssm:DescribeParameters",
            "ssm:GetParameters",
            "ssm:GetParameter",
            "ssm:GetParameterHistory"
          ],
          Effect: "Allow",
          Resource: {
            "Fn::Join": [
              "",
              [
                "arn:",
                {
                  Ref: "AWS::Partition"
                },
                ":ssm:",
                {
                  Ref: "AWS::Region"
                },
                ":",
                {
                  Ref: "AWS::AccountId"
                },
                ":parameter/",
                {
                  Ref: "testconstructstringParameter4A9E7765"
                }
              ]
            ]
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
          ".ssm"
        ]
      ]
    }
  });

  // Confirm we created a Public/Private VPC
  expect(stack).toHaveResourceLike('AWS::EC2::InternetGateway', {});
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::SSM::Parameter', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
});

test('New service/new parameter store, private API, new VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = false;

  new FargateToSsmstringparameter(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { cidr: '172.0.0.0/16' },
    stringParameterProps: {
      parameterName,
      stringValue
    },
    stringParameterPermissions: 'readwrite',
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
            Name: "SSM_STRING_PARAMETER_NAME",
            Value: {
              Ref: "testconstructstringParameter4A9E7765"
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

  expect(stack).toHaveResourceLike("AWS::SSM::Parameter", {
    Name: parameterName,
    Value: stringValue
  });

  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: '172.0.0.0/16'
  });

  expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "ssm:DescribeParameters",
            "ssm:GetParameters",
            "ssm:GetParameter",
            "ssm:GetParameterHistory"
          ],
          Effect: "Allow",
          Resource: {
            "Fn::Join": [
              "",
              [
                "arn:",
                {
                  Ref: "AWS::Partition"
                },
                ":ssm:",
                {
                  Ref: "AWS::Region"
                },
                ":",
                {
                  Ref: "AWS::AccountId"
                },
                ":parameter/",
                {
                  Ref: "testconstructstringParameter4A9E7765"
                }
              ]
            ]
          }
        },
        {
          Action: "ssm:PutParameter",
          Effect: "Allow",
          Resource: {
            "Fn::Join": [
              "",
              [
                "arn:",
                {
                  Ref: "AWS::Partition"
                },
                ":ssm:",
                {
                  Ref: "AWS::Region"
                },
                ":",
                {
                  Ref: "AWS::AccountId"
                },
                ":parameter/",
                {
                  Ref: "testconstructstringParameter4A9E7765"
                }
              ]
            ]
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
          ".ssm"
        ]
      ]
    }
  });

  // Confirm we created an Isolated VPC
  expect(stack).not.toHaveResourceLike('AWS::EC2::InternetGateway', {});
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::SSM::Parameter', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
});

test('New service/existing parameter store, private API, existing VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = false;

  const existingVpc = defaults.getTestVpc(stack, publicApi);

  const existingParameterStore = createSsmParameterStore(stack);

  new FargateToSsmstringparameter(stack, 'test-construct', {
    publicApi,
    existingVpc,
    existingStringParameterObj: existingParameterStore,
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
            Name: "SSM_STRING_PARAMETER_NAME",
            Value: {
              Ref: "Parameter9E1B4FBA"
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

  expect(stack).toHaveResourceLike("AWS::SSM::Parameter", {
    Name: parameterName,
    Value: stringValue
  });
  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });

  expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "ssm:DescribeParameters",
            "ssm:GetParameters",
            "ssm:GetParameter",
            "ssm:GetParameterHistory"
          ],
          Effect: "Allow",
          Resource: {
            "Fn::Join": [
              "",
              [
                "arn:",
                {
                  Ref: "AWS::Partition"
                },
                ":ssm:",
                {
                  Ref: "AWS::Region"
                },
                ":",
                {
                  Ref: "AWS::AccountId"
                },
                ":parameter/",
                {
                  Ref: "Parameter9E1B4FBA"
                }
              ]
            ]
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
          ".ssm"
        ]
      ]
    }
  });

  // Confirm we created an Isolated VPC
  expect(stack).not.toHaveResourceLike('AWS::EC2::InternetGateway', {});
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
  expect(stack).toCountResources('AWS::SSM::Parameter', 1);
});

test('Existing service/new parameter store, public API, existing VPC', () => {
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

  new FargateToSsmstringparameter(stack, 'test-construct', {
    publicApi,
    existingFargateServiceObject: testService,
    existingContainerDefinitionObject: testContainer,
    existingVpc,
    stringParameterEnvironmentVariableName: customName,
    stringParameterProps: {
      parameterName,
      stringValue
    },
    stringParameterPermissions: 'readwrite'
  });

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    ServiceName: serviceName
  });

  expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      {
        Environment: [
          {
            Name: customName,
            Value: {
              Ref: "testconstructstringParameter4A9E7765"
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

  expect(stack).toHaveResourceLike("AWS::SSM::Parameter", {
    Name: parameterName,
    Value: stringValue
  });

  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });

  expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "ssm:DescribeParameters",
            "ssm:GetParameters",
            "ssm:GetParameter",
            "ssm:GetParameterHistory"
          ],
          Effect: "Allow",
          Resource: {
            "Fn::Join": [
              "",
              [
                "arn:",
                {
                  Ref: "AWS::Partition"
                },
                ":ssm:",
                {
                  Ref: "AWS::Region"
                },
                ":",
                {
                  Ref: "AWS::AccountId"
                },
                ":parameter/",
                {
                  Ref: "testconstructstringParameter4A9E7765"
                }
              ]
            ]
          }
        },
        {
          Action: "ssm:PutParameter",
          Effect: "Allow",
          Resource: {
            "Fn::Join": [
              "",
              [
                "arn:",
                {
                  Ref: "AWS::Partition"
                },
                ":ssm:",
                {
                  Ref: "AWS::Region"
                },
                ":",
                {
                  Ref: "AWS::AccountId"
                },
                ":parameter/",
                {
                  Ref: "testconstructstringParameter4A9E7765"
                }
              ]
            ]
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
          ".ssm"
        ]
      ]
    }
  });

  // Confirm we created a Public/Private VPC
  expect(stack).toHaveResourceLike('AWS::EC2::InternetGateway', {});
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
  expect(stack).toCountResources('AWS::SSM::Parameter', 1);
});

test('Existing service/existing parameter store, private API, existing VPC', () => {
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

  const existingParameterStore = createSsmParameterStore(stack);

  new FargateToSsmstringparameter(stack, 'test-construct', {
    publicApi,
    existingFargateServiceObject: testService,
    existingContainerDefinitionObject: testContainer,
    existingVpc,
    existingStringParameterObj: existingParameterStore
  });

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    ServiceName: serviceName,
  });

  expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      {
        Environment: [
          {
            Name: "SSM_STRING_PARAMETER_NAME",
            Value: {
              Ref: "Parameter9E1B4FBA"
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

  expect(stack).toHaveResourceLike("AWS::SSM::Parameter", {
    Name: parameterName,
    Value: stringValue
  });
  expect(stack).toHaveResourceLike("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });

  expect(stack).toHaveResourceLike("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "ssm:DescribeParameters",
            "ssm:GetParameters",
            "ssm:GetParameter",
            "ssm:GetParameterHistory"
          ],
          Effect: "Allow",
          Resource: {
            "Fn::Join": [
              "",
              [
                "arn:",
                {
                  Ref: "AWS::Partition"
                },
                ":ssm:",
                {
                  Ref: "AWS::Region"
                },
                ":",
                {
                  Ref: "AWS::AccountId"
                },
                ":parameter/",
                {
                  Ref: "Parameter9E1B4FBA"
                }
              ]
            ]
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
          ".ssm"
        ]
      ]
    }
  });

  // Confirm we created an Isolated VPC
  expect(stack).not.toHaveResourceLike('AWS::EC2::InternetGateway', {});
  expect(stack).toCountResources('AWS::EC2::VPC', 1);
  expect(stack).toCountResources('AWS::ECS::Service', 1);
  expect(stack).toCountResources('AWS::SSM::Parameter', 1);
});

test('Test error invalid string parameter permission', () => {
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

  const existingStringParameterObj = createSsmParameterStore(stack);

  const app = () => {
    new FargateToSsmstringparameter(stack, 'test-construct', {
      publicApi,
      existingFargateServiceObject: testService,
      existingContainerDefinitionObject: testContainer,
      existingVpc,
      stringParameterPermissions: 'reed',
      existingStringParameterObj
    });
  };

  expect(app).toThrowError('Invalid stringParameterPermissions submitted - REED');
});

test('Test error no existing object or prop provided', () => {
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

  const app = () => {
    new FargateToSsmstringparameter(stack, 'test-construct', {
      publicApi,
      existingFargateServiceObject: testService,
      existingContainerDefinitionObject: testContainer,
      existingVpc,
    });
  };

  expect(app).toThrowError('existingStringParameterObj or stringParameterProps needs to be provided.');
});

function createSsmParameterStore(stack: cdk.Stack) {
  return new ssm.StringParameter(stack, 'Parameter', {
    allowedPattern,
    description,
    parameterName,
    stringValue,
  });
}