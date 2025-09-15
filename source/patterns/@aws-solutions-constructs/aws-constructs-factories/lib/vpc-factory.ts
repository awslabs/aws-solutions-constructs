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

export enum VpcType {
  ISOLATED,
  PRIVATE,
  PUBLIC
}
export interface VpcFactoryProps {
  readonly vpcProps?: ec2.VpcProps | any,
  readonly vpcType?: VpcType,
  readonly endPoints?: ServiceEndpointTypes[]
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
  BEDROCK = "BEDROCK",
  BEDROCK_RUNTIME = "BEDROCK_RUNTIME",
  KENDRA = "KENDRA"
}

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

    let vpcType: VpcType;
    if (props.vpcType) {
      vpcType = props.vpcType;
    } else {
      vpcType = VpcType.ISOLATED;
    }
    const constructVpcProps = (props.endPoints && (props.endPoints.length > 0)) ?
      {
        enableDnsHostnames: true,
        enableDnsSupport: true,
      } :
      {};

    const defaultProps = this.chooseDefaultProps(vpcType);
    const newVpc = defaults.buildVpc(scope, {
      defaultVpcProps: defaultProps,
      userVpcProps: props.vpcProps,
      constructVpcProps,
    }, id);

    if (props.endPoints) {
      props.endPoints.forEach((endPoint: ServiceEndpointTypes) => {
        const coreEndpointType = serviceEndpointTypeMap[endPoint];
        defaults.AddAwsServiceEndpoint(scope, newVpc, coreEndpointType);
      });
    }

    return {
      vpc: newVpc,
    };
  }

  static chooseDefaultProps(vpcType: VpcType) {
    switch (vpcType) {
      case VpcType.ISOLATED:
        return defaults.DefaultIsolatedVpcProps();
      case VpcType.PRIVATE:
        return defaults.DefaultPrivateVpcProps();
      case VpcType.PUBLIC:
        return defaults.DefaultPublicPrivateVpcProps();
      default:
        throw new Error("Invalid VPC Type");
    }
  }
}
