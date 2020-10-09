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

import * as elasticsearch from '@aws-cdk/aws-elasticsearch';
import * as cognito from '@aws-cdk/aws-cognito';
import * as iam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';

export interface CfnDomainOptions {
  readonly identitypool: cognito.CfnIdentityPool,
  readonly userpool: cognito.UserPool,
  readonly cognitoAuthorizedRoleARN: string,
  readonly serviceRoleARN?: string
}

export function DefaultCfnDomainProps(domainName: string, cognitoKibanaConfigureRole: iam.Role, options: CfnDomainOptions) {
  const roleARNs: iam.IPrincipal[] = [];

  roleARNs.push(new iam.ArnPrincipal(options.cognitoAuthorizedRoleARN));

  if (options.serviceRoleARN) {
    roleARNs.push(new iam.ArnPrincipal(options.serviceRoleARN));
  }

  return {
    domainName,
    elasticsearchVersion: '6.3',
    encryptionAtRestOptions: {
      enabled: true
    },
    nodeToNodeEncryptionOptions: {
      enabled: true
    },
    elasticsearchClusterConfig: {
      dedicatedMasterEnabled: true,
      dedicatedMasterCount: 3,
      instanceCount: 3,
      zoneAwarenessEnabled: true,
      zoneAwarenessConfig: {
        availabilityZoneCount: 3
      }
    },
    snapshotOptions: {
      automatedSnapshotStartHour: 1
    },
    ebsOptions: {
      ebsEnabled: true,
      volumeSize: 10
    },
    cognitoOptions: {
      enabled: true,
      identityPoolId: options.identitypool.ref,
      userPoolId: options.userpool.userPoolId,
      roleArn: cognitoKibanaConfigureRole.roleArn
    },
    accessPolicies: new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          principals: roleARNs,
          actions: [
            'es:ESHttp*'
          ],
          resources: [
            `arn:aws:es:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:domain/${domainName}/*`
          ]
        })
      ]
    })
  } as elasticsearch.CfnDomainProps;
}