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

import * as sns from '@aws-cdk/aws-sns';
import * as events from '@aws-cdk/aws-events';
import * as kms from '@aws-cdk/aws-kms';
import { EventbridgeToSns } from '@aws-solutions-constructs/aws-eventbridge-sns';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from '@aws-cdk/core';

export interface EventsRuleToSnsProps {
  /**
   * User provided props to override the default props for the SNS Topic.
   *
   * @default - Default props are used
   */
  readonly topicProps?: sns.TopicProps;
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
   * Existing instance of SNS Topic object, providing both this and topicProps will cause an error..
   *
   * @default - Default props are used
   */
  readonly existingTopicObj?: sns.Topic;
  /**
   * Use a KMS Key, either managed by this CDK app, or imported. If importing an encryption key, it must be specified in
   * the encryptionKey property for this construct.
   *
   * @default - true (encryption enabled, managed by this CDK app).
   */
  readonly enableEncryptionWithCustomerManagedKey?: boolean;
  /**
   * An optional, imported encryption key to encrypt the SQS queue, and SNS Topic.
   *
   * @default - not specified.
   */
  readonly encryptionKey?: kms.Key;
  /**
   * Optional user-provided props to override the default props for the encryption key.
   *
   * @default - Default props are used.
   */
  readonly encryptionKeyProps?: kms.KeyProps;
}

export class EventsRuleToSns extends Construct {
  public readonly snsTopic: sns.Topic;
  public readonly eventBus?: events.IEventBus;
  public readonly eventsRule: events.Rule;
  public readonly encryptionKey?: kms.Key;

  /**
   * @summary Constructs a new instance of the EventRuleToSns class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {EventsRuleToSnsProps} props - user provided props for the construct.
   * @access public
   */
  constructor(scope: Construct, id: string, props: EventsRuleToSnsProps) {
    super(scope, id);
    const convertedProps: EventsRuleToSnsProps = { ...props };

    // W (for 'wrapped') is added to the id so that the id's of the constructs with the old and new names don't collide
    // If this character pushes you beyond the 64 character limit, just import the new named construct and instantiate
    // it in place of the older named version. They are functionally identical, aside from the types no other changes
    // will be required.  (eg - new EventbridgeToSns instead of EventsRuleToSns)
    const wrappedConstruct: EventsRuleToSns = new EventbridgeToSns(this, `${id}W`, convertedProps);

    this.snsTopic = wrappedConstruct.snsTopic;
    this.eventsRule = wrappedConstruct.eventsRule;
    this.encryptionKey = wrappedConstruct.encryptionKey;
    this.eventBus = wrappedConstruct.eventBus;
  }
}