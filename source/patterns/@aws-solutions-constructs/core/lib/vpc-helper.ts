/**
 *  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { CfnLogGroup } from "@aws-cdk/aws-logs";
import { Construct } from "@aws-cdk/core";
import { buildSecurityGroup } from "./security-group-helper";
import { overrideProps, addCfnSuppressRules } from "./utils";

export interface BuildVpcProps {
  /**
   * Existing instance of a VPC, if this is set then the all Props are ignored
   */
  readonly existingVpc?: ec2.IVpc;
  /**
   * One of the default VPC configurations available in vpc-defaults
   */
  readonly defaultVpcProps: ec2.VpcProps;
  /**
   * User provided props to override the default props for the VPC.
   */
  readonly userVpcProps?: ec2.VpcProps;
  /**
   * Construct specified props that override both the default props
   * and user props for the VPC.
   */
  readonly constructVpcProps?: ec2.VpcProps;
}

export function buildVpc(scope: Construct, props: BuildVpcProps): ec2.IVpc {
  if (props?.existingVpc) {
    return props?.existingVpc;
  }

  let cumulativeProps: ec2.VpcProps = props?.defaultVpcProps;

  if (props?.userVpcProps) {
    cumulativeProps = overrideProps(cumulativeProps, props?.userVpcProps);
  }

  if (props?.constructVpcProps) {
    cumulativeProps = overrideProps(cumulativeProps, props?.constructVpcProps);
  }

  const vpc = new ec2.Vpc(scope, "Vpc", cumulativeProps);

  // Add VPC FlowLogs with the default setting of trafficType:ALL and destination: CloudWatch Logs
  const flowLog: ec2.FlowLog = vpc.addFlowLog("FlowLog");

  // Add Cfn Nag suppression for PUBLIC subnets to suppress WARN W33: EC2 Subnet should not have MapPublicIpOnLaunch set to true
  vpc.publicSubnets.forEach((subnet) => {
    const cfnSubnet = subnet.node.defaultChild as ec2.CfnSubnet;
    addCfnSuppressRules(cfnSubnet, [
      {
        id: 'W33',
        reason: 'Allow Public Subnets to have MapPublicIpOnLaunch set to true'
      }
    ]);
  });

  // Add Cfn Nag suppression for CloudWatchLogs LogGroups data is encrypted
  const cfnLogGroup: CfnLogGroup = flowLog.logGroup?.node.defaultChild as CfnLogGroup;
  addCfnSuppressRules(cfnLogGroup, [
    {
      id: 'W84',
      reason: 'By default CloudWatchLogs LogGroups data is encrypted using the CloudWatch server-side encryption keys (AWS Managed Keys)'
    }
  ]);

  return vpc;
}

export enum ServiceEndpointTypes {
  DYNAMODB = "DDB",
  SNS = "SNS",
  SQS = "SQS",
  S3 = "S3",
  STEP_FUNCTIONS = "STEP_FUNCTIONS",
  SAGEMAKER_RUNTIME = "SAGEMAKER_RUNTIME",
  SECRETS_MANAGER = "SECRETS_MANAGER",
  SSM = "SSM",
}

enum EndpointTypes {
  GATEWAY = "Gateway",
  INTERFACE = "Interface",
}

interface EndpointDefinition {
  endpointName: ServiceEndpointTypes;
  endpointType: EndpointTypes;
  endpointGatewayService?: ec2.GatewayVpcEndpointAwsService;
  endpointInterfaceService?: ec2.InterfaceVpcEndpointAwsService;
}

const endpointSettings: EndpointDefinition[] = [
  {
    endpointName: ServiceEndpointTypes.DYNAMODB,
    endpointType: EndpointTypes.GATEWAY,
    endpointGatewayService: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
  },
  {
    endpointName: ServiceEndpointTypes.S3,
    endpointType: EndpointTypes.GATEWAY,
    endpointGatewayService: ec2.GatewayVpcEndpointAwsService.S3,
  },
  {
    endpointName: ServiceEndpointTypes.STEP_FUNCTIONS,
    endpointType: EndpointTypes.INTERFACE,
    endpointInterfaceService: ec2.InterfaceVpcEndpointAwsService.STEP_FUNCTIONS,
  },
  {
    endpointName: ServiceEndpointTypes.SNS,
    endpointType: EndpointTypes.INTERFACE,
    endpointInterfaceService: ec2.InterfaceVpcEndpointAwsService.SNS,
  },
  {
    endpointName: ServiceEndpointTypes.SQS,
    endpointType: EndpointTypes.INTERFACE,
    endpointInterfaceService: ec2.InterfaceVpcEndpointAwsService.SQS,
  },
  {
    endpointName: ServiceEndpointTypes.SAGEMAKER_RUNTIME,
    endpointType: EndpointTypes.INTERFACE,
    endpointInterfaceService: ec2.InterfaceVpcEndpointAwsService.SAGEMAKER_RUNTIME,
  },
  {
    endpointName: ServiceEndpointTypes.SECRETS_MANAGER,
    endpointType: EndpointTypes.INTERFACE,
    endpointInterfaceService: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
  },
  {
    endpointName: ServiceEndpointTypes.SSM,
    endpointType: EndpointTypes.INTERFACE,
    endpointInterfaceService: ec2.InterfaceVpcEndpointAwsService.SSM,
  },
];

export function AddAwsServiceEndpoint(
  scope: Construct,
  vpc: ec2.IVpc,
  interfaceTag: ServiceEndpointTypes
) {
  if (!vpc.node.children.some((child) => child.node.id === interfaceTag)) {
    const service = endpointSettings.find(
      (endpoint) => endpoint.endpointName === interfaceTag
    );

    if (!service) {
      throw new Error("Unsupported Service sent to AddServiceEndpoint");
    }

    if (service.endpointType === EndpointTypes.GATEWAY) {
      vpc.addGatewayEndpoint(interfaceTag, {
        service: service.endpointGatewayService as ec2.GatewayVpcEndpointAwsService,
      });
    }
    if (service.endpointType === EndpointTypes.INTERFACE) {

      const endpointDefaultSecurityGroup = buildSecurityGroup(
        scope,
        `${scope.node.id}-${service.endpointName}`,
        {
          vpc,
          allowAllOutbound: true,
        },
        [{ peer: ec2.Peer.ipv4(vpc.vpcCidrBlock), connection: ec2.Port.tcp(443) }],
        []
      );

      vpc.addInterfaceEndpoint(interfaceTag, {
        service: service.endpointInterfaceService as ec2.InterfaceVpcEndpointAwsService,
        securityGroups: [ endpointDefaultSecurityGroup ],
      });
    }
  }

  return;
}
