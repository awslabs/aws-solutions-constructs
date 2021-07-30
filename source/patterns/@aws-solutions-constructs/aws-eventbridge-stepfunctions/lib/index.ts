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

import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as events from '@aws-cdk/aws-events';
import * as defaults from '@aws-solutions-constructs/core';
import * as iam from '@aws-cdk/aws-iam';
import { Construct } from '@aws-cdk/core';
import { overrideProps } from '@aws-solutions-constructs/core';
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';
import * as logs from '@aws-cdk/aws-logs';

/**
 * @summary The properties for the EventbridgeToStepfunctions Construct
 */
export interface EventbridgeToStepfunctionsProps {
  /**
   * User provided StateMachineProps to override the defaults
   *
   * @default - None
   */
  readonly stateMachineProps: sfn.StateMachineProps,
  /**
   * User provided eventRuleProps to override the defaults
   *
   * @default - None
   */
  readonly eventRuleProps: events.RuleProps,
  /**
   * Whether to create recommended CloudWatch alarms
   *
   * @default - Alarms are created
   */
  readonly createCloudWatchAlarms?: boolean,
  /**
   * User provided props to override the default props for the CloudWatchLogs LogGroup.
   *
   * @default - Default props are used
   */
  readonly logGroupProps?: logs.LogGroupProps
}

export class EventbridgeToStepfunctions extends Construct {
  public readonly stateMachine: sfn.StateMachine;
  public readonly stateMachineLogGroup: logs.ILogGroup;
  public readonly eventsRule: events.Rule;
  public readonly cloudwatchAlarms?: cloudwatch.Alarm[];

  /**
   * @summary Constructs a new instance of the EventbridgeToStepfunctions class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {EventbridgeToStepfunctionsProps} props - user provided props for the construct
   * @since 0.9.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: EventbridgeToStepfunctionsProps) {
    super(scope, id);
    defaults.CheckProps(props);

    [this.stateMachine, this.stateMachineLogGroup] = defaults.buildStateMachine(this, props.stateMachineProps,
      props.logGroupProps);

    // Create an IAM role for Events to start the State Machine
    const eventsRole = new iam.Role(this, 'EventsRuleRole', {
      assumedBy: new iam.ServicePrincipal('events.amazonaws.com')
    });

    // Grant the start execution permission to the Events service
    this.stateMachine.grantStartExecution(eventsRole);

    // Setup the Events target
    const stateMachine: events.IRuleTarget = {
      bind: () => ({
        id: '',
        arn: this.stateMachine.stateMachineArn,
        role: eventsRole
      })
    };

    // Defaults props for the Events
    const defaultEventsRuleProps = defaults.DefaultEventsRuleProps([stateMachine]);
    // Override the defaults with the user provided props
    const eventsRuleProps = overrideProps(defaultEventsRuleProps, props.eventRuleProps, true);
    // Create the Events Rule for the State Machine
    this.eventsRule = new events.Rule(this, 'EventsRule', eventsRuleProps);

    if (props.createCloudWatchAlarms === undefined || props.createCloudWatchAlarms) {
      // Deploy best practices CW Alarms for State Machine
      this.cloudwatchAlarms = defaults.buildStepFunctionCWAlarms(this, this.stateMachine);
    }
  }
}