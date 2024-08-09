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

import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as events from 'aws-cdk-lib/aws-events';
import * as defaults from '@aws-solutions-constructs/core';
import * as iam from 'aws-cdk-lib/aws-iam';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import { overrideProps } from '@aws-solutions-constructs/core';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';

/**
 * @summary The properties for the EventbridgeToStepfunctions Construct
 */
export interface EventbridgeToStepfunctionsProps {
  /**
   * Existing instance of a custom EventBus.
   *
   * @default - None
   */
  readonly existingEventBusInterface?: events.IEventBus;
  /**
   * A new custom EventBus is created with provided props.
   *
   * @default - None
   */
  readonly eventBusProps?: events.EventBusProps;
  /**
   * User provided StateMachineProps to override the defaults
   *
   * @default - None
   */
  readonly stateMachineProps: sfn.StateMachineProps;
  /**
   * User provided eventRuleProps to override the defaults
   *
   * @default - None
   */
  readonly eventRuleProps: events.RuleProps;
  /**
   * Whether to create recommended CloudWatch alarms
   *
   * @default - Alarms are created
   */
  readonly createCloudWatchAlarms?: boolean;
  /**
   * User provided props to override the default props for the CloudWatchLogs LogGroup.
   *
   * @default - Default props are used
   */
  readonly logGroupProps?: logs.LogGroupProps;
}

export class EventbridgeToStepfunctions extends Construct {
  public readonly stateMachine: sfn.StateMachine;
  public readonly stateMachineLogGroup: logs.ILogGroup;
  public readonly eventsRule: events.Rule;
  public readonly cloudwatchAlarms?: cloudwatch.Alarm[];
  public readonly eventBus?: events.IEventBus;

  /**
   * @summary Constructs a new instance of the EventbridgeToStepfunctions class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {EventbridgeToStepfunctionsProps} props - user provided props for the construct
   * @access public
   */
  constructor(scope: Construct, id: string, props: EventbridgeToStepfunctionsProps) {
    super(scope, id);
    defaults.CheckEventBridgeProps(props);

    const buildStateMachineResponse = defaults.buildStateMachine(this, defaults.idPlaceholder, props.stateMachineProps,
      props.logGroupProps);
    this.stateMachine = buildStateMachineResponse.stateMachine;
    this.stateMachineLogGroup = buildStateMachineResponse.logGroup;

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

    // build an event bus if existingEventBus is provided or eventBusProps are provided
    this.eventBus = defaults.buildEventBus(this, {
      existingEventBusInterface: props.existingEventBusInterface,
      eventBusProps: props.eventBusProps
    });

    // Defaults props for the Events
    const defaultEventsRuleProps = defaults.DefaultEventsRuleProps([stateMachine], this.eventBus);
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