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

import * as sns from 'aws-cdk-lib/aws-sns';
import * as events from 'aws-cdk-lib/aws-events';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as defaults from '@aws-solutions-constructs/core';
import * as cdk from 'aws-cdk-lib';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import { overrideProps } from '@aws-solutions-constructs/core';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';

export interface EventbridgeToSnsProps {
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
     * If no key is provided, this flag determines whether the topic is encrypted with a new CMK or an AWS managed key.
     * This flag is ignored if any of the following are defined: topicProps.masterKey, encryptionKey or encryptionKeyProps.
     *
     * @default - True if topicProps.masterKey, encryptionKey, and encryptionKeyProps are all undefined.
     */
    readonly enableEncryptionWithCustomerManagedKey?: boolean;
    /**
     * An optional, imported encryption key to encrypt the SNS topic with.
     *
     * @default - None.
     */
    readonly encryptionKey?: kms.Key;
    /**
     * Optional user provided properties to override the default properties for the KMS encryption key used to  encrypt the SNS topic with.
     *
     * @default - None
     */
    readonly encryptionKeyProps?: kms.KeyProps;
}

export class EventbridgeToSns extends Construct {
    public readonly snsTopic: sns.Topic;
    public readonly eventBus?: events.IEventBus;
    public readonly eventsRule: events.Rule;
    public readonly encryptionKey?: kms.Key;

    /**
     * @summary Constructs a new instance of the EventbridgeToSns class.
     * @param {cdk.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a a scope-unique id.
     * @param {EventbridgeToSnsProps} props - user provided props for the construct.
     * @access public
     */
    constructor(scope: Construct, id: string, props: EventbridgeToSnsProps) {
      super(scope, id);
      defaults.CheckSnsProps(props);
      defaults.CheckEventBridgeProps(props);

      let enableEncryptionParam = props.enableEncryptionWithCustomerManagedKey;
      if (props.enableEncryptionWithCustomerManagedKey === undefined ||
          props.enableEncryptionWithCustomerManagedKey === true) {
        enableEncryptionParam = true;
      }

      // Setup the sns topic.
      const buildTopicResponse = defaults.buildTopic(this, id, {
        existingTopicObj: props.existingTopicObj,
        topicProps: props.topicProps,
        enableEncryptionWithCustomerManagedKey: enableEncryptionParam,
        encryptionKey: props.encryptionKey,
        encryptionKeyProps: props.encryptionKeyProps
      });

      this.snsTopic = buildTopicResponse.topic;
      this.encryptionKey = buildTopicResponse.key;

      // Setup the event rule target as sns topic.

      // The CDK generally avoids resource names that are too long, but in this case the maximum SNS topic name is 256 characters and the maximum
      // binding id is 64 characters, so a long SNS topic name (driven by Stack id, Construct id, etc.) breaks upon launch. Because of this, we take
      // control of the physical name ourselves.
      const maxBindingIdLength = 64;
      const nameParts: string[] = [
        cdk.Stack.of(scope).stackName, // Name of the stack
        id,                            // Construct ID
      ];
      const generatedTopicName = defaults.generatePhysicalName("", nameParts, maxBindingIdLength);

      const topicEventTarget: events.IRuleTarget = {
        bind: () => ({
          id: generatedTopicName,
          arn: this.snsTopic.topicArn
        })
      };

      // build an event bus if existingEventBus is provided or eventBusProps are provided
      this.eventBus = defaults.buildEventBus(this, {
        existingEventBusInterface: props.existingEventBusInterface,
        eventBusProps: props.eventBusProps
      });

      // Setup up the event rule property.
      const defaultEventsRuleProps = defaults.DefaultEventsRuleProps([topicEventTarget], this.eventBus);
      const eventsRuleProps = overrideProps(defaultEventsRuleProps, props.eventRuleProps, true);

      // Setup up the event rule.
      this.eventsRule = new events.Rule(this, 'EventsRule', eventsRuleProps);

      // Setup up the grant policy for event to be able to publish to the sns topic.
      this.snsTopic.grantPublish(new ServicePrincipal('events.amazonaws.com'));

      // Grant EventBridge service access to the SNS Topic encryption key
      this.encryptionKey?.grant(new ServicePrincipal('events.amazonaws.com'),
        "kms:Decrypt",
        "kms:Encrypt",
        "kms:ReEncrypt*",
        "kms:GenerateDataKey*"
      );
    }
}