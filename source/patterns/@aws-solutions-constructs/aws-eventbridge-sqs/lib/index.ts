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

import * as sqs from '@aws-cdk/aws-sqs';
import * as events from '@aws-cdk/aws-events';
import * as kms from '@aws-cdk/aws-kms';
import * as defaults from '@aws-solutions-constructs/core';
import { ServicePrincipal } from '@aws-cdk/aws-iam';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from '@aws-cdk/core';
import { overrideProps } from '@aws-solutions-constructs/core';

/**
 * @summary The properties for the EventbridgeToSqs Construct
 */
export interface EventbridgeToSqsProps {
  /**
   * User provided eventRuleProps to override the defaults
   *
   * @default - None
   */
  readonly eventRuleProps: events.RuleProps
  /**
   * Existing instance of SQS queue object, providing both this and queueProps will cause an error.
   *
   * @default - None
   */
  readonly existingQueueObj?: sqs.Queue,
  /**
   * User provided props to override the default props for the SQS queue.
   *
   * @default - Default props are used
   */
  readonly queueProps?: sqs.QueueProps,
  /**
   * Whether to grant additional permissions to the Lambda function enabling it to purge the SQS queue.
   *
   * @default - "false", disabled by default.
   */
  readonly enableQueuePurging?: boolean,
  /**
   * Optional user provided properties for the dead letter queue
   *
   * @default - Default props are used
   */
  readonly deadLetterQueueProps?: sqs.QueueProps,
  /**
   * Whether to deploy a secondary queue to be used as a dead letter queue.
   *
   * @default - true.
   */
  readonly deployDeadLetterQueue?: boolean,
  /**
   * The number of times a message can be unsuccessfully dequeued before being moved to the dead-letter queue.
   *
   * @default - required field if deployDeadLetterQueue=true.
   */
  readonly maxReceiveCount?: number,
  /**
   * Use a KMS Key, either managed by this CDK app, or imported. If importing an encryption key, it must be specified in
   * the encryptionKey property for this construct.
   *
   * @default - true (encryption enabled, managed by this CDK app).
   */
  readonly enableEncryptionWithCustomerManagedKey?: boolean
  /**
   * An optional, imported encryption key to encrypt the SQS queue, and SNS Topic.
   *
   * @default - not specified.
   */
  readonly encryptionKey?: kms.Key
  /**
   * Optional user-provided props to override the default props for the encryption key.
   *
   * @default - Default props are used.
   */
  readonly encryptionKeyProps?: kms.KeyProps
}

export class EventbridgeToSqs extends Construct {
  public readonly sqsQueue: sqs.Queue;
  public readonly deadLetterQueue?: sqs.DeadLetterQueue;
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
    defaults.CheckProps(props);

    // Setup the dead letter queue, if applicable
    this.deadLetterQueue = defaults.buildDeadLetterQueue(this, {
      existingQueueObj: props.existingQueueObj,
      deployDeadLetterQueue: props.deployDeadLetterQueue,
      deadLetterQueueProps: props.deadLetterQueueProps,
      maxReceiveCount: props.maxReceiveCount
    });

    let enableEncryptionParam = props.enableEncryptionWithCustomerManagedKey;
    if (props.enableEncryptionWithCustomerManagedKey === undefined ||
      props.enableEncryptionWithCustomerManagedKey === true) {
      enableEncryptionParam = true;
    }

    // Setup the queue
    [this.sqsQueue, this.encryptionKey] = defaults.buildQueue(this, 'queue', {
      existingQueueObj: props.existingQueueObj,
      queueProps: props.queueProps,
      deadLetterQueue: this.deadLetterQueue,
      enableEncryptionWithCustomerManagedKey: enableEncryptionParam,
      encryptionKey: props.encryptionKey,
      encryptionKeyProps: props.encryptionKeyProps
    });

    const sqsEventTarget: events.IRuleTarget = {
      bind: () => ({
        id: this.sqsQueue.queueName,
        arn: this.sqsQueue.queueArn
      })
    };

    const defaultEventsRuleProps = defaults.DefaultEventsRuleProps([sqsEventTarget]);
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