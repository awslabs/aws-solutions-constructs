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

import {
  CfnNotebookInstanceProps,
  CfnModelProps,
  CfnModel,
  CfnEndpointConfigProps,
  CfnEndpointProps,
} from 'aws-cdk-lib/aws-sagemaker';

export function DefaultSagemakerNotebookProps(
  roleArn: string,
  kmsKeyId: string,
  subnetId?: string,
  securityGroupIds?: string[]
): CfnNotebookInstanceProps {
  return {
    instanceType: 'ml.t2.medium',
    roleArn,
    kmsKeyId,
    ...(subnetId && { subnetId, directInternetAccess: 'Disabled' }),
    ...(securityGroupIds && { securityGroupIds }),
  } as CfnNotebookInstanceProps;
}

export function DefaultSagemakerModelProps(
  executionRoleArn: string,
  primaryContainer: CfnModel.ContainerDefinitionProperty,
  vpcConfig?: CfnModel.VpcConfigProperty
): CfnModelProps {
  return {
    executionRoleArn,
    primaryContainer,
    ...(vpcConfig && { vpcConfig }),
  } as CfnModelProps;
}

export function DefaultSagemakerEndpointConfigProps(modelName: string, kmsKeyId?: string): CfnEndpointConfigProps {
  return {
    productionVariants: [
      {
        modelName,
        initialInstanceCount: 1,
        initialVariantWeight: 1.0,
        instanceType: 'ml.m4.xlarge',
        variantName: 'AllTraffic',
      },
    ],
    ...(kmsKeyId && { kmsKeyId }),
  } as CfnEndpointConfigProps;
}

export function DefaultSagemakerEndpointProps(endpointConfigName: string): CfnEndpointProps {
  return {
    endpointConfigName,
  } as CfnEndpointProps;
}
