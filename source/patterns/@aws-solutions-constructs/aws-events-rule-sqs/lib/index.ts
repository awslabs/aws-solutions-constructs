/**
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import * as defaults from '@aws-solutions-constructs/core';
import { ArnPrincipal } from '@aws-cdk/aws-iam';
import { Construct } from '@aws-cdk/core';
import { overrideProps } from '@aws-solutions-constructs/core';

/**
 * @summary The properties for the EventsRuleToSQS Construct
 */
export interface EventsRuleToSQSProps {
  /**
   * User provided eventRuleProps to override the defaults
   *
   * @default - None
   */
  readonly eventRuleProps: events.RuleProps
  /**
   * Existing instance of SQS queue object, if this is set then the queueProps is ignored.
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
  readonly maxReceiveCount?: number
}

export class EventsRuleToSQS extends Construct {
  public readonly sqsQueue: sqs.Queue;
  public readonly deadLetterQueue: sqs.DeadLetterQueue | undefined;
  public readonly eventsRule: events.Rule;

  /**
   * @summary Constructs a new instance of the EventsRuleToSQS class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {EventsRuleToSQSProps} props - user provided props for the construct
   * @since 1.61.1
   * @access public
   */
  constructor(scope: Construct, id: string, props: EventsRuleToSQSProps) {
    super(scope, id);

    // Setup the dead letter queue, if applicable
    if (!props.existingQueueObj && (props.deployDeadLetterQueue || props.deployDeadLetterQueue === undefined)) {
      const [dlq] = defaults.buildQueue(this, 'deadLetterQueue', {
          queueProps: props.deadLetterQueueProps
      });
      this.deadLetterQueue = defaults.buildDeadLetterQueue({
          deadLetterQueue: dlq,
          maxReceiveCount: props.maxReceiveCount
      });
    }

    // Setup the queue
    [this.sqsQueue] = defaults.buildQueue(this, 'queue', {
        existingQueueObj: props.existingQueueObj,
        queueProps: props.queueProps,
        deadLetterQueue: this.deadLetterQueue
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
      this.sqsQueue.grantPurge(new ArnPrincipal(this.eventsRule.ruleArn));
    }

    //Policy for event to be able to send messages to the queue
    this.sqsQueue.grantSendMessages(new ArnPrincipal(this.eventsRule.ruleArn))
  }
}