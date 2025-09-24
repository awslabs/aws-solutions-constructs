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

import { Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ConstructsFactories, ServiceEndpointTypes } from "../../lib";
import * as ec2 from 'aws-cdk-lib/aws-ec2';

test('all defaults', () => {
  const stack = new Stack();
  const factories = new ConstructsFactories(stack, 'target');

  factories.vpcFactory('test', {
    subnetTypes: [
      ec2.SubnetType.PRIVATE_ISOLATED
    ]
  });

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::EC2::VPC", 1);
  template.resourceCountIs("AWS::EC2::Subnet", 2);
  template.resourceCountIs("AWS::EC2::RouteTable", 2);
  template.resourceCountIs("AWS::EC2::SubnetRouteTableAssociation", 2);
  template.resourceCountIs("AWS::IAM::Role", 1);
  template.resourceCountIs("AWS::IAM::Policy", 1);
  template.resourceCountIs("AWS::EC2::FlowLog", 1);

  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: "10.0.0.0/16",
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
    InstanceTenancy: "default",
  });
  template.hasResourceProperties("AWS::EC2::Subnet", {
    CidrBlock: "10.0.0.0/17",
    MapPublicIpOnLaunch: false
  });
  template.hasResourceProperties("AWS::EC2::Subnet", {
    CidrBlock: "10.0.128.0/17",
    MapPublicIpOnLaunch: false
  });
  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "logs:CreateLogStream",
            "logs:PutLogEvents",
            "logs:DescribeLogStreams"
          ],
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              Match.stringLikeRegexp("targetvpctestflowlogtestLogGroup"),
              "Arn"
            ]
          }
        },
        {
          Action: "iam:PassRole",
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              Match.stringLikeRegexp("targetvpctestflowlogtestIAMRole"),
              "Arn"
            ]
          }
        }
      ],
    },
  });

});

test('confirm cidr mask is applied correctly', () => {
  const stack = new Stack();
  const factories = new ConstructsFactories(stack, 'target');

  factories.vpcFactory('test', {
    subnetTypes: [
      ec2.SubnetType.PRIVATE_ISOLATED
    ],
    subnetIPAddresses: 100
  });

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::EC2::VPC", 1);
  template.resourceCountIs("AWS::EC2::Subnet", 2);
  template.resourceCountIs("AWS::EC2::RouteTable", 2);
  template.resourceCountIs("AWS::EC2::SubnetRouteTableAssociation", 2);
  template.resourceCountIs("AWS::IAM::Role", 1);
  template.resourceCountIs("AWS::IAM::Policy", 1);
  template.resourceCountIs("AWS::EC2::FlowLog", 1);

  template.hasResourceProperties("AWS::EC2::Subnet", {
    CidrBlock: "10.0.0.0/25",
    MapPublicIpOnLaunch: false,
  });
  template.hasResourceProperties("AWS::EC2::Subnet", {
    CidrBlock: "10.0.0.128/25",
    MapPublicIpOnLaunch: false,
  });
});

test('check that props.vpcProps is reflected', () => {
  const stack = new Stack();
  const factories = new ConstructsFactories(stack, 'target');

  factories.vpcFactory('test', {
    subnetTypes: [
      ec2.SubnetType.PRIVATE_ISOLATED
    ],
    vpcProps: {
      ipAddresses: ec2.IpAddresses.cidr('172.0.0.0/16')
    }
  });

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::EC2::VPC", 1);
  template.resourceCountIs("AWS::EC2::Subnet", 2);
  template.resourceCountIs("AWS::EC2::RouteTable", 2);
  template.resourceCountIs("AWS::EC2::SubnetRouteTableAssociation", 2);
  template.resourceCountIs("AWS::IAM::Role", 1);
  template.resourceCountIs("AWS::IAM::Policy", 1);
  template.resourceCountIs("AWS::EC2::FlowLog", 1);

  template.hasResourceProperties("AWS::EC2::VPC", {
    CidrBlock: "172.0.0.0/16",
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
    InstanceTenancy: "default",
  });
});

test('check that provided subnet definitions are used', () => {
  const stack = new Stack();
  const factories = new ConstructsFactories(stack, 'target');

  factories.vpcFactory('test', {
    vpcProps: {
      subnetConfiguration: [
        {
          name: "isolated-one",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 26
        },
        {
          name: "public-one",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 26
        },
        {
          name: "egress-one",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 26
        }
      ]
    }
  });

  const template = Template.fromStack(stack);

  // Not implemented yet
  template.resourceCountIs("AWS::EC2::VPC", 1);
  template.resourceCountIs("AWS::EC2::Subnet", 6);
  template.resourceCountIs("AWS::EC2::RouteTable", 6);
  template.resourceCountIs("AWS::EC2::SubnetRouteTableAssociation", 6);
  template.resourceCountIs("AWS::IAM::Role", 1);
  template.resourceCountIs("AWS::IAM::Policy", 1);
  template.resourceCountIs("AWS::EC2::FlowLog", 1);

});

test('check that endpoints are created', () => {
  const stack = new Stack();
  const factories = new ConstructsFactories(stack, 'target');

  factories.vpcFactory('test', {
    subnetTypes: [
      ec2.SubnetType.PRIVATE_ISOLATED
    ],
    endPoints: [
      ServiceEndpointTypes.DYNAMODB,
      ServiceEndpointTypes.SNS
    ]
  });

  const template = Template.fromStack(stack);

  // Not implemented yet
  template.resourceCountIs("AWS::EC2::VPC", 1);
  template.resourceCountIs("AWS::EC2::VPCEndpoint", 2);
  template.resourceCountIs("AWS::EC2::Subnet", 2);
  template.resourceCountIs("AWS::EC2::RouteTable", 2);
  template.resourceCountIs("AWS::EC2::SubnetRouteTableAssociation", 2);
  template.resourceCountIs("AWS::IAM::Role", 1);
  template.resourceCountIs("AWS::IAM::Policy", 1);
  template.resourceCountIs("AWS::EC2::FlowLog", 1);

  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Gateway",
    RouteTableIds: [
      {
        Ref: Match.stringLikeRegexp("targetvpctestisolatedSubnet1RouteTable")
      },
      {
        Ref: Match.stringLikeRegexp("targetvpctestisolatedSubnet2RouteTable")
      }
    ],
    ServiceName: {
      "Fn::Join": [
        "",
        [
          "com.amazonaws.",
          {
            Ref: "AWS::Region"
          },
          ".dynamodb"
        ]
      ]
    },
    VpcId: {
      Ref: Match.stringLikeRegexp("targetvpctest")
    }
  });
  template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
    VpcEndpointType: "Interface",
    PrivateDnsEnabled: true,
    SecurityGroupIds: [
      {
        "Fn::GetAtt": [
          Match.stringLikeRegexp("targettargetSNSsecuritygroup"),
          "GroupId"
        ]
      }
    ],
    ServiceName: {
      "Fn::Join": [
        "",
        [
          "com.amazonaws.",
          {
            Ref: "AWS::Region"
          },
          ".sns"
        ]
      ]
    },
    SubnetIds: [
      {
        Ref: Match.stringLikeRegexp("targetvpctestisolatedSubnet1Subnet")
      },
      {
        Ref: Match.stringLikeRegexp("targetvpctestisolatedSubnet2Subnet")
      }
    ],
    VpcId: {
      Ref: Match.stringLikeRegexp("targetvpctest")
    }
  });

});

test('catch subnet configuration in vpcProps and separate values', () => {
  const stack = new Stack();
  const factories = new ConstructsFactories(stack, 'target');

  const app = () => {
    factories.vpcFactory('test', {
      vpcProps: {
        subnetConfiguration: [{
          name: "anydata"
        }]
      },
      subnetIPAddresses: 56
    });
  };

  expect(app).toThrowError('Error - Either provide complete subnetConfiguration in props.vpcProps.subnetConfiguration or subnetConfiguration info in props.subnetTypes and props.subnetIPAddresses, but not both\n');
});

test('catch no subnet info provided', () => {
  const stack = new Stack();
  const factories = new ConstructsFactories(stack, 'target');

  const first = () => {
    factories.vpcFactory('test', {
      vpcProps: {
      },
      subnetIPAddresses: 56
    });
  };

  expect(first).toThrowError('Error - subnet types must be provided in either props.vpcProps.subnetConfiguration or props.subnetTypes\n');

  const second = () => {
    factories.vpcFactory('test', {
      vpcProps: {
      },
      subnetTypes: []
    });
  };

  expect(second).toThrowError('Error - subnet types must be provided in either props.vpcProps.subnetConfiguration or props.subnetTypes\n');


  const third = () => {
    factories.vpcFactory('test', {
    });
  };

  expect(third).toThrowError('Error - subnet types must be provided in either props.vpcProps.subnetConfiguration or props.subnetTypes\n');
});

test('catch dns settings turned off with endpoints specified', () => {
  const stack = new Stack();
  const factories = new ConstructsFactories(stack, 'target');

  const first = () => {
    factories.vpcFactory('test', {
      endPoints: [
        ServiceEndpointTypes.BEDROCK
      ],
      vpcProps: {
        enableDnsSupport: false
      }
    });
  };

  expect(first).toThrowError('Error - VPC endpoints require that enableDnsHostnames and enableDnsSupport are both enabled\n');
});
