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

import * as elasticsearch from '@aws-cdk/aws-elasticsearch';
import { CfnDomainOptions, DefaultCfnDomainProps } from './elasticsearch-defaults';
import { overrideProps } from './utils';
import * as iam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';

export function buildElasticSearch(scope: cdk.Construct, domainName: string,
  options: CfnDomainOptions, cfnDomainProps?: elasticsearch.CfnDomainProps): [elasticsearch.CfnDomain, iam.Role] {

  // Setup the IAM Role & policy for ES to configure Cognito User pool and Identity pool
  const cognitoKibanaConfigureRole = new iam.Role(scope, 'CognitoKibanaConfigureRole', {
    assumedBy: new iam.ServicePrincipal('es.amazonaws.com')
  });

  const cognitoKibanaConfigureRolePolicy = new iam.Policy(scope, 'CognitoKibanaConfigureRolePolicy', {
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
          "es:UpdateElasticsearchDomainConfig"
        ],
        resources: [
          options.userpool.userPoolArn,
          `arn:aws:cognito-identity:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:identitypool/${options.identitypool.ref}`,
          `arn:aws:es:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:domain/${domainName}`
        ]
      }),
      new iam.PolicyStatement({
        actions: [
          "iam:PassRole"
        ],
        conditions: {
          StringLike: {'iam:PassedToService': 'cognito-identity.amazonaws.com'}
        },
        resources: [
          cognitoKibanaConfigureRole.roleArn
        ]
      })
    ]
  });
  cognitoKibanaConfigureRolePolicy.attachToRole(cognitoKibanaConfigureRole);

  let _cfnDomainProps = DefaultCfnDomainProps(domainName, cognitoKibanaConfigureRole, options);

  if (cfnDomainProps) {
    _cfnDomainProps = overrideProps(_cfnDomainProps, cfnDomainProps);
  }

  const esDomain = new elasticsearch.CfnDomain(scope, 'ElasticsearchDomain', _cfnDomainProps);

  esDomain.cfnOptions.metadata = {
    cfn_nag: {
      rules_to_suppress: [{
        id: 'W28',
        reason: `The ES Domain is passed dynamically as as parameter and explicitly specified to ensure that IAM policies are configured to lockdown access to this specific ES instance only`
      }]
    }
  };

  return [esDomain, cognitoKibanaConfigureRole];
}

export function buildElasticSearchCWAlarms(scope: cdk.Construct): cloudwatch.Alarm[] {
  // Setup CW Alarms for ES
  const alarms: cloudwatch.Alarm[] = new Array();

  // ClusterStatus.red maximum is >= 1 for 1 minute, 1 consecutive time
  alarms.push(new cloudwatch.Alarm(scope, 'StatusRedAlarm', {
    metric: new cloudwatch.Metric({
      namespace: 'AWS/ES',
      metricName: 'ClusterStatus.red'
    }),
    threshold: 1,
    evaluationPeriods: 1,
    statistic: 'Maximum',
    period: cdk.Duration.seconds(60),
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    alarmDescription: 'At least one primary shard and its replicas are not allocated to a node. '
  }));

  // ClusterStatus.yellow maximum is >= 1 for 1 minute, 1 consecutive time
  alarms.push(new cloudwatch.Alarm(scope, 'StatusYellowAlarm', {
    metric: new cloudwatch.Metric({
      namespace: 'AWS/ES',
      metricName: 'ClusterStatus.yellow'
    }),
    threshold: 1,
    evaluationPeriods: 1,
    statistic: 'Maximum',
    period: cdk.Duration.seconds(60),
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    alarmDescription: 'At least one replica shard is not allocated to a node.'
  }));

  // FreeStorageSpace minimum is <= 20480 for 1 minute, 1 consecutive time
  alarms.push(new cloudwatch.Alarm(scope, 'FreeStorageSpaceTooLowAlarm', {
    metric: new cloudwatch.Metric({
      namespace: 'AWS/ES',
      metricName: 'FreeStorageSpace'
    }),
    threshold: 20000,
    evaluationPeriods: 1,
    statistic: 'Minimum',
    period: cdk.Duration.seconds(60),
    comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
    alarmDescription: 'A node in your cluster is down to 20 GiB of free storage space.'
  }));

  // ClusterIndexWritesBlocked is >= 1 for 5 minutes, 1 consecutive time
  alarms.push(new cloudwatch.Alarm(scope, 'IndexWritesBlockedTooHighAlarm', {
    metric: new cloudwatch.Metric({
      namespace: 'AWS/ES',
      metricName: 'ClusterIndexWritesBlocked'
    }),
    threshold: 1,
    evaluationPeriods: 1,
    statistic: 'Maximum',
    period: cdk.Duration.seconds(300),
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    alarmDescription: 'Your cluster is blocking write requests.'
  }));

  // AutomatedSnapshotFailure maximum is >= 1 for 1 minute, 1 consecutive time
  alarms.push(new cloudwatch.Alarm(scope, 'AutomatedSnapshotFailureTooHighAlarm', {
    metric: new cloudwatch.Metric({
      namespace: 'AWS/ES',
      metricName: 'AutomatedSnapshotFailure'
    }),
    threshold: 1,
    evaluationPeriods: 1,
    statistic: 'Maximum',
    period: cdk.Duration.seconds(60),
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    alarmDescription: 'An automated snapshot failed. This failure is often the result of a red cluster health status.'
  }));

  // CPUUtilization maximum is >= 80% for 15 minutes, 3 consecutive times
  alarms.push(new cloudwatch.Alarm(scope, 'CPUUtilizationTooHighAlarm', {
    metric: new cloudwatch.Metric({
      namespace: 'AWS/ES',
      metricName: 'CPUUtilization'
    }),
    threshold: 80,
    evaluationPeriods: 3,
    statistic: 'Average',
    period: cdk.Duration.seconds(900),
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    alarmDescription: '100% CPU utilization is not uncommon, but sustained high usage is problematic. Consider using larger instance types or adding instances.'
  }));

  // JVMMemoryPressure maximum is >= 80% for 5 minutes, 3 consecutive times
  alarms.push(new cloudwatch.Alarm(scope, 'JVMMemoryPressureTooHighAlarm', {
    metric: new cloudwatch.Metric({
      namespace: 'AWS/ES',
      metricName: 'JVMMemoryPressure'
    }),
    threshold: 80,
    evaluationPeriods: 1,
    statistic: 'Average',
    period: cdk.Duration.seconds(900),
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    alarmDescription: 'Average JVM memory pressure over last 15 minutes too high. Consider scaling vertically.'
  }));

  // MasterCPUUtilization maximum is >= 50% for 15 minutes, 3 consecutive times
  alarms.push(new cloudwatch.Alarm(scope, 'MasterCPUUtilizationTooHighAlarm', {
    metric: new cloudwatch.Metric({
      namespace: 'AWS/ES',
      metricName: 'MasterCPUUtilization'
    }),
    threshold: 50,
    evaluationPeriods: 3,
    statistic: 'Average',
    period: cdk.Duration.seconds(900),
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    alarmDescription: 'Average CPU utilization over last 45 minutes too high. Consider using larger instance types for your dedicated master nodes.'
  }));

  // MasterJVMMemoryPressure maximum is >= 80% for 15 minutes, 1 consecutive time
  alarms.push(new cloudwatch.Alarm(scope, 'MasterJVMMemoryPressureTooHighAlarm', {
    metric: new cloudwatch.Metric({
      namespace: 'AWS/ES',
      metricName: 'MasterJVMMemoryPressure'
    }),
    threshold: 50,
    evaluationPeriods: 1,
    statistic: 'Average',
    period: cdk.Duration.seconds(900),
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    alarmDescription: 'Average JVM memory pressure over last 15 minutes too high. Consider scaling vertically.'
  }));

  return alarms;
}
