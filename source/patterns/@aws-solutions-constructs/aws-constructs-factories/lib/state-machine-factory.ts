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

// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as defaults from '@aws-solutions-constructs/core';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

export interface StateMachineFactoryProps {
  /**
   * The CDK properties that define the state machine. This property is required and
   * must include a definitionBody or definition (definition is deprecated)
   */
  readonly stateMachineProps: sfn.StateMachineProps,
  /**
   * An existing LogGroup to which the new state machine will write log entries.
   *
   * Default: none, the construct will create a new log group.
   */
  readonly logGroupProps?: logs.LogGroupProps
  /**
   * Whether to create recommended CloudWatch alarms
   *
   * @default - Alarms are created
   */
  readonly createCloudWatchAlarms?: boolean,
  /**
   * Creating multiple State Machines in 1 stack with constructs will
   * result in name collisions as the cloudwatch alarms originally had fixed resource ids.
   * This value was added to avoid collisions while not making changes that would be
   * destructive for existing stacks. Unless you are creating multiple State Machines using constructs
   * you can ignore it.
   *
   * @default - undefined
   */
  readonly cloudWatchAlarmsPrefix?: string
}

// Create a response specifically for the interface to avoid coupling client with internal implementation
export interface StateMachineFactoryResponse {
  /**
   * The state machine created by the factory (the state machine role is
   * available as a property on this resource)
   */
  readonly stateMachine: sfn.StateMachine,
  /**
   * The log group that will receive log messages from the state maching
   */
  readonly logGroup: logs.ILogGroup
  /*
   * The alarms created by the factory (ExecutionFailed, ExecutionThrottled, ExecutionAborted)
   */
  readonly cloudwatchAlarms?: cloudwatch.Alarm[];
}

export class StateMachineFactory {

  public static factory(scope: Construct, id: string, props: StateMachineFactoryProps): StateMachineFactoryResponse {
      const buildStateMachineResponse = defaults.buildStateMachine(scope, id, {
        stateMachineProps: props.stateMachineProps,
        logGroupProps: props.logGroupProps,
        createCloudWatchAlarms: props.createCloudWatchAlarms,
        cloudWatchAlarmsPrefix: props.cloudWatchAlarmsPrefix
      });
      return {
        stateMachine: buildStateMachineResponse.stateMachine,
        logGroup: buildStateMachineResponse.logGroup,
        cloudwatchAlarms: buildStateMachineResponse.cloudWatchAlarms
      };
    }
  }
