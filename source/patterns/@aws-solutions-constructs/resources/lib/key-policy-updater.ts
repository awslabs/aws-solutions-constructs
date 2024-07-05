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

import * as cdk from "aws-cdk-lib";
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Aws, CustomResource } from 'aws-cdk-lib';
import { Provider } from "aws-cdk-lib/custom-resources";
import { buildLambdaFunction } from "@aws-solutions-constructs/core";
import { IKey } from "aws-cdk-lib/aws-kms";
import { Distribution } from "aws-cdk-lib/aws-cloudfront";
import { addCfnSuppressRulesForCustomResourceProvider } from "./utils";
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import * as defaults from '@aws-solutions-constructs/core';

export interface CreateKeyPolicyUpdaterResponse {
  readonly lambdaFunction: lambda.Function;
  readonly customResource: CustomResource;
}

export interface KeyPolicyUpdaterProps {
  readonly encryptionKey: IKey;
  readonly distribution: Distribution;
  readonly timeout?: cdk.Duration;
  readonly memorySize?: number;
}

export function createKeyPolicyUpdaterCustomResource(
  scope: Construct,
  id: string,
  props: KeyPolicyUpdaterProps
): CreateKeyPolicyUpdaterResponse {

  const lambdaFunction = buildLambdaFunction(scope, {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      description: 'Custom resource function that updates a provided key policy to allow CloudFront access.',
      timeout: props.timeout,
      memorySize: props.memorySize,
      code: lambda.Code.fromAsset(`${__dirname}/key-policy-updater-custom-resource`)
    }
  });

  const customResourceCmkPrivilegePolicy = new iam.Policy(scope, `${id}ResourceCmkPolicy`, {
    statements: [
      new iam.PolicyStatement({
        actions: ['kms:PutKeyPolicy', 'kms:GetKeyPolicy', 'kms:DescribeKey'],
        effect: iam.Effect.ALLOW,
        resources: [props.encryptionKey.keyArn]
      })
    ]
  });

  lambdaFunction.role?.attachInlinePolicy(customResourceCmkPrivilegePolicy);

  const kmsKeyPolicyUpdateProvider = new Provider(scope, 'KmsKeyPolicyUpdateProvider', {
    onEventHandler: lambdaFunction
  });

  addCfnSuppressRulesForCustomResourceProvider(kmsKeyPolicyUpdateProvider);

  const customResource = new CustomResource(scope, 'KmsKeyPolicyUpdater', {
    resourceType: 'Custom::KmsKeyPolicyUpdater',
    serviceToken: kmsKeyPolicyUpdateProvider.serviceToken,
    properties: {
      KmsKeyId: props.encryptionKey.keyId,
      CloudFrontDistributionId: props.distribution.distributionId,
      AccountId: Aws.ACCOUNT_ID
    },
  });

  return {
    lambdaFunction,
    customResource
  };
}