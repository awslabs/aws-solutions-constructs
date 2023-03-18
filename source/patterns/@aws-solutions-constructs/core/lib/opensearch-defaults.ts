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

import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { BuildOpenSearchProps } from './opensearch-helper';

export function DefaultOpenSearchCfnDomainProps(domainName: string, cognitoConfigureRole: iam.Role, props: BuildOpenSearchProps):
  opensearch.CfnDomainProps {
  const roleARNs: iam.IPrincipal[] = [];

  roleARNs.push(new iam.ArnPrincipal(props.cognitoAuthorizedRoleARN));

  if (props.serviceRoleARN) {
    roleARNs.push(new iam.ArnPrincipal(props.serviceRoleARN));
  }

  // Features supported by engine version:
  // https://docs.aws.amazon.com/opensearch-service/latest/developerguide/features-by-version.html
  // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_opensearchservice.CfnDomainProps.html
  return {
    domainName,
    engineVersion: 'OpenSearch_1.3',
    encryptionAtRestOptions: {
      enabled: true
    },
    nodeToNodeEncryptionOptions: {
      enabled: true
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
      identityPoolId: props.identitypool.ref,
      userPoolId: props.userpool.userPoolId,
      roleArn: cognitoConfigureRole.roleArn
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
  } as opensearch.CfnDomainProps;
}