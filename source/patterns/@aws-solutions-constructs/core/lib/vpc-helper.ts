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

/*
 *  The functions found here in the core library are for internal use and can be changed
 *  or removed outside of a major release. We recommend against calling them directly from client code.
 */

import * as ec2 from "aws-cdk-lib/aws-ec2";
import { CfnLogGroup } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { buildSecurityGroup } from "./security-group-helper";
import { consolidateProps, addCfnSuppressRules, suppressVpcCustomerHandlerRoleWarnings } from "./utils";
import * as cdk from 'aws-cdk-lib';

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

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function buildVpc(scope: Construct, props: BuildVpcProps): ec2.IVpc {
  if (props?.existingVpc) {
    return props?.existingVpc;
  }

  let cumulativeProps: ec2.VpcProps = props?.defaultVpcProps;

  cumulativeProps = consolidateProps(cumulativeProps, props?.userVpcProps, props?.constructVpcProps);

  const vpc = new ec2.Vpc(scope, "Vpc", cumulativeProps);

  // Add VPC FlowLogs with the default setting of trafficType:ALL and destination: CloudWatch Logs
  const flowLog: ec2.FlowLog = vpc.addFlowLog("FlowLog");

  SuppressMapPublicIpWarnings(vpc);
  SuppressEncryptedLogWarnings(flowLog);
  suppressVpcCustomerHandlerRoleWarnings(cdk.Stack.of(scope));

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
  ECR_API = "ECR_API",
  ECR_DKR = "ECR_DKR",
  EVENTS = "CLOUDWATCH_EVENTS",
  KINESIS_FIREHOSE = "KINESIS_FIREHOSE",
  KINESIS_STREAMS = "KINESIS_STREAMS",
  KENDRA = "KENDRA"
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
  {
    endpointName: ServiceEndpointTypes.ECR_API,
    endpointType: EndpointTypes.INTERFACE,
    endpointInterfaceService: ec2.InterfaceVpcEndpointAwsService.ECR
  },
  {
    endpointName: ServiceEndpointTypes.ECR_DKR,
    endpointType: EndpointTypes.INTERFACE,
    endpointInterfaceService: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER
  },
  {
    endpointName: ServiceEndpointTypes.EVENTS,
    endpointType: EndpointTypes.INTERFACE,
    endpointInterfaceService: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_EVENTS
  },
  {
    endpointName: ServiceEndpointTypes.KINESIS_FIREHOSE,
    endpointType: EndpointTypes.INTERFACE,
    endpointInterfaceService: ec2.InterfaceVpcEndpointAwsService.KINESIS_FIREHOSE
  },
  {
    endpointName: ServiceEndpointTypes.KINESIS_STREAMS,
    endpointType: EndpointTypes.INTERFACE,
    endpointInterfaceService: ec2.InterfaceVpcEndpointAwsService.KINESIS_STREAMS
  },
  {
    endpointName: ServiceEndpointTypes.KENDRA,
    endpointType: EndpointTypes.INTERFACE,
    endpointInterfaceService: ec2.InterfaceVpcEndpointAwsService.KENDRA
  }
];

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function AddAwsServiceEndpoint(
  scope: Construct,
  vpc: ec2.IVpc,
  interfaceTag: ServiceEndpointTypes
) {
  if (CheckIfEndpointAlreadyExists(vpc, interfaceTag)) {
    return;
  }

  const service = endpointSettings.find(
    (endpoint) => endpoint.endpointName === interfaceTag
  );

  if (!service) {
    throw new Error("Unsupported Service sent to AddServiceEndpoint");
  }

  if (service.endpointType === EndpointTypes.GATEWAY) {
    AddGatewayEndpoint(vpc, service, interfaceTag);
  }
  if (service.endpointType === EndpointTypes.INTERFACE) {
    AddInterfaceEndpoint(scope, vpc, service, interfaceTag);
  }

  // ESLint requires this return statement, so disabling SonarQube warning
  return; // NOSONAR
}

function CheckIfEndpointAlreadyExists(vpc: ec2.IVpc, interfaceTag: ServiceEndpointTypes): boolean {
  return vpc.node.children.some((child) => child.node.id === interfaceTag);
}

function SuppressMapPublicIpWarnings(vpc: ec2.Vpc) {
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
}

function SuppressEncryptedLogWarnings(flowLog: ec2.FlowLog) {
  // Add Cfn Nag suppression for CloudWatchLogs LogGroups data is encrypted
  const cfnLogGroup: CfnLogGroup = flowLog.logGroup?.node.defaultChild as CfnLogGroup;
  addCfnSuppressRules(cfnLogGroup, [
    {
      id: 'W84',
      reason: 'By default CloudWatchLogs LogGroups data is encrypted using the CloudWatch server-side encryption keys (AWS Managed Keys)'
    }
  ]);
}

function AddInterfaceEndpoint(scope: Construct, vpc: ec2.IVpc, service: EndpointDefinition, interfaceTag: ServiceEndpointTypes) {
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
    securityGroups: [endpointDefaultSecurityGroup],
  });
}

function AddGatewayEndpoint(vpc: ec2.IVpc, service: EndpointDefinition, interfaceTag: ServiceEndpointTypes) {
  vpc.addGatewayEndpoint(interfaceTag, {
    service: service.endpointGatewayService as ec2.GatewayVpcEndpointAwsService,
  });
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function retrievePrivateSubnetIds(vpc: ec2.IVpc) {
  let targetSubnetType;

  if (vpc.isolatedSubnets.length) {
    targetSubnetType = ec2.SubnetType.PRIVATE_ISOLATED;
  } else if (vpc.privateSubnets.length) {
    targetSubnetType = ec2.SubnetType.PRIVATE_WITH_EGRESS;
  } else {
    throw new Error('Error - No isolated or private subnets available in VPC');
  }

  const subnetSelector = {
    onePerAz: true,
    subnetType: targetSubnetType
  };

  return vpc.selectSubnets(subnetSelector).subnetIds;
}

export interface VpcPropsSet {
  readonly existingVpc?: ec2.IVpc;
  readonly vpcProps?: ec2.VpcProps;
  readonly deployVpc?: boolean;
}

export function CheckVpcProps(propsObject: VpcPropsSet | any) {
  let errorMessages = '';
  let errorFound = false;

  if ((propsObject.deployVpc || propsObject.vpcProps) && propsObject.existingVpc) {
    errorMessages += 'Error - Either provide an existingVpc or some combination of deployVpc and vpcProps, but not both.\n';
    errorFound = true;
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }
}
