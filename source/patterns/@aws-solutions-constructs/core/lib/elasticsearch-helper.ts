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

import * as elasticsearch from 'aws-cdk-lib/aws-elasticsearch';
import { DefaultCfnDomainProps } from './elasticsearch-defaults';
import { retrievePrivateSubnetIds } from './vpc-helper';
import { consolidateProps, addCfnSuppressRules } from './utils';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

const MaximumAzsInElasticsearchDomain = 3;

export interface BuildElasticSearchProps {
  readonly identitypool: cognito.CfnIdentityPool;
  readonly userpool: cognito.UserPool;
  readonly cognitoAuthorizedRoleARN: string;
  readonly serviceRoleARN?: string;
  readonly vpc?: ec2.IVpc;
  readonly domainName: string;
  readonly clientDomainProps?: elasticsearch.CfnDomainProps,
  readonly securityGroupIds?: string[]
}

export interface BuildElasticSearchResponse {
  readonly domain: elasticsearch.CfnDomain,
  readonly role: iam.Role
}

export function buildElasticSearch(scope: Construct, props: BuildElasticSearchProps): BuildElasticSearchResponse {

  let subnetIds: string[] = [];
  const constructDrivenProps: any = {};

  // Setup the IAM Role & policy for ES to configure Cognito User pool and Identity pool
  const cognitoKibanaConfigureRole = createKibanaCognitoRole(scope, props.userpool, props.identitypool, props.domainName);

  if (props.vpc) {
    subnetIds = retrievePrivateSubnetIds(props.vpc);

    if (subnetIds.length > MaximumAzsInElasticsearchDomain) {
      subnetIds = subnetIds.slice(0, MaximumAzsInElasticsearchDomain);
    }

    constructDrivenProps.vpcOptions = {
      subnetIds,
      securityGroupIds: props.securityGroupIds
    };

    // If the client did not submit a ClusterConfig, then we will create one
    if (!props.clientDomainProps?.elasticsearchClusterConfig) {
      constructDrivenProps.elasticsearchClusterConfig = createClusterConfiguration(subnetIds.length);
    }
  } else { // No VPC
    // If the client did not submit a ClusterConfig, then we will create one based on the Region
    if (!props.clientDomainProps?.elasticsearchClusterConfig) {
      constructDrivenProps.elasticsearchClusterConfig = createClusterConfiguration(cdk.Stack.of(scope).availabilityZones.length);
    }
  }

  const defaultCfnDomainProps = DefaultCfnDomainProps(props.domainName, cognitoKibanaConfigureRole, props);
  const finalCfnDomainProps = consolidateProps(defaultCfnDomainProps, props.clientDomainProps, constructDrivenProps);

  const esDomain = new elasticsearch.CfnDomain(scope, `ElasticsearchDomain`, finalCfnDomainProps);

  addCfnSuppressRules(esDomain, [
    {
      id: "W28",
      reason: `The ES Domain is passed dynamically as as parameter and explicitly specified to ensure that IAM policies are configured to lockdown access to this specific ES instance only`,
    },
    {
      id: "W90",
      reason: `This is not a rule for the general case, just for specific use cases/industries`,
    },
  ]);

  return { domain: esDomain, role: cognitoKibanaConfigureRole };
}

export function buildElasticSearchCWAlarms(scope: Construct): cloudwatch.Alarm[] {
  // Setup CW Alarms for ES
  const alarms: cloudwatch.Alarm[] = new Array();

  // ClusterStatus.red maximum is >= 1 for 1 minute, 1 consecutive time
  alarms.push(new cloudwatch.Alarm(scope, 'StatusRedAlarm', {
    metric: new cloudwatch.Metric({
      namespace: 'AWS/ES',
      metricName: 'ClusterStatus.red',
      statistic: 'Maximum',
      period: cdk.Duration.seconds(60),
    }),
    threshold: 1,
    evaluationPeriods: 1,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    alarmDescription: 'At least one primary shard and its replicas are not allocated to a node. '
  }));

  // ClusterStatus.yellow maximum is >= 1 for 1 minute, 1 consecutive time
  alarms.push(new cloudwatch.Alarm(scope, 'StatusYellowAlarm', {
    metric: new cloudwatch.Metric({
      namespace: 'AWS/ES',
      metricName: 'ClusterStatus.yellow',
      statistic: 'Maximum',
      period: cdk.Duration.seconds(60),
    }),
    threshold: 1,
    evaluationPeriods: 1,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    alarmDescription: 'At least one replica shard is not allocated to a node.'
  }));

  // FreeStorageSpace minimum is <= 20480 for 1 minute, 1 consecutive time
  alarms.push(new cloudwatch.Alarm(scope, 'FreeStorageSpaceTooLowAlarm', {
    metric: new cloudwatch.Metric({
      namespace: 'AWS/ES',
      metricName: 'FreeStorageSpace',
      statistic: 'Minimum',
      period: cdk.Duration.seconds(60),
    }),
    threshold: 20000,
    evaluationPeriods: 1,
    comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
    alarmDescription: 'A node in your cluster is down to 20 GiB of free storage space.'
  }));

  // ClusterIndexWritesBlocked is >= 1 for 5 minutes, 1 consecutive time
  alarms.push(new cloudwatch.Alarm(scope, 'IndexWritesBlockedTooHighAlarm', {
    metric: new cloudwatch.Metric({
      namespace: 'AWS/ES',
      metricName: 'ClusterIndexWritesBlocked',
      statistic: 'Maximum',
      period: cdk.Duration.seconds(300),
    }),
    threshold: 1,
    evaluationPeriods: 1,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    alarmDescription: 'Your cluster is blocking write requests.'
  }));

  // AutomatedSnapshotFailure maximum is >= 1 for 1 minute, 1 consecutive time
  alarms.push(new cloudwatch.Alarm(scope, 'AutomatedSnapshotFailureTooHighAlarm', {
    metric: new cloudwatch.Metric({
      namespace: 'AWS/ES',
      metricName: 'AutomatedSnapshotFailure',
      statistic: 'Maximum',
      period: cdk.Duration.seconds(60),
    }),
    threshold: 1,
    evaluationPeriods: 1,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    alarmDescription: 'An automated snapshot failed. This failure is often the result of a red cluster health status.'
  }));

  // CPUUtilization maximum is >= 80% for 15 minutes, 3 consecutive times
  alarms.push(new cloudwatch.Alarm(scope, 'CPUUtilizationTooHighAlarm', {
    metric: new cloudwatch.Metric({
      namespace: 'AWS/ES',
      metricName: 'CPUUtilization',
      statistic: 'Average',
      period: cdk.Duration.seconds(900),
    }),
    threshold: 80,
    evaluationPeriods: 3,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    alarmDescription: '100% CPU utilization is not uncommon, but sustained high usage is problematic. Consider using larger instance types or adding instances.'
  }));

  // JVMMemoryPressure maximum is >= 80% for 5 minutes, 3 consecutive times
  alarms.push(new cloudwatch.Alarm(scope, 'JVMMemoryPressureTooHighAlarm', {
    metric: new cloudwatch.Metric({
      namespace: 'AWS/ES',
      metricName: 'JVMMemoryPressure',
      statistic: 'Average',
      period: cdk.Duration.seconds(900),
    }),
    threshold: 80,
    evaluationPeriods: 1,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    alarmDescription: 'Average JVM memory pressure over last 15 minutes too high. Consider scaling vertically.'
  }));

  // MasterCPUUtilization maximum is >= 50% for 15 minutes, 3 consecutive times
  alarms.push(new cloudwatch.Alarm(scope, 'MasterCPUUtilizationTooHighAlarm', {
    metric: new cloudwatch.Metric({
      namespace: 'AWS/ES',
      metricName: 'MasterCPUUtilization',
      statistic: 'Average',
      period: cdk.Duration.seconds(900),
    }),
    threshold: 50,
    evaluationPeriods: 3,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    alarmDescription: 'Average CPU utilization over last 45 minutes too high. Consider using larger instance types for your dedicated master nodes.'
  }));

  // MasterJVMMemoryPressure maximum is >= 80% for 15 minutes, 1 consecutive time
  alarms.push(new cloudwatch.Alarm(scope, 'MasterJVMMemoryPressureTooHighAlarm', {
    metric: new cloudwatch.Metric({
      namespace: 'AWS/ES',
      metricName: 'MasterJVMMemoryPressure',
      statistic: 'Average',
      period: cdk.Duration.seconds(900),
    }),
    threshold: 50,
    evaluationPeriods: 1,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    alarmDescription: 'Average JVM memory pressure over last 15 minutes too high. Consider scaling vertically.'
  }));

  return alarms;
}

function createClusterConfiguration(numberOfAzs?: number): elasticsearch.CfnDomain.ElasticsearchClusterConfigProperty {
  return {
    dedicatedMasterEnabled: true,
    dedicatedMasterCount: 3,
    zoneAwarenessEnabled: true,
    zoneAwarenessConfig: {
      availabilityZoneCount: numberOfAzs
    },
    instanceCount: numberOfAzs,
  };
}

function createKibanaCognitoRole(
  scope: Construct,
  userPool: cognito.UserPool,
  identitypool: cognito.CfnIdentityPool,
  domainName: string
): iam.Role {
  // Setup the IAM Role & policy for ES to configure Cognito User pool and Identity pool
  const cognitoKibanaConfigureRole = new iam.Role(
    scope,
    "CognitoKibanaConfigureRole",
    {
      assumedBy: new iam.ServicePrincipal("es.amazonaws.com"),
    }
  );

  const cognitoKibanaConfigureRolePolicy = new iam.Policy(
    scope,
    "CognitoKibanaConfigureRolePolicy",
    {
      statements: [
        new iam.PolicyStatement({
          actions: [
            "cognito-idp:DescribeUserPool",
            "cognito-idp:CreateUserPoolClient",
            "cognito-idp:DeleteUserPoolClient",
            "cognito-idp:DescribeUserPoolClient",
            "cognito-idp:AdminInitiateAuth",
            "cognito-idp:AdminUserGlobalSignOut",
            "cognito-idp:ListUserPoolClients",
            "cognito-identity:DescribeIdentityPool",
            "cognito-identity:UpdateIdentityPool",
            "cognito-identity:SetIdentityPoolRoles",
            "cognito-identity:GetIdentityPoolRoles",
            "es:UpdateElasticsearchDomainConfig",
          ],
          resources: [
            userPool.userPoolArn,
            `arn:aws:cognito-identity:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:identitypool/${identitypool.ref}`,
            `arn:aws:es:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:domain/${domainName}`,
          ],
        }),
        new iam.PolicyStatement({
          actions: ["iam:PassRole"],
          conditions: {
            StringLike: {
              "iam:PassedToService": "cognito-identity.amazonaws.com",
            },
          },
          resources: [cognitoKibanaConfigureRole.roleArn],
        }),
      ],
    }
  );

  cognitoKibanaConfigureRolePolicy.attachToRole(cognitoKibanaConfigureRole);
  return cognitoKibanaConfigureRole;
}
