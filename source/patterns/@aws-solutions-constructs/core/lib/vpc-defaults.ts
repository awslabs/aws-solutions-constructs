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

import * as ec2 from "aws-cdk-lib/aws-ec2";

/**
 * Default VPC with public and private subnets
 */
export function DefaultPublicPrivateVpcProps(): ec2.VpcProps {
  return {
  } as ec2.VpcProps;
}

/**
 * Default VPC with isolated subnets
 */
export function DefaultIsolatedVpcProps(): ec2.VpcProps {
  return {
    natGateways: 0,
    subnetConfiguration: [
      {
        cidrMask: 18,
        name: "isolated",
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      }
    ]
  } as ec2.VpcProps;
}

/**
 * Default VPC with private subnets w/NAT
 */
export function DefaultPrivateVpcProps(): ec2.VpcProps {
  return {
    natGateways: 0,
    subnetConfiguration: [
      {
        cidrMask: 18,
        name: "private",
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      {
        cidrMask: 24,
        name: "public",
        subnetType: ec2.SubnetType.PUBLIC,
      }
    ]
  } as ec2.VpcProps;
}