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

import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as events from '@aws-cdk/aws-events';
import { EventbridgeToStepfunctions } from '@aws-solutions-constructs/aws-eventbridge-stepfunctions';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from '@aws-cdk/core';
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';
import * as logs from '@aws-cdk/aws-logs';

/**
 * @summary The properties for the EventsRuleToStepFunction Construct
 */
export interface EventsRuleToStepFunctionProps {
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

export class EventsRuleToStepFunction extends Construct {
  public readonly stateMachine: sfn.StateMachine;
  public readonly stateMachineLogGroup: logs.ILogGroup;
  public readonly eventsRule: events.Rule;
  public readonly cloudwatchAlarms?: cloudwatch.Alarm[];
  public readonly eventBus?: events.IEventBus;

  /**
   * @summary Constructs a new instance of the EventsRuleToStepFunction class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {EventsRuleToStepFunctionProps} props - user provided props for the construct
   * @access public
   */
  constructor(scope: Construct, id: string, props: EventsRuleToStepFunctionProps) {
    super(scope, id);
    const convertedProps: EventsRuleToStepFunctionProps = { ...props };

    // W (for 'wrapped') is added to the id so that the id's of the constructs with the old and new names don't collide
    // If this character pushes you beyond the 64 character limit, just import the new named construct and instantiate
    // it in place of the older named version. They are functionally identical, aside from the types no other changes
    // will be required.  (eg - new EventbridgeToStepfunctions instead of EventsRuleToStepFunction)
    const wrappedConstruct: EventsRuleToStepFunction = new EventbridgeToStepfunctions(this, `${id}W`, convertedProps);

    this.stateMachine = wrappedConstruct.stateMachine;
    this.stateMachineLogGroup = wrappedConstruct.stateMachineLogGroup;
    this.eventsRule = wrappedConstruct.eventsRule;
    this.cloudwatchAlarms = wrappedConstruct.cloudwatchAlarms;
    this.eventBus = wrappedConstruct.eventBus;
  }
}