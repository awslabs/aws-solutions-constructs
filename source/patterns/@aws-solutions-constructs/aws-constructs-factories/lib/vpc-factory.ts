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

// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as defaults from '@aws-solutions-constructs/core';
import { PropsBuilder } from '@aws-solutions-constructs/core';

export interface VpcFactoryProps {
  readonly vpcProps?: ec2.VpcProps | any,
  readonly subnetTypes?: ec2.SubnetType[],
  readonly subnetIPAddresses?: number,
  readonly endPoints?: ServiceEndpointTypes[]
}
export enum ServiceEndpointTypes {
  DYNAMODB,
  SNS,
  SQS,
  S3,
  STEP_FUNCTIONS,
  SAGEMAKER_RUNTIME,
  SECRETS_MANAGER,
  SSM,
  ECR_API,
  ECR_DKR,
  EVENTS,
  KINESIS_FIREHOSE,
  KINESIS_STREAMS,
  BEDROCK,
  BEDROCK_RUNTIME,
  KENDRA
}

const subnetNameMap: Record<ec2.SubnetType, string> = {
  [ec2.SubnetType.PUBLIC]: "public",
  [ec2.SubnetType.PRIVATE_WITH_EGRESS]: "private",
  [ec2.SubnetType.PRIVATE_ISOLATED]: "isolated",
  [ec2.SubnetType.PRIVATE_WITH_NAT]: "deprecated_private",
};

const serviceEndpointTypeMap: Record<ServiceEndpointTypes, defaults.ServiceEndpointTypes> = {
  [ServiceEndpointTypes.DYNAMODB]: defaults.ServiceEndpointTypes.DYNAMODB,
  [ServiceEndpointTypes.SNS]: defaults.ServiceEndpointTypes.SNS,
  [ServiceEndpointTypes.SQS]: defaults.ServiceEndpointTypes.SQS,
  [ServiceEndpointTypes.S3]: defaults.ServiceEndpointTypes.S3,
  [ServiceEndpointTypes.STEP_FUNCTIONS]: defaults.ServiceEndpointTypes.STEP_FUNCTIONS,
  [ServiceEndpointTypes.SAGEMAKER_RUNTIME]: defaults.ServiceEndpointTypes.SAGEMAKER_RUNTIME,
  [ServiceEndpointTypes.SECRETS_MANAGER]: defaults.ServiceEndpointTypes.SECRETS_MANAGER,
  [ServiceEndpointTypes.SSM]: defaults.ServiceEndpointTypes.SSM,
  [ServiceEndpointTypes.ECR_API]: defaults.ServiceEndpointTypes.ECR_API,
  [ServiceEndpointTypes.ECR_DKR]: defaults.ServiceEndpointTypes.ECR_DKR,
  [ServiceEndpointTypes.EVENTS]: defaults.ServiceEndpointTypes.EVENTS,
  [ServiceEndpointTypes.KINESIS_FIREHOSE]: defaults.ServiceEndpointTypes.KINESIS_FIREHOSE,
  [ServiceEndpointTypes.KINESIS_STREAMS]: defaults.ServiceEndpointTypes.KINESIS_STREAMS,
  [ServiceEndpointTypes.BEDROCK]: defaults.ServiceEndpointTypes.BEDROCK,
  [ServiceEndpointTypes.BEDROCK_RUNTIME]: defaults.ServiceEndpointTypes.BEDROCK_RUNTIME,
  [ServiceEndpointTypes.KENDRA]: defaults.ServiceEndpointTypes.KENDRA
};

// ============

// Create a response specifically for the interface to avoid coupling client with internal implementation
export interface VpcFactoryResponse {
  readonly vpc: ec2.IVpc,
}

export class VpcFactory {
  public static factory(scope: Construct, id: string, props: VpcFactoryProps): VpcFactoryResponse {
    defaults.CheckVpcProps(props);
    this.CheckVpcFactoryProps(props);

    const constructProps = this.CreateConstructProps(props);

    const newVpc = defaults.buildVpc(scope, {
      defaultVpcProps: {}, // all defaults are CDK L2 Vpc construct defaults
      userVpcProps: props.vpcProps,
      constructVpcProps: constructProps,
    }, id);

    if (props.endPoints) {
      props.endPoints.forEach((endPoint: ServiceEndpointTypes) => {
        const coreEndpointType = serviceEndpointTypeMap[endPoint];
        defaults.AddAwsServiceEndpoint(scope, newVpc, coreEndpointType);
      });
    }

    return {
      vpc: newVpc
    };
  }

  private static CreateConstructProps(props: VpcFactoryProps): ec2.VpcProps | undefined {

    if (props.vpcProps?.subnetConfiguration) {
      // Client has provided the subnet configuration, so is granted
      // full control (and responsbility for) the subnets - so no ConstructsProps required/allowed
      return undefined;
    } else {
      // Client has ceded responsibility for the subnetConfiguration to us, based upon
      // values they included in VpcFactoryProps. We map the array of subnet types they passed
      // into an array of ec2.SubnetConfiguration, adding a cidrMask if appropriate
      const subnetTyps = props.subnetTypes?.map(t => {
        const configurationBuilder: PropsBuilder<ec2.SubnetConfiguration> = {
          subnetType: t,
          name: subnetNameMap[t]
        };
        if (props.subnetIPAddresses) {
          configurationBuilder.cidrMask = defaults.calculateIpMaskSize(props.subnetIPAddresses);
        };
        return configurationBuilder as ec2.SubnetConfiguration;
      });

      return {
        subnetConfiguration: subnetTyps
      };
    }
  }

  private static CheckVpcFactoryProps(props: VpcFactoryProps) {
    let errorMessages = '';
    let errorFound = false;

    if (props.vpcProps?.subnetConfiguration && (props.subnetTypes || props.subnetIPAddresses)) {
      errorMessages += 'Error - Either provide complete subnetConfiguration in props.vpcProps.subnetConfiguration or subnetConfiguration info in props.subnetTypes and props.subnetIPAddresses, but not both\n';
      errorFound = true;
    }

    if (!(props.vpcProps && props.vpcProps.subnetConfiguration) && (!props.subnetTypes || (props.subnetTypes.length === 0))) {
      errorMessages += 'Error - subnet types must be provided in either props.vpcProps.subnetConfiguration or props.subnetTypes\n';
      errorFound = true;
    }

    if (props.vpcProps && props.endPoints &&
      (!defaults.CheckBooleanWithDefault(props.vpcProps.enableDnsHostnames, true)
      || !defaults.CheckBooleanWithDefault(props.vpcProps.enableDnsSupport, true)))
    {
      errorMessages += 'Error - VPC endpoints require that enableDnsHostnames and enableDnsSupport are both enabled\n';
      errorFound = true;
    }

    if (errorFound) {
      throw new Error(errorMessages);
    }
  }

}
