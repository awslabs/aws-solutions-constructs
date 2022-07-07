/**
 *  Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { DefaultCfnDomainProps } from './elasticsearch-defaults';
import { consolidateProps, addCfnSuppressRules } from './utils';
import * as iam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';
import * as cognito from '@aws-cdk/aws-cognito';
import * as ec2 from '@aws-cdk/aws-ec2';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from '@aws-cdk/core';

export interface BuildElasticSearchProps {
  readonly identitypool: cognito.CfnIdentityPool,
  readonly userpool: cognito.UserPool,
  readonly cognitoAuthorizedRoleARN: string,
  readonly serviceRoleARN?: string,
  readonly vpc?: ec2.IVpc
}

export function buildElasticSearch(scope: Construct, domainName: string,
  props: BuildElasticSearchProps, cfnDomainProps?: elasticsearch.CfnDomainProps): [elasticsearch.CfnDomain, iam.Role] {

  let subnetIds: string[] = [];
  let clusterConfig: object = {};

  if (props.vpc) {
    subnetIds = getSubnetIds(props.vpc, cfnDomainProps);
    clusterConfig = { vpcOptions: { subnetIds } };
  }

  const cognitoKibanaConfigureRole = buildCognitoKibanaConfigureRole(scope);
  const cognitoKibanaConfigureRolePolicy = buildCognitoKibanaConfigureRolePolicy(scope, domainName, props, cognitoKibanaConfigureRole);
  cognitoKibanaConfigureRolePolicy.attachToRole(cognitoKibanaConfigureRole);

  const defaultCfnDomainProps = DefaultCfnDomainProps(domainName, cognitoKibanaConfigureRole, props);
  const zoneAwarenessConfig = buildZoneAwarenessConfig(subnetIds.length);
  const consolidatedProps = consolidateProps(clusterConfig, zoneAwarenessConfig, cfnDomainProps);
  const finalCfnDomainProps = consolidateProps(defaultCfnDomainProps, consolidatedProps);

  const esDomain = new elasticsearch.CfnDomain(scope, "ElasticsearchDomain", finalCfnDomainProps);

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

  return [esDomain, cognitoKibanaConfigureRole];
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

function getSubnetIds(vpc?: ec2.IVpc, domainProps?: elasticsearch.CfnDomainProps): string[] {
  if (vpc) {
    // To successfully deploy a ES cluster, construct will need to specify exactly same subnets number as cluster AZs number
    // To summarize: 1. Subnets number must equals to AZs number.   2. Each subnet belongs to different AZ.
    const startPosition: number = 0;
    let endPosition: number;
    let subnetIds = retrievePrivateSubnetIds(vpc);

    if (domainProps?.elasticsearchClusterConfig) {
      const zoneAwareness = checkZoneAwareness(domainProps);
      const twoAvailabilityZoneConfigFlag = checkTwoAvailabilityZoneConfig(domainProps);

      if (!zoneAwareness) {
        endPosition = 1;
      } else if (twoAvailabilityZoneConfigFlag) {
        endPosition = 2;
      } else {
        endPosition = 3;
      }

      subnetIds = selectSubnetIds(subnetIds, startPosition, endPosition);
    } else {
      endPosition = subnetIds.length;

      // If there are more than 3 AZ, only retrieve 3 subnets
      if (endPosition > 3) {
        endPosition = 3;
      }

      if (endPosition === 1) {
        throw new Error('Error - Availability Zone Count should have a minimum of 2');
      }

      subnetIds = selectSubnetIds(subnetIds, startPosition, endPosition);
    }

    return subnetIds;

  }

  return [];
}

function checkZoneAwareness(props: elasticsearch.CfnDomainProps): boolean {
  let zoneAwareness: boolean = false;

  if (props.elasticsearchClusterConfig && 'zoneAwarenessEnabled' in props.elasticsearchClusterConfig === false &&
    'zoneAwarenessConfig' in props.elasticsearchClusterConfig) {

    throw Error('Error - zoneAwarenessEnabled must be true to use zoneAwarenessConfig');
  }

  if (props.elasticsearchClusterConfig) {
    zoneAwareness = 'zoneAwarenessEnabled' in props.elasticsearchClusterConfig &&
      props.elasticsearchClusterConfig.zoneAwarenessEnabled === true;
  }

  return zoneAwareness;
}

function checkTwoAvailabilityZoneConfig(props: elasticsearch.CfnDomainProps): boolean {
  let twoAvailabilityZoneConfig: boolean = false;

  if (props.elasticsearchClusterConfig) {
    twoAvailabilityZoneConfig = 'zoneAwarenessConfig' in props.elasticsearchClusterConfig &&
      props.elasticsearchClusterConfig.zoneAwarenessConfig !== undefined &&
      'availabilityZoneCount' in props.elasticsearchClusterConfig.zoneAwarenessConfig &&
      props.elasticsearchClusterConfig.zoneAwarenessConfig.availabilityZoneCount === 2;
  }

  return twoAvailabilityZoneConfig;
}

function selectSubnetIds(subnetIds: string[], startPosition: number, endPosition: number): string[] {
  return subnetIds.slice(startPosition, endPosition);
}

function retrievePrivateSubnetIds(vpc: ec2.IVpc) {
  let targetSubnetType;

  if (vpc.isolatedSubnets.length) {
    targetSubnetType = ec2.SubnetType.PRIVATE_ISOLATED;
  } else if (vpc.privateSubnets.length) {
    targetSubnetType = ec2.SubnetType.PRIVATE_WITH_NAT;
  } else {
    throw new Error('Error - ElasticSearch Domains can only be deployed in Isolated or Private subnets');
  }

  const subnetSelector = {
    onePerAz: true,
    subnetType: targetSubnetType
  };

  return vpc.selectSubnets(subnetSelector).subnetIds;
}

function buildZoneAwarenessConfig(subnetIdsLength?: number): elasticsearch.CfnDomainProps {
  let clusterConfig = {};
  if (subnetIdsLength === 0) { // Public, Zone Awareness is Enabled
    clusterConfig = {
      elasticsearchClusterConfig: {
        zoneAwarenessConfig: {
          availabilityZoneCount: 3
        },
        instanceCount: 3,
      },
    };
  } else if (subnetIdsLength === 1) { // VPC, Zone Awareness is Disabled
    clusterConfig = {
      elasticsearchClusterConfig: {
        instanceCount: 3,
      },
    };
  } else { // VPC, Zone Awareness is Enabled
    clusterConfig = {
      elasticsearchClusterConfig: {
        zoneAwarenessConfig: {
          availabilityZoneCount: subnetIdsLength
        },
        instanceCount: subnetIdsLength,
      },
    };
  }

  return clusterConfig;
}

function buildCognitoKibanaConfigureRolePolicy(scope: Construct, domainName: string,
  props: BuildElasticSearchProps, cognitoKibanaConfigureRole: iam.Role) {
  return new iam.Policy(scope, 'CognitoKibanaConfigureRolePolicy', {
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
          props.userpool.userPoolArn,
          `arn:aws:cognito-identity:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:identitypool/${props.identitypool.ref}`,
          `arn:aws:es:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:domain/${domainName}`
        ]
      }),
      new iam.PolicyStatement({
        actions: [
          "iam:PassRole"
        ],
        conditions: {
          StringLike: { 'iam:PassedToService': 'cognito-identity.amazonaws.com' }
        },
        resources: [
          cognitoKibanaConfigureRole.roleArn
        ]
      })
    ]
  });
}

function buildCognitoKibanaConfigureRole(scope: Construct) {
  return new iam.Role(scope, 'CognitoKibanaConfigureRole', {
    assumedBy: new iam.ServicePrincipal('es.amazonaws.com')
  });
}