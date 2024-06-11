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

import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as events from 'aws-cdk-lib/aws-events';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as defaults from '@aws-solutions-constructs/core';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import { overrideProps } from '@aws-solutions-constructs/core';

/**
 * @summary The properties for the EventbridgeToSqs Construct
 */
export interface EventbridgeToSqsProps {
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
   * Existing instance of SQS queue object, providing both this and queueProps will cause an error.
   *
   * @default - None
   */
  readonly existingQueueObj?: sqs.Queue;
  /**
   * User provided props to override the default props for the SQS queue.
   *
   * @default - Default props are used
   */
  readonly queueProps?: sqs.QueueProps;
  /**
   * Whether to grant additional permissions to the Lambda function enabling it to purge the SQS queue.
   *
   * @default - "false", disabled by default.
   */
  readonly enableQueuePurging?: boolean;
  /**
   * Optional user provided properties for the dead letter queue
   *
   * @default - Default props are used
   */
  readonly deadLetterQueueProps?: sqs.QueueProps;
  /**
   * Whether to deploy a secondary queue to be used as a dead letter queue.
   *
   * @default - true.
   */
  readonly deployDeadLetterQueue?: boolean;
  /**
   * The number of times a message can be unsuccessfully dequeued before being moved to the dead-letter queue.
   *
   * @default - required field if deployDeadLetterQueue=true.
   */
  readonly maxReceiveCount?: number;
  /**
   * If no key is provided, this flag determines whether the queue is encrypted with a new CMK or an AWS managed key.
   * This flag is ignored if any of the following are defined: queueProps.encryptionMasterKey, encryptionKey or encryptionKeyProps.
   *
   * @default - True if queueProps.encryptionMasterKey, encryptionKey, and encryptionKeyProps are all undefined.
   */
  readonly enableEncryptionWithCustomerManagedKey?: boolean;
  /**
   * An optional, imported encryption key to encrypt the SQS queue with.
   *
   * @default - None
   */
  readonly encryptionKey?: kms.Key;
  /**
   * Optional user provided properties to override the default properties for the KMS encryption key used to  encrypt the SQS queue with.
   *
   * @default - None
   */
  readonly encryptionKeyProps?: kms.KeyProps;
}

export class EventbridgeToSqs extends Construct {
  public readonly sqsQueue: sqs.Queue;
  public readonly deadLetterQueue?: sqs.DeadLetterQueue;
  public readonly eventBus?: events.IEventBus;
  public readonly eventsRule: events.Rule;
  public readonly encryptionKey?: kms.IKey;

  /**
   * @summary Constructs a new instance of the EventbridgeToSqs class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {EventbridgeToSqsProps} props - user provided props for the construct
   * @since 1.62.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: EventbridgeToSqsProps) {
    super(scope, id);
    defaults.CheckSqsProps(props);
    defaults.CheckEventBridgeProps(props);

    let enableEncryptionParam = props.enableEncryptionWithCustomerManagedKey;
    if (props.enableEncryptionWithCustomerManagedKey === undefined ||
      props.enableEncryptionWithCustomerManagedKey === true) {
      enableEncryptionParam = true;
    }

    // Setup the queue
    const buildQueueResponse = defaults.buildQueue(this, 'queue', {
      existingQueueObj: props.existingQueueObj,
      queueProps: props.queueProps,
      deployDeadLetterQueue: props.deployDeadLetterQueue,
      deadLetterQueueProps: props.deadLetterQueueProps,
      maxReceiveCount: props.maxReceiveCount,
      enableEncryptionWithCustomerManagedKey: enableEncryptionParam,
      encryptionKey: props.encryptionKey,
      encryptionKeyProps: props.encryptionKeyProps
    });
    this.sqsQueue = buildQueueResponse.queue;
    this.encryptionKey = buildQueueResponse.key;
    this.deadLetterQueue = buildQueueResponse.dlq;

    const sqsEventTarget: events.IRuleTarget = {
      bind: () => ({
        id: this.sqsQueue.queueName,
        arn: this.sqsQueue.queueArn
      })
    };

    // build an event bus if existingEventBus is provided or eventBusProps are provided
    this.eventBus = defaults.buildEventBus(this, {
      existingEventBusInterface: props.existingEventBusInterface,
      eventBusProps: props.eventBusProps
    });

    const defaultEventsRuleProps = defaults.DefaultEventsRuleProps([sqsEventTarget], this.eventBus);
    const eventsRuleProps = overrideProps(defaultEventsRuleProps, props.eventRuleProps, true);

    this.eventsRule = new events.Rule(this, 'EventsRule', eventsRuleProps);

    // Enable queue purging permissions for the event rule, if enabled
    if (props.enableQueuePurging) {
      this.sqsQueue.grantPurge(new ServicePrincipal('events.amazonaws.com'));
    }

    // Policy for event to be able to send messages to the queue and Grant Event Bridge service access to the SQS queue encryption key
    this.sqsQueue.grantSendMessages(new ServicePrincipal('events.amazonaws.com'));
  }
}