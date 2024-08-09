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

import * as kendra from 'aws-cdk-lib/aws-kendra';
import * as iam from 'aws-cdk-lib/aws-iam';
import { addCfnGuardSuppressRules, addCfnSuppressRules, consolidateProps, generatePhysicalName, overrideProps } from "./utils";
import { Aws } from 'aws-cdk-lib';

// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import { DefaultKendraIndexProps } from './kendra-defaults';

export interface BuildKendraIndexProps {
  readonly kendraIndexProps?: kendra.CfnIndexProps | any;
  /**
   * Existing instance of Kendra Index object, Providing both this and kendraIndexProps will cause an error.
   *
   * @default - None
   */
  readonly existingIndexObj?: kendra.CfnIndex;
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function buildKendraIndex(scope: Construct, id: string, props: BuildKendraIndexProps): kendra.CfnIndex {
  // Conditional lambda function creation
  if (props.existingIndexObj) {
    // The client provided an Index, so we'll do nothing and return it to them
    return props.existingIndexObj;
  } else {

    let indexRoleArn: string = "";

    // If the client provided a role, then don't bother creating a new one that we don't need
    if (!props.kendraIndexProps?.roleArn) {
      indexRoleArn = CreateKendraIndexLoggingRole(scope, id);
    }
    const defaultIndexProperties = DefaultKendraIndexProps(id, indexRoleArn);

    const consolidatedIndexProperties = consolidateProps(defaultIndexProperties, props.kendraIndexProps);
    const newIndex = new kendra.CfnIndex(scope, `kendra-index-${id}`, consolidatedIndexProperties);
    addCfnSuppressRules(newIndex, [{
      id: "W80",
      reason: "We consulted the Kendra TFC and they confirmed the default encryption is sufficient for general use cases"
    }]);

    return newIndex;
  }
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function AddMultipleKendraDataSources(scope: Construct,
  id: string,
  kendraIndex: kendra.CfnIndex,
  clientDataSourceProps: Array<Partial<kendra.CfnDataSourceProps>>): kendra.CfnDataSource[] {

  const returnDataSources: kendra.CfnDataSource[] = [];
  clientDataSourceProps.forEach((props, index) => {
    returnDataSources.push(AddKendraDataSource(scope, `${id}${index}`, kendraIndex, props));
  });
  return returnDataSources;
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function AddKendraDataSource(scope: Construct,
  id: string, index: kendra.CfnIndex,
  clientDataSourceProps: kendra.CfnDataSourceProps | any): kendra.CfnDataSource {

  if  (clientDataSourceProps.type === 'S3') {
    return CreateS3DataSource(scope, index, id, clientDataSourceProps);
  } else {
    if (clientDataSourceProps.indexId) {
      throw new Error('Invalid DataSource prop specified - Construct must set the indexId prop');
    }
    return new kendra.CfnDataSource(scope, `kendra-data-source-${id}`, {
      ...clientDataSourceProps,
      indexId: index.attrId
    });
  }
}

function CreateS3DataSource(scope: Construct,
  targetIndex: kendra.CfnIndex,
  id: string,
  clientProps: Partial<kendra.CfnDataSourceProps>): kendra.CfnDataSource {

  // We go through some hoops here to extract the various inputs, because we need to narrow
  // the type to remove the union with IResolvable
  const dataSourceConfig = clientProps.dataSourceConfiguration as kendra.CfnDataSource.DataSourceConfigurationProperty;
  if (!dataSourceConfig) {
    throw new Error('Error - an S3 Kendra DataSource requires an DataSourceConfiguration prop');
  }

  const s3DataSourceConfig = dataSourceConfig.s3Configuration as kendra.CfnDataSource.S3DataSourceConfigurationProperty;

  if (!s3DataSourceConfig) {
    throw new Error('Error - an S3 Kendra DataSource requires an DataSourceConfiguration.S3Configuration prop');
  }

  // No Bucket name is an error
  if (!s3DataSourceConfig.bucketName) {
    throw new Error('Error - an S3 Kendra DataSource requires the DataSourceConfiguration.S3Configuration.bucketName prop');
  }

  // If there's no role, make a role and put it into defaultProps
  // Put bucket name in default props
  let defaultProps: kendra.CfnDataSourceProps = {
    indexId: targetIndex.ref,
    name: generatePhysicalName('', ['s3-datasource', id], 1000),
    type: 'S3'
  };

  // Return consolidated default and user props
  if (!clientProps.roleArn) {
    const s3CrawlPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          actions: [
            "s3:GetObject"
          ],
          resources: [
            `arn:aws:s3:::${s3DataSourceConfig.bucketName}/*`
          ],
          effect: iam.Effect.ALLOW
        }),
        new iam.PolicyStatement({
          actions: [
            "s3:ListBucket"
          ],
          resources: [
            `arn:aws:s3:::${s3DataSourceConfig.bucketName}`
          ],
          effect: iam.Effect.ALLOW
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "kendra:BatchPutDocument",
            "kendra:BatchDeleteDocument"
          ],
          resources: [
            targetIndex.attrArn
          ]
        }),
      ]
    });

    const dataSourceRole: iam.Role = new iam.Role(scope, `data-source-role-${id}`, {
      assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'),
      description: 'Policy for Kendra S3 Data Source',
      inlinePolicies: {
        s3CrawlPolicy,
      },
    });
    defaultProps = overrideProps(defaultProps, { roleArn: dataSourceRole.roleArn });
    addCfnGuardSuppressRules(dataSourceRole, ["IAM_NO_INLINE_POLICY_CHECK"]);
  }

  const consolidatedProps: kendra.CfnDataSourceProps = consolidateProps(defaultProps, clientProps);

  return new kendra.CfnDataSource(scope, `data-source-${id}`, consolidatedProps);

}

function CreateKendraIndexLoggingRole(scope: Construct, id: string): string {
  const allowKendraToLogPolicy = new iam.PolicyDocument({
    statements: [
      new iam.PolicyStatement({
        resources: ['*'],
        actions: [
          "cloudwatch:PutMetricData"
        ],
        effect: iam.Effect.ALLOW,
        conditions: {
          StringEquals: {
            "cloudwatch:namespace": "AWS/Kendra"
          }
        }
      }),
      new iam.PolicyStatement({
        resources: [`arn:aws:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:log-group:/aws/kendra/*`],
        actions: [
          "logs:CreateLogGroup"
        ],
        effect: iam.Effect.ALLOW,
      }),
      new iam.PolicyStatement({
        resources: [`arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:log-group:/aws/kendra/*`],
        actions: [
          "logs:DescribeLogGroups"
        ],
        effect: iam.Effect.ALLOW,
      }),
      new iam.PolicyStatement({
        resources: [`arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:log-group:/aws/kendra/*:log-stream:*`],
        actions: [
          'logs:CreateLogStream',
          'logs:PutLogEvents',
          'logs:DescribeLogStream',
        ],
        effect: iam.Effect.ALLOW,
      }),
    ],
  });

  const indexRole: iam.Role = new iam.Role(scope, `kendra-index-role-${id}`, {
    assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'),
    description: 'Allow Kendra index to write CloudWatch Logs',
    inlinePolicies: {
      AllowLogging: allowKendraToLogPolicy,
    },
  });
  addCfnSuppressRules(indexRole, [{
    id: "W11",
    reason: "PutMetricData does not allow resource specification, " +
      "scope is narrowed by the namespace condition. " +
      "https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazoncloudwatch.html"
  }]);
  addCfnGuardSuppressRules(indexRole, ["IAM_NO_INLINE_POLICY_CHECK"]);

  return indexRole.roleArn;
}

// @summary Confirm each entry is a correct value, uppercase each entry
export function normalizeKendraPermissions(rawPermissions: string[]): string[] {
  const validPermissions = ["READ", "SUBMITFEEDBACK", "WRITE"];

  const result = rawPermissions.map<string>((s) => {
    const upperCaseValue = s.toUpperCase();
    if (!validPermissions.includes(upperCaseValue)) {
      throw new Error(`Invalid indexPermission value - valid values are "READ", "SUBMITFEEDBACK" and "WRITE"`);
    }
    return upperCaseValue;
  });
  return result;
}
