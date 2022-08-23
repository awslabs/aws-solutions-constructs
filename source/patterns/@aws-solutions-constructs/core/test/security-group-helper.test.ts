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

import { Stack } from "aws-cdk-lib";
import * as defaults from "../";
import "@aws-cdk/assert/jest";
import * as ec2 from "aws-cdk-lib/aws-ec2";

// --------------------------------------------------------------
// Test minimal deployment with no properties
// --------------------------------------------------------------
test("Test minimal deployment with no properties", () => {
  // Stack
  const stack = new Stack();

  const vpc = new ec2.Vpc(stack, "test-vpc", {});

  // Helper declaration
  defaults.buildSecurityGroup(
    stack,
    "primary-queue",
    {
      vpc,
      allowAllOutbound: true,
    },
    [],
    []
  );

  expect(stack).toHaveResource("AWS::EC2::SecurityGroup", {
    SecurityGroupEgress: [
      {
        CidrIp: "0.0.0.0/0",
        Description: "Allow all outbound traffic by default",
        IpProtocol: "-1",
      },
    ],
  });
});

test("Test deployment with ingress rules", () => {
  // Stack
  const stack = new Stack();

  const vpc = new ec2.Vpc(stack, "test-vpc", {});

  // Helper declaration
  defaults.buildSecurityGroup(
    stack,
    "primary-queue",
    {
      vpc,
      allowAllOutbound: true,
    },
    [{ peer: ec2.Peer.ipv4("1.1.1.1/16"), connection: ec2.Port.tcp(100) }],
    []
  );

  expect(stack).toHaveResource("AWS::EC2::SecurityGroup", {
    SecurityGroupIngress: [
      {
        CidrIp: "1.1.1.1/16",
        Description: "from 1.1.1.1/16:100",
        FromPort: 100,
        IpProtocol: "tcp",
        ToPort: 100,
      },
    ],
  });
});

test("Test deployment with egress rule", () => {
  // Stack
  const stack = new Stack();

  const vpc = new ec2.Vpc(stack, "test-vpc", {});

  // Helper declaration
  defaults.buildSecurityGroup(
    stack,
    "primary-queue",
    {
      vpc,
      allowAllOutbound: false,
    },
    [],
    [
      { peer: ec2.Peer.ipv4("1.1.1.1/16"), connection: ec2.Port.tcp(100) },
      { peer: ec2.Peer.ipv4("2.2.2.2/24"), connection: ec2.Port.tcp(200) },
    ]
  );

  expect(stack).toHaveResource("AWS::EC2::SecurityGroup", {
    SecurityGroupEgress: [
      {
        CidrIp: "1.1.1.1/16",
        Description: "from 1.1.1.1/16:100",
        FromPort: 100,
        IpProtocol: "tcp",
        ToPort: 100,
      },
      {
        CidrIp: "2.2.2.2/24",
        Description: "from 2.2.2.2/24:200",
        FromPort: 200,
        IpProtocol: "tcp",
        ToPort: 200,
      },
    ],
  });
});

test("Test self referencing security group", () => {
  const testPort = 33333;
  // Stack
  const stack = new Stack();

  const vpc = new ec2.Vpc(stack, "test-vpc", {});

  // Helper declaration
  defaults.CreateSelfReferencingSecurityGroup(
    stack,
    "testsg",
    vpc,
    testPort,
  );

  expect(stack).toHaveResourceLike("AWS::EC2::SecurityGroupIngress", {
    IpProtocol: "TCP",
    FromPort: testPort,
    ToPort: testPort,
    GroupId: {
      "Fn::GetAtt": [
        "testsgcachesg72A723EA",
        "GroupId"
      ]
    },
    SourceSecurityGroupId: {
      "Fn::GetAtt": [
        "testsgcachesg72A723EA",
        "GroupId"
      ]
    },
  });

});
