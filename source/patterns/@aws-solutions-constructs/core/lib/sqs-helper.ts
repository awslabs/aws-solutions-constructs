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

// Imports
import * as sqs from '@aws-cdk/aws-sqs';
import * as defaults from './sqs-defaults';
import * as cdk from '@aws-cdk/core';
import { overrideProps } from './utils';

export interface BuildQueueProps {
    /**
     * Optional user provided props to override the default props for the primary queue.
     *
     * @default - Default props are used.
     */
    readonly queueProps?: sqs.QueueProps | any
    /**
     * Optional dead letter queue to pass bad requests to after the max receive count is reached.
     *
     * @default - Default props are used.
     */
    readonly deadLetterQueue?: sqs.DeadLetterQueue
}

export function buildQueue(scope: cdk.Construct, id: string, props?: BuildQueueProps): sqs.Queue {
    // If props is undefined, define it
    props = (props === undefined) ? {} : props;
    // Setup the queue
    let queueProps;
    if (props.queueProps) {
        // If property overrides have been provided, incorporate them and deploy
        queueProps = overrideProps(defaults.DefaultQueueProps(), props.queueProps);
    } else {
        // If no property overrides, deploy using the default configuration
        queueProps = defaults.DefaultQueueProps();
    }
    // Determine whether a DLQ property should be added
    if (props.deadLetterQueue) {
        queueProps.deadLetterQueue = props.deadLetterQueue;
    }
    // Return the queue
    return new sqs.Queue(scope, id, queueProps);
}

export interface BuildDeadLetterQueueProps {
  /**
   * An existing queue that has already been defined to be used as the dead letter queue.
   *
   * @default - Default props are used.
   */
  readonly deadLetterQueue: sqs.Queue
  /**
   * The number of times a message can be unsuccessfully dequeued before being moved to the dead-letter queue.
   *
   * @default - Default props are used
   */
  readonly maxReceiveCount?: number
}

export function buildDeadLetterQueue(props: BuildDeadLetterQueueProps): sqs.DeadLetterQueue {
    const mrc = (props.maxReceiveCount) ? props.maxReceiveCount : defaults.defaultMaxReceiveCount;
    // Setup the queue interface and return
    const dlq: sqs.DeadLetterQueue = {
        maxReceiveCount: mrc,
        queue: props.deadLetterQueue
    };
    return dlq;
}