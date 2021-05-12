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

// Imports
import * as logs from '@aws-cdk/aws-logs';
import * as cdk from '@aws-cdk/core';
import * as smDefaults from './step-function-defaults';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import { overrideProps, generateResourceName } from './utils';
import * as iam from '@aws-cdk/aws-iam';
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';
import { buildLogGroup } from './cloudwatch-log-group-helper';

/**
 * Builds and returns a StateMachine.
 * @param scope - the construct to which the StateMachine should be attached to.
 * @param stateMachineProps - user-specified properties to override the default properties.
 */
export function buildStateMachine(scope: cdk.Construct, stateMachineProps: sfn.StateMachineProps,
  logGroupProps?: logs.LogGroupProps): [sfn.StateMachine, logs.LogGroup] {

  let consolidatedLogGroupProps = logGroupProps;

  // Three possibilities
  // 1) logGroupProps not provided - create logGroupProps with just logGroupName
  // 2) logGroupProps provided with no logGroupName - override logGroupProps.logGroupName
  // 3) logGroupProps provided with logGroupName - pass unaltered logGroupProps
  if (!consolidatedLogGroupProps) {
    consolidatedLogGroupProps = {};
  }
  if (!consolidatedLogGroupProps?.logGroupName) {
    const logGroupPrefix = '/aws/vendedlogs/states/';
    const maxResourceNameLength = 255 - logGroupPrefix.length;
    const nameParts: string[] = [
      cdk.Stack.of(scope).stackName, // Name of the stack
      scope.node.id,                 // Construct ID
      'StateMachineLog'              // Literal string for log group name portion
    ];

    const logGroupName = logGroupPrefix + generateResourceName(nameParts, maxResourceNameLength);
    consolidatedLogGroupProps = overrideProps(consolidatedLogGroupProps, { logGroupName });
  }

  // Configure Cloudwatch log group for Step function State Machine
  const logGroup = buildLogGroup(scope, 'StateMachineLogGroup', consolidatedLogGroupProps);

  // Override the defaults with the user provided props
  const _smProps = overrideProps(smDefaults.DefaultStateMachineProps(logGroup), stateMachineProps);

  // Override the Cloudwatch permissions to make it more fine grained
  const _sm = new sfn.StateMachine(scope, 'StateMachine', _smProps);
  const role = _sm.node.findChild('Role') as iam.Role;
  const cfnDefaultPolicy = role.node.findChild('DefaultPolicy').node.defaultChild as iam.CfnPolicy;

  // Reduce the scope of actions for the existing DefaultPolicy
  cfnDefaultPolicy.addPropertyOverride('PolicyDocument.Statement.0.Action',
    [
      "logs:CreateLogDelivery",
      'logs:GetLogDelivery',
      'logs:UpdateLogDelivery',
      'logs:DeleteLogDelivery',
      'logs:ListLogDeliveries'
    ]);

  // Override Cfn Nag warning W12: IAM policy should not allow * resource
  cfnDefaultPolicy.cfnOptions.metadata = {
    cfn_nag: {
      rules_to_suppress: [{
        id: 'W12',
        reason: `The 'LogDelivery' actions do not support resource-level authorizations`
      }]
    }
  };

  // Add a new policy with logging permissions for the given cloudwatch log group
  _sm.addToRolePolicy(new iam.PolicyStatement({
    actions: [
      'logs:PutResourcePolicy',
      'logs:DescribeResourcePolicies',
      'logs:DescribeLogGroups'
    ],
    resources: [`arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:*`]
  }));

  return [_sm, logGroup];
}

export function buildStepFunctionCWAlarms(scope: cdk.Construct, sm: sfn.StateMachine): cloudwatch.Alarm[] {
  // Setup CW Alarms for State Machine
  const alarms: cloudwatch.Alarm[] = new Array();

  // Sum of number of executions that failed is >= 1 for 5 minutes, 1 consecutive time
  alarms.push(new cloudwatch.Alarm(scope, 'ExecutionFailedAlarm', {
    metric: sm.metricFailed(),
    threshold: 1,
    evaluationPeriods: 1,
    statistic: 'Sum',
    period: cdk.Duration.seconds(300),
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    alarmDescription: 'Alarm for the number of executions that failed exceeded the threshold of 1. '
  }));

  // Sum of number of executions that failed maximum is >= 1 for 5 minute, 1 consecutive time
  alarms.push(new cloudwatch.Alarm(scope, 'ExecutionThrottledAlarm', {
    metric: sm.metricThrottled(),
    threshold: 1,
    evaluationPeriods: 1,
    statistic: 'Sum',
    period: cdk.Duration.seconds(300),
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    alarmDescription: 'Alarm for the number of executions that throttled exceeded the threshold of 1. '
  }));

  // Number of executions that aborted maximum is >= 1 for 5 minute, 1 consecutive time
  alarms.push(new cloudwatch.Alarm(scope, 'ExecutionAbortedAlarm', {
    metric: sm.metricAborted(),
    threshold: 1,
    evaluationPeriods: 1,
    statistic: 'Maximum',
    period: cdk.Duration.seconds(300),
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    alarmDescription: 'Alarm for the number of executions that aborted exceeded the threshold of 1. '
  }));

  return alarms;
}