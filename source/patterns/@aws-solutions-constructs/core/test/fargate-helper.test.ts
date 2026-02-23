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

import * as defaults from "..";
import { Stack } from 'aws-cdk-lib';
import { CreateFargateService } from "..";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import { Template } from 'aws-cdk-lib/assertions';
import { expectNonexistence } from './test-helper';

test('Test with all defaults', () => {
  const stack = new Stack();

  const testVpc = defaults.getTestVpc(stack);
  const createFargateServiceResponse = CreateFargateService(stack, 'test', {
    constructVpc: testVpc,
    ecrRepositoryArn: defaults.fakeEcrRepoArn
  });

  expect(createFargateServiceResponse.containerDefinition).toBeDefined();
  expect(createFargateServiceResponse.service).toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ECS::Service", {
    Cluster: {
      Ref: "testclusterDF8B0D19"
    },
    DeploymentConfiguration: {
      MaximumPercent: 150,
      MinimumHealthyPercent: 75
    },
    DesiredCount: 2,
    EnableECSManagedTags: false,
    LaunchType: "FARGATE",
    NetworkConfiguration: {
      AwsvpcConfiguration: {
        AssignPublicIp: "DISABLED",
        SecurityGroups: [
          {
            "Fn::GetAtt": [
              "testsg872EB48A",
              "GroupId"
            ]
          }
        ],
        Subnets: [
          {
            Ref: "VpcPrivateSubnet1Subnet536B997A"
          },
          {
            Ref: "VpcPrivateSubnet2Subnet3788AAA1"
          }
        ]
      }
    },
    PlatformVersion: "LATEST",
    TaskDefinition: {
      Ref: "testtaskdefF924AD58"
    }
  });
  template.hasResourceProperties("AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      {
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
      }
    ],
  });
  template.hasResourceProperties("AWS::EC2::SecurityGroup", {
    GroupDescription: 'Construct created security group'
  });

  template.resourceCountIs("AWS::EC2::VPCEndpoint", 3);
  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Interface",
  });
  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Gateway",
  });

});

test('Test with all defaults in isolated VPC', () => {
  const stack = new Stack();

  const testVpc = CreateIsolatedTestVpc(stack);
  CreateFargateService(stack, 'test', {
    constructVpc: testVpc,
    ecrRepositoryArn: defaults.fakeEcrRepoArn
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::ECS::Service", {
    Cluster: {
      Ref: "testclusterDF8B0D19"
    },
    DeploymentConfiguration: {
      MaximumPercent: 150,
      MinimumHealthyPercent: 75
    },
    DesiredCount: 2,
    EnableECSManagedTags: false,
    LaunchType: "FARGATE",
    NetworkConfiguration: {
      AwsvpcConfiguration: {
        AssignPublicIp: "DISABLED",
        SecurityGroups: [
          {
            "Fn::GetAtt": [
              "testsg872EB48A",
              "GroupId"
            ]
          }
        ],
        Subnets: [
          {
            Ref: "VpcisolatedSubnet1SubnetE62B1B9B"
          },
          {
            Ref: "VpcisolatedSubnet2Subnet39217055"
          }
        ]
      }
    },
    PlatformVersion: "LATEST",
    TaskDefinition: {
      Ref: "testtaskdefF924AD58"
    }
  });
  template.hasResourceProperties("AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      {
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
      }
    ],
  });

  template.resourceCountIs("AWS::EC2::VPCEndpoint", 3);
  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Interface",
  });
  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Gateway",
  });

});

test('Test with custom task definition', () => {
  const stack = new Stack();

  const testVpc = CreateIsolatedTestVpc(stack);
  CreateFargateService(stack, 'test', {
    constructVpc: testVpc,
    clientContainerDefinitionProps: {
      image: CreateImage(stack)
    }
  });

  Template.fromStack(stack).hasResourceProperties("AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      {
        Image: {
          "Fn::Join": [
            "",
            [
              "123456789012.dkr.ecr.us-east-1.",
              {
                Ref: "AWS::URLSuffix"
              },
              "/existingImage:latest"
            ]
          ]
        },
      }
    ],
  });
});

test('Test with custom container definition', () => {
  const stack = new Stack();

  const testVpc = CreateIsolatedTestVpc(stack);
  CreateFargateService(stack, 'test', {
    constructVpc: testVpc,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clientFargateTaskDefinitionProps: {
      cpu: 256,
      memoryLimitMiB: 512
    }
  });

  Template.fromStack(stack).hasResourceProperties("AWS::ECS::TaskDefinition", {
    Cpu: '256',
    Memory: '512'
  });
});

test('Test with custom cluster props', () => {
  const stack = new Stack();
  const clusterName = 'test-value';

  const testVpc = CreateIsolatedTestVpc(stack);
  CreateFargateService(stack, 'test', {
    constructVpc: testVpc,
    clientClusterProps: {
      clusterName
    },
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
  });

  Template.fromStack(stack).hasResourceProperties("AWS::ECS::Cluster", {
    ClusterName: clusterName,
  });
});

test('Test with custom Fargate Service props', () => {
  const stack = new Stack();
  const serviceName = 'test-value';

  const testVpc = CreateIsolatedTestVpc(stack);
  CreateFargateService(stack, 'test', {
    constructVpc: testVpc,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clientFargateServiceProps: {
      serviceName
    }
  });

  Template.fromStack(stack).hasResourceProperties("AWS::ECS::Service", {
    ServiceName: serviceName,
  });
});

test('Test with custom security group', () => {
  const stack = new Stack();
  const groupDescription = 'Test generated security group';

  const testVpc = CreateIsolatedTestVpc(stack);

  const customSg = new ec2.SecurityGroup(stack, 'custom-sg', {
    disableInlineRules: true,
    allowAllOutbound: false,
    vpc: testVpc,
    description: groupDescription
  });

  CreateFargateService(stack, 'test', {
    constructVpc: testVpc,
    ecrRepositoryArn: defaults.fakeEcrRepoArn,
    clientFargateServiceProps: { securityGroups: [ customSg ]  }
  });

  Template.fromStack(stack).hasResourceProperties("AWS::EC2::SecurityGroup", {
    GroupDescription: groupDescription,
  });

  expectNonexistence(stack, "AWS::EC2::SecurityGroup", {
    GroupDescription: 'Construct created security group',
  });
});

test('Test no image repo or image is an error', () => {
  const stack = new Stack();

  const testVpc = CreateIsolatedTestVpc(stack);
  const app = () => {
    CreateFargateService(stack, 'test', {
      constructVpc: testVpc
    });
  };

  expect(app).toThrow(
    "Not Implemented - image without repo name and version"
  );
});

// CheckFargateProps tests
test('Check providing existing service AND props is an error', () => {
  const props = {
    existingFargateServiceObject: { place: "holder" },
    existingImageObject: { place: "holder2" }
  };

  const app = () => {
    defaults.CheckFargateProps(props);
  };

  expect(app).toThrow("If you provide an existingFargateServiceObject, you cannot provide any props defining a new service\n");
});

test('Check providing existing image AND props is an error', () => {
  const props = {
    existingImageObject: { place: "holder" },
    ecrRepositoryArn: { place: "holder2" }
  };

  const app = () => {
    defaults.CheckFargateProps(props);
  };

  expect(app).toThrow("If you provide an existingImageObject then you cannot provide an ecrRepositoryArn nor ecrImageVersion\n");
});

test('Check providing vpc in the targetGroupsProps is an error', () => {
  const props = {
    targetGroupProps: {  vpc: { place: "holder" } },
  };

  const app = () => {
    defaults.CheckFargateProps(props);
  };

  expect(app).toThrow("Provide all VPC info at Construct level, not within clusterProps nor targetGroupProps\n");
});

test('Check providing taskDefinition in the fargateServiceProps is an error', () => {
  const props = {
    fargateServiceProps: {  taskDefinition: { place: "holder" } },
  };

  const app = () => {
    defaults.CheckFargateProps(props);
  };

  expect(app).toThrow("The construct cannot accept an existing task definition in fargateServiceProps\n");
});

test('Check providing cluster in fargateServiceProps AND clusterProps is an error', () => {
  const props = {
    fargateServiceProps: {  cluster: { place: "holder" } },
    clusterProps: { place: "holder2"},
  };

  const app = () => {
    defaults.CheckFargateProps(props);
  };

  expect(app).toThrow("If you provide a cluster in fargateServiceProps then you cannot provide clusterProps\n");
});

test('Check providing vpc in clusterProps is an error', () => {
  const props = {
    clusterProps: {  vpc: { place: "holder" } },
  };

  const app = () => {
    defaults.CheckFargateProps(props);
  };

  expect(app).toThrow("Provide all VPC info at Construct level, not within clusterProps nor targetGroupProps\n");
});

test('Check providing existing service without existing container and existing VPC is an error', () => {
  const props = {
    existingFargateServiceObject: { place: "holder"  },
    existingVpc:  { place: "holder2"  },
  };

  const app = () => {
    defaults.CheckFargateProps(props);
  };

  expect(app).toThrow(
    "If an existing Service is indicated by supplying either existingFargateServiceObject or existingContainerDefinitionObject, then existingFargateServiceObject, existingContainerDefinitionObject, and existingVpc must all be provided\n"
  );
});

// Helper functions
function CreateIsolatedTestVpc(stack: Stack) {
  return defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultIsolatedVpcProps(),
  });
}

function CreateImage(stack: Stack): ecs.ContainerImage {
  return ecs.ContainerImage.fromEcrRepository(
    ecr.Repository.fromRepositoryArn(
      stack,
      `test-container`,
      // This is different than fakeEcrRepoArn because we're testing custom image
      "arn:aws:ecr:us-east-1:123456789012:repository/existingImage"
    ),
    "latest"
  );
}