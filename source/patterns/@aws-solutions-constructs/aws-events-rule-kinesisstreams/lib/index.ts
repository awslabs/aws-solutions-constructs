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

import * as events from '@aws-cdk/aws-events';
import * as kinesis from '@aws-cdk/aws-kinesis';
import * as iam from '@aws-cdk/aws-iam';
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from '@aws-cdk/core';
import { EventbridgeToKinesisStreams } from '@aws-solutions-constructs/aws-eventbridge-kinesisstreams';

/**
 * @summary The properties for the EventsRuleToKinesisStreams Construct
 */
export interface EventsRuleToKinesisStreamsProps {
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
   * User provided eventRuleProps to override the defaults
   *
   * @default - None
   */
  readonly eventRuleProps: events.RuleProps;
  /**
   * Existing instance of Kinesis Stream object, providing both this and KinesisStreamProps will cause an error.
   *
   * @default - Default props are used
   */
  readonly existingStreamObj?: kinesis.Stream;
  /**
   * User provided props to override the default props for the Kinesis Stream.
   *
   * @default - Default props are used
   */
  readonly kinesisStreamProps?: kinesis.StreamProps | any;
  /**
   * Whether to create recommended CloudWatch alarms
   *
   * @default - Alarms are created
   */
  readonly createCloudWatchAlarms?: boolean;
}

export class EventsRuleToKinesisStreams extends Construct {
    public readonly kinesisStream: kinesis.Stream;
    public readonly eventBus?: events.IEventBus;
    public readonly eventsRule: events.Rule;
    public readonly eventsRole: iam.Role;
    public readonly cloudwatchAlarms?: cloudwatch.Alarm[];

    /**
     * @summary Constructs a new instance of the EventsRuleToKinesisStreams class.
     * @param {cdk.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a a scope-unique id.
     * @param {EventsRuleToKinesisStreamsProps} props - user provided props for the construct
     * @access public
     */
    constructor(scope: Construct, id: string, props: EventsRuleToKinesisStreamsProps) {
      super(scope, id);
      const convertedProps: EventsRuleToKinesisStreamsProps = { ...props };

      // W (for 'wrapped') is added to the id so that the id's of the constructs with the old and new names don't collide
      // If this character pushes you beyond the 64 character limit, just import the new named construct and instantiate
      // it in place of the older named version. They are functionally identical, aside from the types no other changes
      // will be required.  (eg - new EventbridgeToKinesisStreams instead of EventsRuleToKinesisStreams)
      const wrappedConstruct: EventsRuleToKinesisStreams = new EventbridgeToKinesisStreams(this, `${id}W`, convertedProps);

      this.kinesisStream = wrappedConstruct.kinesisStream;
      this.eventsRule = wrappedConstruct.eventsRule;
      this.eventsRole = wrappedConstruct.eventsRole;
      this.cloudwatchAlarms = wrappedConstruct.cloudwatchAlarms;
      this.eventBus = wrappedConstruct.eventBus;
    }
}