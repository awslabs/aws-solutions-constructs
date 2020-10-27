/**
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import * as ec2 from "@aws-cdk/aws-ec2";
import { Construct } from "@aws-cdk/core";
import { overrideProps } from "./utils";
import { DefaultVpcProps } from './vpc-defaults';

export interface BuildVpcProps {
    /**
     * User provided props to override the default props for the VPC.
     *
     * @default - Default props are used
     */
    readonly vpcProps?: ec2.VpcProps
}

export function buildVpc(scope: Construct, props?: BuildVpcProps): ec2.Vpc {

    let bucketprops: ec2.VpcProps = DefaultVpcProps();

    if (props?.vpcProps) {
        bucketprops = overrideProps(bucketprops, props?.vpcProps);
    }

    const vpc = new ec2.Vpc(scope, "Vpc", bucketprops);

    // Add VPC FlowLogs with the default setting of trafficType:ALL and destination: CloudWatch Logs
    vpc.addFlowLog('FlowLog');

    // Add Cfn Nag suppression for PUBLIC subnets to suppress WARN W33: EC2 Subnet should not have MapPublicIpOnLaunch set to true
    vpc.publicSubnets.forEach((subnet) => {
        const cfnSubnet = subnet.node.defaultChild as ec2.CfnSubnet;
        cfnSubnet.cfnOptions.metadata = {
          cfn_nag: {
              rules_to_suppress: [{
                  id: 'W33',
                  reason: 'Allow Public Subnets to have MapPublicIpOnLaunch set to true'
              }]
          }
        };
    });

    return vpc;
}