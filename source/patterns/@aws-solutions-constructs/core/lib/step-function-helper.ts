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

// Imports
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cdk from 'aws-cdk-lib';
import * as smDefaults from './step-function-defaults';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import { overrideProps, addL1CfnSuppressRules, generatePhysicalLogGroupName } from './utils';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { buildLogGroup } from './cloudwatch-log-group-helper';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

/*
 * the id parameter was added to buildStateMachine() long after the original implementation,
 * this value can be used for the new parameter and ensure behavior is the same.
 * (if we just require an id, the state machine name will be changed and it will be a
 * destructive change)
 */
export const idPlaceholder = undefined;

export interface BuildStateMacineProps {
  readonly stateMachineProps: sfn.StateMachineProps,
  readonly logGroupProps?: logs.LogGroupProps,
  readonly createCloudWatchAlarms?: boolean,
  readonly cloudWatchAlarmsPrefix?: string
}

export interface BuildStateMachineResponse {
  readonly stateMachine: sfn.StateMachine,
  readonly logGroup: logs.ILogGroup,
  readonly cloudWatchAlarms?: cloudwatch.Alarm[]
}
/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 *
 * Builds and returns a StateMachine.
 * @param scope - the construct to which the StateMachine should be attached to.
 * @param stateMachineProps - user-specified properties to override the default properties.
 */
export function buildStateMachine(scope: Construct, id: string | undefined, props: BuildStateMacineProps): BuildStateMachineResponse {

  let logGroup: logs.ILogGroup;
  let consolidatedStateMachineProps;

  // If they sent a logGroup in stateMachineProps
  if (props.stateMachineProps.logs?.destination) {
    logGroup = props.stateMachineProps.logs?.destination;
    consolidatedStateMachineProps = props.stateMachineProps;
  } else {
    // Three possibilities
    // 1) logGroupProps not provided - create logGroupProps with just logGroupName
    // 2) logGroupProps provided with no logGroupName - override logGroupProps.logGroupName
    // 3) logGroupProps provided with logGroupName - pass unaltered logGroupProps
    let consolidatedLogGroupProps = props.logGroupProps;

    if (!consolidatedLogGroupProps) {
      consolidatedLogGroupProps = {};
    }

    if (!consolidatedLogGroupProps?.logGroupName) {
      const logGroupPrefix = '/aws/vendedlogs/states/constructs/';
      const nameParts: string[] = [
        cdk.Stack.of(scope).stackName, // Name of the stack
        id ?? scope.node.id,           // Use the ID from client if provided, otherwise use the construct ID
        'StateMachineLog'              // Literal string for log group name portion
      ];

      const logGroupName = generatePhysicalLogGroupName(logGroupPrefix, nameParts);
      consolidatedLogGroupProps = overrideProps(consolidatedLogGroupProps, { logGroupName });
    }

    // Create new Cloudwatch log group for Step function State Machine
    logGroup = buildLogGroup(scope, `StateMachineLogGroup${(id ?? '')}`, consolidatedLogGroupProps);

    // Override the defaults with the user provided props
    consolidatedStateMachineProps = overrideProps(smDefaults.DefaultStateMachineProps(logGroup), props.stateMachineProps);
  }

  // Override the Cloudwatch permissions to make it more fine grained
  const newStateMachine = new sfn.StateMachine(scope, `StateMachine${(id ?? '')}`, consolidatedStateMachineProps);

  // If the client did not pass a role we got the default role and will trim the privileges
  if (!props.stateMachineProps.role) {
    const role = newStateMachine.node.findChild('Role') as iam.Role;
    const cfnDefaultPolicy = role.node.findChild('DefaultPolicy').node.defaultChild as any;
    // Override Cfn Nag warning W12: IAM policy should not allow * resource
    addL1CfnSuppressRules(cfnDefaultPolicy, [
      {
        id: 'W12',
        reason: `These are CDK defaults. The 'LogDelivery' actions do not support resource-level authorizations. Any logging is done by State Machine code`
      }
    ]);
  }
  const createCloudWatchAlarms: boolean = (props.createCloudWatchAlarms === undefined || props.createCloudWatchAlarms);
  const cloudWatchAlarms = createCloudWatchAlarms ? buildStepFunctionCWAlarms(scope, props.cloudWatchAlarmsPrefix, newStateMachine) : undefined;

  return {
    stateMachine: newStateMachine,
    logGroup,
    cloudWatchAlarms
  };
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function buildStepFunctionCWAlarms(scope: Construct, id: string | undefined, sm: sfn.StateMachine): cloudwatch.Alarm[] {
  // Setup CW Alarms for State Machine
  const alarms: cloudwatch.Alarm[] = new Array();
  const prefix = id ?? "";

  // Sum of number of executions that failed is >= 1 for 5 minutes, 1 consecutive time
  alarms.push(new cloudwatch.Alarm(scope, `${prefix}ExecutionFailedAlarm`, {
    metric: sm.metricFailed({
      statistic: 'Sum',
      period: cdk.Duration.seconds(300),
    }),
    threshold: 1,
    evaluationPeriods: 1,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    alarmDescription: 'Alarm for the number of executions that failed exceeded the threshold of 1. '
  }));

  // Sum of number of executions that failed maximum is >= 1 for 5 minute, 1 consecutive time
  alarms.push(new cloudwatch.Alarm(scope, `${prefix}ExecutionThrottledAlarm`, {
    metric: sm.metricThrottled({
      statistic: 'Sum',
      period: cdk.Duration.seconds(300),
    }),
    threshold: 1,
    evaluationPeriods: 1,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    alarmDescription: 'Alarm for the number of executions that throttled exceeded the threshold of 1. '
  }));

  // Number of executions that aborted maximum is >= 1 for 5 minute, 1 consecutive time
  alarms.push(new cloudwatch.Alarm(scope, `${prefix}ExecutionAbortedAlarm`, {
    metric: sm.metricAborted({
      statistic: 'Maximum',
      period: cdk.Duration.seconds(300),
    }),
    threshold: 1,
    evaluationPeriods: 1,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    alarmDescription: 'Alarm for the number of executions that aborted exceeded the threshold of 1. '
  }));

  return alarms;
}

export interface StateMachineProps {
  readonly stateMachineProps?: sfn.StateMachineProps;
  readonly existingStateMachineObj?: sfn.StateMachine;
  readonly createCloudWatchAlarms?: boolean;
  readonly cloudWatchAlarmsPrefix?: string
  readonly logGroupProps?: logs.LogGroupProps;
}

export function CheckStateMachineProps(propsObject: StateMachineProps | any) {
  let errorMessages = '';
  let errorFound = false;

  if ((propsObject.createCloudWatchAlarms === false) && propsObject.cloudWatchAlarmsPrefix) {
    errorMessages += 'Error - cloudWatchAlarmsPrefix is invalid when createCloudWatchAlarms is false\n';
    errorFound = true;
  }

  if ((propsObject.existingStateMachineObj) &&
    (propsObject.stateMachineProps ||
      (propsObject.createCloudWatchAlarms !== undefined) ||
      propsObject.cloudWatchAlarmsPrefix ||
      propsObject.logGroupProps)) {

    errorMessages += 'ERROR - If existingStateMachine is provided, no other state machine props are allowed\n';
    errorFound = true;
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }
}
