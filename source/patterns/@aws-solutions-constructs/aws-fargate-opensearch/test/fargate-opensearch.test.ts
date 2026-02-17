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
import { FargateToOpenSearch,  FargateToOpenSearchProps } from "../lib";
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

const DOMAIN_NAME = "solutions-construct-domain";
const COGNITO_DOMAIN_NAME = "cogn-solutions-construct-domain";
const CLUSTER_NAME = "custom-cluster-name";
const CONTAINER_NAME = "custom-container-name";
const SERVICE_NAME = "custom-service-name";
const FAMILY_NAME = "family-name";
const CUSTOM_ENV_NAME = 'CUSTOM_DOMAIN_ENDPOINT';

const deployStackWithNewResources = (stack: cdk.Stack, publicApi: boolean) => {
  return new FargateToOpenSearch(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { ipAddresses: ec2.IpAddresses.cidr('172.0.0.0/16') },
    clusterProps: { clusterName: CLUSTER_NAME },
    containerDefinitionProps: { containerName: CONTAINER_NAME },
    fargateTaskDefinitionProps: { family: FAMILY_NAME },
    fargateServiceProps: { serviceName: SERVICE_NAME },
    openSearchDomainName: DOMAIN_NAME,
  });
};

test('Test domain and cognito domain name', () => {
  const stack = new cdk.Stack();
  const publicApi = true;

  new FargateToOpenSearch(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { ipAddresses: ec2.IpAddresses.cidr('172.0.0.0/16') },
    clusterProps: { clusterName: CLUSTER_NAME },
    containerDefinitionProps: { containerName: CONTAINER_NAME },
    fargateTaskDefinitionProps: { family: FAMILY_NAME },
    fargateServiceProps: { serviceName: SERVICE_NAME },
    openSearchDomainName: DOMAIN_NAME,
    cognitoDomainName: COGNITO_DOMAIN_NAME
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::OpenSearchService::Domain", {
    DomainName: DOMAIN_NAME
  });

  template.hasResourceProperties("AWS::Cognito::UserPoolDomain", {
    Domain: COGNITO_DOMAIN_NAME
  });
});

test('Check construct properties', () => {
  const stack = new cdk.Stack();
  const publicApi = true;

  const construct = deployStackWithNewResources(stack, publicApi);

  expect(construct.vpc).toBeDefined();
  expect(construct.service).toBeDefined();
  expect(construct.container).toBeDefined();
  expect(construct.userPool).toBeDefined();
  expect(construct.userPoolClient).toBeDefined();
  expect(construct.identityPool).toBeDefined();
  expect(construct.openSearchDomain).toBeDefined();
  expect(construct.openSearchRole).toBeDefined();
  expect(construct.cloudWatchAlarms).toBeDefined();
});

test('Test cognito dashboard role IAM policy', () => {
  const stack = new cdk.Stack();
  const publicApi = true;

  deployStackWithNewResources(stack, publicApi);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "cognito-idp:DescribeUserPool",
            "cognito-idp:CreateUserPoolClient",
            "cognito-idp:DeleteUserPoolClient",
            "cognito-idp:DescribeUserPoolClient",
            "cognito-idp:AdminInitiateAuth",
            "cognito-idp:AdminUserGlobalSignOut",
            "cognito-idp:ListUserPoolClients",
            "cognito-identity:DescribeIdentityPool",
            "cognito-identity:UpdateIdentityPool",
            "cognito-identity:SetIdentityPoolRoles",
            "cognito-identity:GetIdentityPoolRoles",
            "es:UpdateDomainConfig"
          ],
          Effect: "Allow",
          Resource: [
            {
              "Fn::GetAtt": [
                "testconstructCognitoUserPoolA4991355",
                "Arn"
              ]
            },
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition"
                  },
                  ":cognito-identity:",
                  {
                    Ref: "AWS::Region"
                  },
                  ":",
                  {
                    Ref: "AWS::AccountId"
                  },
                  ":identitypool/",
                  {
                    Ref: "testconstructCognitoIdentityPool51EFD08D"
                  }
                ]
              ]
            },
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition"
                  },
                  ":es:",
                  {
                    Ref: "AWS::Region"
                  },
                  ":",
                  {
                    Ref: "AWS::AccountId"
                  },
                  ":domain/solutions-construct-domain"
                ]
              ]
            }
          ]
        },
        {
          Action: "iam:PassRole",
          Condition: {
            StringLike: {
              "iam:PassedToService": "cognito-identity.amazonaws.com"
            }
          },
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "testconstructCognitoDashboardConfigureRoleFA66EB70",
              "Arn"
            ]
          }
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test('Test custom environment variable name', () => {
  const stack = new cdk.Stack();
  const publicApi = true;

  new FargateToOpenSearch(stack, 'test-construct', {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    vpcProps: { ipAddresses: ec2.IpAddresses.cidr('172.0.0.0/16') },
    clusterProps: { clusterName: CLUSTER_NAME },
    containerDefinitionProps: { containerName:  CONTAINER_NAME },
    fargateTaskDefinitionProps: { family: FAMILY_NAME },
    fargateServiceProps: { serviceName: SERVICE_NAME },
    openSearchDomainName: DOMAIN_NAME,
    domainEndpointEnvironmentVariableName: CUSTOM_ENV_NAME
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      {
        Environment: [
          {
            Name: CUSTOM_ENV_NAME,
            Value: {
              "Fn::GetAtt": [
                "testconstructOpenSearchDomainD2A5B104",
                "DomainEndpoint"
              ]
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
        Name: CONTAINER_NAME,
        PortMappings: [
          {
            ContainerPort: 8080,
            Protocol: "tcp"
          }
        ]
      }
    ],
    Family: FAMILY_NAME
  });

});

test('New service/new domain, public API, new VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = true;

  deployStackWithNewResources(stack, publicApi);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ECS::Service", {
    LaunchType: 'FARGATE',
    DesiredCount: 2,
    DeploymentConfiguration: {
      MaximumPercent: 150,
      MinimumHealthyPercent: 75
    },
    PlatformVersion: ecs.FargatePlatformVersion.LATEST,
    ServiceName: SERVICE_NAME
  });

  template.hasResourceProperties("AWS::OpenSearchService::Domain", {
    DomainName: DOMAIN_NAME
  });

  template.hasResourceProperties("AWS::ECS::Service", {
    LaunchType: 'FARGATE',
    DesiredCount: 2,
    DeploymentConfiguration: {
      MaximumPercent: 150,
      MinimumHealthyPercent: 75
    },
    PlatformVersion: ecs.FargatePlatformVersion.LATEST,
  });

  template.hasResourceProperties("AWS::ECS::Cluster", {
    ClusterName: CLUSTER_NAME
  });

  template.hasResourceProperties("AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      {
        Environment: [
          {
            Name: "DOMAIN_ENDPOINT",
            Value: {
              "Fn::GetAtt": [
                "testconstructOpenSearchDomainD2A5B104",
                "DomainEndpoint"
              ]
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
        Name: "custom-container-name",
        PortMappings: [
          {
            ContainerPort: 8080,
            Protocol: "tcp"
          }
        ]
      }
    ],
    Family: FAMILY_NAME
  });

  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: '172.0.0.0/16'
  });

  // Confirm we created a Public/Private VPC
  template.hasResourceProperties('AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::OpenSearchService::Domain', 1);
  template.resourceCountIs('AWS::ECS::Service', 1);
});

test('New service/new domain, private API, new VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = false;

  deployStackWithNewResources(stack, publicApi);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::OpenSearchService::Domain", {
    DomainName: DOMAIN_NAME
  });

  template.hasResourceProperties("AWS::ECS::Service", {
    LaunchType: 'FARGATE',
    DesiredCount: 2,
    DeploymentConfiguration: {
      MaximumPercent: 150,
      MinimumHealthyPercent: 75
    },
    PlatformVersion: ecs.FargatePlatformVersion.LATEST,
    ServiceName: SERVICE_NAME
  });

  template.hasResourceProperties("AWS::ECS::Cluster", {
    ClusterName: CLUSTER_NAME
  });

  template.hasResourceProperties("AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      {
        Environment: [
          {
            Name: "DOMAIN_ENDPOINT",
            Value: {
              "Fn::GetAtt": [
                "testconstructOpenSearchDomainD2A5B104",
                "DomainEndpoint"
              ]
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
        Name: "custom-container-name",
        PortMappings: [
          {
            ContainerPort: 8080,
            Protocol: "tcp"
          }
        ]
      }
    ],
    Family: FAMILY_NAME
  });

  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: '172.0.0.0/16'
  });

  // Confirm we created an Isolated VPC
  defaults.expectNonexistence(stack, 'AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::OpenSearchService::Domain', 1);
  template.resourceCountIs('AWS::ECS::Service', 1);
});

test('New service/new domain, public API, existing VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = true;
  const existingVpc = defaults.getTestVpc(stack, publicApi);

  new FargateToOpenSearch(stack, 'test-construct', {
    publicApi,
    existingVpc,
    openSearchDomainName: DOMAIN_NAME,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::OpenSearchService::Domain", {
    DomainName: DOMAIN_NAME
  });

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
            Name: "DOMAIN_ENDPOINT",
            Value: {
              "Fn::GetAtt": [
                "testconstructOpenSearchDomainD2A5B104",
                "DomainEndpoint"
              ]
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
        Name: "test-construct-container",
        PortMappings: [
          {
            ContainerPort: 8080,
            Protocol: "tcp"
          }
        ]
      }
    ],
  });

  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });

  // Confirm we created a Public/Private VPC
  template.hasResourceProperties('AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::ECS::Service', 1);
  template.resourceCountIs('AWS::OpenSearchService::Domain', 1);
});

test('New service/new domain, private API, existing VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = false;
  const existingVpc = defaults.getTestVpc(stack, publicApi);

  new FargateToOpenSearch(stack, 'test-construct', {
    publicApi,
    existingVpc,
    openSearchDomainName: DOMAIN_NAME,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::OpenSearchService::Domain", {
    DomainName: DOMAIN_NAME
  });

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
            Name: "DOMAIN_ENDPOINT",
            Value: {
              "Fn::GetAtt": [
                "testconstructOpenSearchDomainD2A5B104",
                "DomainEndpoint"
              ]
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
        Name: "test-construct-container",
        PortMappings: [
          {
            ContainerPort: 8080,
            Protocol: "tcp"
          }
        ]
      }
    ],
  });

  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });

  // Confirm we created an Isolated VPC
  defaults.expectNonexistence(stack, 'AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::ECS::Service', 1);
  template.resourceCountIs('AWS::OpenSearchService::Domain', 1);
});

test('Existing service/new domain, public API, existing VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = true;

  const existingVpc = defaults.getTestVpc(stack);

  const createFargateServiceResponse = defaults.CreateFargateService(stack, 'test', {
    constructVpc: existingVpc,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clientFargateServiceProps: {
      serviceName: SERVICE_NAME
    }
  });

  new FargateToOpenSearch(stack, 'test-construct', {
    publicApi,
    existingFargateServiceObject: createFargateServiceResponse.service,
    existingContainerDefinitionObject: createFargateServiceResponse.containerDefinition,
    existingVpc,
    openSearchDomainName: DOMAIN_NAME
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::OpenSearchService::Domain", {
    DomainName: DOMAIN_NAME
  });

  template.hasResourceProperties("AWS::ECS::Service", {
    ServiceName: SERVICE_NAME
  });

  template.hasResourceProperties("AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      {
        Environment: [
          {
            Name: "DOMAIN_ENDPOINT",
            Value: {
              "Fn::GetAtt": [
                "testconstructOpenSearchDomainD2A5B104",
                "DomainEndpoint"
              ]
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
    ],
  });

  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });

  // Confirm we created a Public/Private VPC
  template.hasResourceProperties('AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::ECS::Service', 1);
  template.resourceCountIs('AWS::OpenSearchService::Domain', 1);
});

test('Existing service/new domain, private API, existing VPC', () => {
  const stack = new cdk.Stack();
  const publicApi = false;

  const existingVpc = defaults.getTestVpc(stack, publicApi);

  const createFargateServiceResponse = defaults.CreateFargateService(stack, 'test', {
    constructVpc: existingVpc,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clientFargateServiceProps: {
      serviceName: SERVICE_NAME
    }
  });

  new FargateToOpenSearch(stack, 'test-construct', {
    publicApi,
    existingFargateServiceObject: createFargateServiceResponse.service,
    existingContainerDefinitionObject: createFargateServiceResponse.containerDefinition,
    existingVpc,
    openSearchDomainName: DOMAIN_NAME
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::OpenSearchService::Domain", {
    DomainName: DOMAIN_NAME
  });

  template.hasResourceProperties("AWS::ECS::Service", {
    ServiceName: SERVICE_NAME,
  });

  template.hasResourceProperties("AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      {
        Environment: [
          {
            Name: "DOMAIN_ENDPOINT",
            Value: {
              "Fn::GetAtt": [
                "testconstructOpenSearchDomainD2A5B104",
                "DomainEndpoint"
              ]
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
    ],
  });

  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: '172.168.0.0/16'
  });

  // Confirm we created an Isolated VPC
  defaults.expectNonexistence(stack, 'AWS::EC2::InternetGateway', {});
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::ECS::Service', 1);
  template.resourceCountIs('AWS::OpenSearchService::Domain', 1);
});

test('Confirm CheckOpenSearchProps is called', () => {
  const stack = new cdk.Stack();
  const publicApi = false;

  const app = () => {
    new FargateToOpenSearch(stack, 'test-construct', {
      publicApi,
      openSearchDomainName: DOMAIN_NAME,
      ecrRepositoryArn: defaults.fakeEcrRepoArn,
      openSearchDomainProps: {
        vpcOptions: { securityGroupIds: ['fake-sg-id'] }
      }
    });
  };

  expect(app).toThrowError("Error - Define VPC using construct parameters not the OpenSearch Service props");
});

test('Confirm that CheckVpcProps was called', () => {
  const stack = new cdk.Stack();
  const publicApi = true;
  const clusterName = "custom-cluster-name";
  const containerName = "custom-container-name";
  const serviceName = "custom-service-name";
  const familyName = "custom-family-name";

  const props: FargateToOpenSearchProps = {
    publicApi,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clusterProps: { clusterName },
    containerDefinitionProps: { containerName },
    fargateTaskDefinitionProps: { family: familyName },
    fargateServiceProps: { serviceName },
    openSearchDomainName: DOMAIN_NAME,
    cognitoDomainName: COGNITO_DOMAIN_NAME,
    existingVpc: defaults.getTestVpc(stack),
    vpcProps: {  },
  };

  const app = () => {
    new FargateToOpenSearch(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide an existingVpc or some combination of deployVpc and vpcProps, but not both.\n');
});
