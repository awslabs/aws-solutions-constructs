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

import * as events from 'aws-cdk-lib/aws-events';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import * as defaults from '@aws-solutions-constructs/core';
import { overrideProps } from '@aws-solutions-constructs/core';

/**
 * @summary The properties for the EventbridgeToKinesisStreams Construct
 */
export interface EventbridgeToKinesisStreamsProps {
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

export class EventbridgeToKinesisStreams extends Construct {
    public readonly kinesisStream: kinesis.Stream;
    public readonly eventBus?: events.IEventBus;
    public readonly eventsRule: events.Rule;
    public readonly eventsRole: iam.Role;
    public readonly cloudwatchAlarms?: cloudwatch.Alarm[];

    /**
     * @summary Constructs a new instance of the EventbridgeToKinesisStreams class.
     * @param {cdk.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a a scope-unique id.
     * @param {EventbridgeToKinesisStreamsProps} props - user provided props for the construct
     * @access public
     */
    constructor(scope: Construct, id: string, props: EventbridgeToKinesisStreamsProps) {
      super(scope, id);
      defaults.CheckProps(props);

      // Set up the Kinesis Stream
      this.kinesisStream = defaults.buildKinesisStream(this, {
        existingStreamObj: props.existingStreamObj,
        kinesisStreamProps: props.kinesisStreamProps,
      });

      // Create an events service role
      this.eventsRole = new iam.Role(this, 'eventsRole', {
        assumedBy: new iam.ServicePrincipal('events.amazonaws.com'),
        description: 'Events Rule Role',
      });

      // Grant permission to events service role to allow event rule to send events data to the kinesis stream
      this.kinesisStream.grantWrite(this.eventsRole);

      // Set up the Kinesis Stream as the target for event rule
      const kinesisStreamEventTarget: events.IRuleTarget = {
        bind: () => ({
          id: '',
          arn: this.kinesisStream.streamArn,
          role: this.eventsRole
        })
      };

      // build an event bus if existingEventBus is provided or eventBusProps are provided
      this.eventBus = defaults.buildEventBus(this, {
        existingEventBusInterface: props.existingEventBusInterface,
        eventBusProps: props.eventBusProps
      });

      // Set up the events rule props
      const defaultEventsRuleProps = defaults.DefaultEventsRuleProps([kinesisStreamEventTarget], this.eventBus);
      const eventsRuleProps = overrideProps(defaultEventsRuleProps, props.eventRuleProps, true);

      // Setup up the event rule
      this.eventsRule = new events.Rule(this, 'EventsRule', eventsRuleProps);

      if (props.createCloudWatchAlarms === undefined || props.createCloudWatchAlarms) {
        // Deploy best practices CW Alarms for Kinesis Stream
        this.cloudwatchAlarms = defaults.buildKinesisStreamCWAlarms(this);
      }
    }
}