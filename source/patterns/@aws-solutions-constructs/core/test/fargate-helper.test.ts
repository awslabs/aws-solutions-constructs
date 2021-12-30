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

import * as defaults from "..";
import { Stack } from '@aws-cdk/core';
import { CreateFargateService } from "..";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecr from "@aws-cdk/aws-ecr";
import '@aws-cdk/assert/jest';

test('Test with all defaults', () => {
  const stack = new Stack();

  const testVpc = CreateTestVpc(stack);
  CreateFargateService(stack,
    'test',
    testVpc,
    undefined,
    'arn:aws:ecr:us-east-1:123456789012:repository/fake-repo');

  expect(stack).toHaveResource("AWS::ECS::Service", {
    Cluster: {
      Ref: "testclusterDF8B0D19"
    },
    DeploymentConfiguration: {
      MaximumPercent: 200,
      MinimumHealthyPercent: 100
    },
    DesiredCount: 2,
    EnableECSManagedTags: false,
    LaunchType: "FARGATE",
    NetworkConfiguration: {
      AwsvpcConfiguration: {
        AssignPublicIp: "ENABLED",
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
  expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", {
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
  expect(stack).toHaveResourceLike("AWS::EC2::SecurityGroup", {
    GroupName: 'defaultSecurityGroup'
  });

  expect(stack).toCountResources("AWS::EC2::VPCEndpoint", 3);
  expect(stack).toHaveResource("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Interface",
  });
  expect(stack).toHaveResource("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Gateway",
  });

});

test('Test with all defaults in isolated VPC', () => {
  const stack = new Stack();

  const testVpc = CreateIsolatedTestVpc(stack);
  CreateFargateService(stack,
    'test',
    testVpc,
    undefined,
    'arn:aws:ecr:us-east-1:123456789012:repository/fake-repo');

  expect(stack).toHaveResource("AWS::ECS::Service", {
    Cluster: {
      Ref: "testclusterDF8B0D19"
    },
    DeploymentConfiguration: {
      MaximumPercent: 200,
      MinimumHealthyPercent: 100
    },
    DesiredCount: 2,
    EnableECSManagedTags: false,
    LaunchType: "FARGATE",
    NetworkConfiguration: {
      AwsvpcConfiguration: {
        AssignPublicIp: "ENABLED",
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
  expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", {
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

  expect(stack).toCountResources("AWS::EC2::VPCEndpoint", 3);
  expect(stack).toHaveResource("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Interface",
  });
  expect(stack).toHaveResource("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Gateway",
  });

});

test('Test with custom task definition', () => {
  const stack = new Stack();

  const testVpc = CreateIsolatedTestVpc(stack);
  CreateFargateService(stack,
    'test',
    testVpc,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      image: CreateImage(stack)
    }
  );

  expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", {
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
  CreateFargateService(stack,
    'test',
    testVpc,
    undefined,
    'arn:aws:ecr:us-east-1:123456789012:repository/fake-repo',
    undefined,
    { cpu: 256, memoryLimitMiB: 512  }
  );

  expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", {
    Cpu: '256',
    Memory: '512'
  });
});

test('Test with custom cluster props', () => {
  const stack = new Stack();
  const clusterName = 'test-value';

  const testVpc = CreateIsolatedTestVpc(stack);
  CreateFargateService(stack,
    'test',
    testVpc,
    { clusterName },
    'arn:aws:ecr:us-east-1:123456789012:repository/fake-repo',
    undefined,
  );

  expect(stack).toHaveResourceLike("AWS::ECS::Cluster", {
    ClusterName: clusterName,
  });
});

test('Test with custom Fargate Service props', () => {
  const stack = new Stack();
  const serviceName = 'test-value';

  const testVpc = CreateIsolatedTestVpc(stack);
  CreateFargateService(stack,
    'test',
    testVpc,
    undefined,
    'arn:aws:ecr:us-east-1:123456789012:repository/fake-repo',
    undefined,
    undefined,
    undefined,
    { serviceName  }
  );

  expect(stack).toHaveResourceLike("AWS::ECS::Service", {
    ServiceName: serviceName,
  });
});

test('Test with custom security group', () => {
  const stack = new Stack();
  const groupName = 'customerSg';

  const testVpc = CreateIsolatedTestVpc(stack);

  const customSg = new ec2.SecurityGroup(stack, 'custom-sg', {
    disableInlineRules: true,
    allowAllOutbound: false,
    vpc: testVpc,
    securityGroupName: groupName
  });

  CreateFargateService(stack,
    'test',
    testVpc,
    undefined,
    'arn:aws:ecr:us-east-1:123456789012:repository/fake-repo',
    undefined,
    undefined,
    undefined,
    { securityGroups: [ customSg ]  }
  );

  expect(stack).toHaveResource("AWS::EC2::SecurityGroup", {
    GroupName: groupName,
  });
  expect(stack).not.toHaveResource("AWS::EC2::SecurityGroup", {
    GroupName: 'defaultSecurityGroup',
  });
});

test('Test no image repo or image is an error', () => {
  const stack = new Stack();

  const testVpc = CreateIsolatedTestVpc(stack);
  const app = () => {
    CreateFargateService(stack,
      'test',
      testVpc);
  };

  expect(app).toThrowError(
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

  expect(app).toThrowError("If you provide an existingFargateServiceObject, you cannot provide any props defining a new service\n");
});

test('Check providing existing image AND props is an error', () => {
  const props = {
    existingImageObject: { place: "holder" },
    ecrRepositoryArn: { place: "holder2" }
  };

  const app = () => {
    defaults.CheckFargateProps(props);
  };

  expect(app).toThrowError("If you provide an existingImageObject then you cannot provide an ecrRepositoryArn nor ecrImageVersion\n");
});

test('Check providing vpc in the targetGroupsProps is an error', () => {
  const props = {
    targetGroupProps: {  vpc: { place: "holder" } },
  };

  const app = () => {
    defaults.CheckFargateProps(props);
  };

  expect(app).toThrowError("Provide all VPC info at Construct level, not within targetGroupProps\n");
});

test('Check providing taskDefinition in the fargateServiceProps is an error', () => {
  const props = {
    fargateServiceProps: {  taskDefinition: { place: "holder" } },
  };

  const app = () => {
    defaults.CheckFargateProps(props);
  };

  expect(app).toThrowError("The construct cannot accept an existing task definition in fargateServiceProps\n");
});

test('Check providing cluster in fargateServiceProps AND clusterProps is an error', () => {
  const props = {
    fargateServiceProps: {  cluster: { place: "holder" } },
    clusterProps: { place: "holder2"},
  };

  const app = () => {
    defaults.CheckFargateProps(props);
  };

  expect(app).toThrowError("If you provide a cluster in fargateServiceProps then you cannot provide clusterProps\n");
});

test('Check providing vpc in clusterProps is an error', () => {
  const props = {
    clusterProps: {  vpc: { place: "holder" } },
  };

  const app = () => {
    defaults.CheckFargateProps(props);
  };

  expect(app).toThrowError("All services in the construct use the construct VPC, you cannot specify a VPC in clusterProps\n");
});

test('Check providing existing service without existing container and existing VPC is an error', () => {
  const props = {
    existingFargateServiceObject: { place: "holder"  },
    existingVpc:  { place: "holder2"  },
  };

  const app = () => {
    defaults.CheckFargateProps(props);
  };

  expect(app).toThrowError(
    "If an existing Service is indicated by supplying either existingFargateServiceObject or existingContainerDefinitionObject, then existingFargateServiceObject, existingContainerDefinitionObject, and existingVpc must all be provided\n"
  );
});

// Helper functions
function CreateTestVpc(stack: Stack) {
  return defaults.buildVpc(stack, {
    defaultVpcProps: defaults.DefaultPublicPrivateVpcProps(),
  });
}

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
      "arn:aws:ecr:us-east-1:123456789012:repository/existingImage"
    ),
    "latest"
  );
}