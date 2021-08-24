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

// Imports
import * as sqs from '@aws-cdk/aws-sqs';
import * as defaults from './sqs-defaults';
import * as cdk from '@aws-cdk/core';
import * as kms from '@aws-cdk/aws-kms';
import { overrideProps } from './utils';
import { AccountPrincipal, Effect, PolicyStatement, AnyPrincipal } from '@aws-cdk/aws-iam';
import { Stack } from '@aws-cdk/core';
import {buildEncryptionKey} from "./kms-helper";

export interface BuildQueueProps {
    /**
     * Existing instance of SQS queue object, providing both this and queueProps will cause an error.
     *
     * @default - None.
     */
    readonly existingQueueObj?: sqs.Queue,
    /**
     * Optional user provided props to override the default props for the primary queue.
     *
     * @default - Default props are used.
     */
    readonly queueProps?: sqs.QueueProps
    /**
     * Optional dead letter queue to pass bad requests to after the max receive count is reached.
     *
     * @default - Default props are used.
     */
    readonly deadLetterQueue?: sqs.DeadLetterQueue
    /**
     * Use a KMS Key, either managed by this CDK app, or imported. If importing an encryption key, it must be specified in
     * the encryptionKey property for this construct.
     *
     * @default - false (encryption enabled with AWS Managed KMS Key).
     */
    readonly enableEncryptionWithCustomerManagedKey?: boolean
    /**
     * An optional, imported encryption key to encrypt the SQS queue with.
     *
     * @default - not specified.
     */
    readonly encryptionKey?: kms.Key,
    /**
     * Optional user-provided props to override the default props for the encryption key.
     *
     * @default - Ignored if encryptionKey is provided
     */
    readonly encryptionKeyProps?: kms.KeyProps
}

export function buildQueue(scope: cdk.Construct, id: string, props: BuildQueueProps): [sqs.Queue, kms.IKey?] {
  // If an existingQueueObj is not specified
  if (!props.existingQueueObj) {
    // Setup the queue
    let queueProps;
    if (props.queueProps) {
      // If property overrides have been provided, incorporate them and deploy
      const checkFifo = props.queueProps.fifo ? true : undefined;
      queueProps = overrideProps(defaults.DefaultQueueProps(), { ...props.queueProps, fifo: checkFifo });
    } else {
      // If no property overrides, deploy using the default configuration
      queueProps = defaults.DefaultQueueProps();
    }

    // Determine whether a DLQ property should be added
    if (props.deadLetterQueue) {
      queueProps.deadLetterQueue = props.deadLetterQueue;
    }

    // Set encryption properties
    if (props.enableEncryptionWithCustomerManagedKey) {
      // Use the imported Customer Managed KMS key
      if (props.encryptionKey) {
        queueProps.encryptionMasterKey = props.encryptionKey;
      } else {
        queueProps.encryptionMasterKey = buildEncryptionKey(scope, props.encryptionKeyProps);
      }
    }
    const queue = new sqs.Queue(scope, id, queueProps);

    applySecureQueuePolicy(queue);

    // Return the queue
    return [queue, queue.encryptionMasterKey];
  } else {
    // If an existingQueueObj is specified, return that object as the queue to be used
    return [props.existingQueueObj];
  }
}

export interface BuildDeadLetterQueueProps {
  /**
   * Existing instance of SQS queue object, providing both this and queueProps will cause an error.
   *
   * @default - None.
   */
  readonly existingQueueObj?: sqs.Queue,
  /**
   * Whether to deploy a secondary queue to be used as a dead letter queue.
   *
   * @default - required field.
   */
  readonly deployDeadLetterQueue?: boolean,
  /**
   * Optional user provided properties for the dead letter queue
   *
   * @default - Default props are used
   */
  readonly deadLetterQueueProps?: sqs.QueueProps,
  /**
   * The number of times a message can be unsuccessfully dequeued before being moved to the dead letter queue.
   *
   * @default - Default props are used
   */
  readonly maxReceiveCount?: number
}

export function buildDeadLetterQueue(scope: cdk.Construct, props: BuildDeadLetterQueueProps): sqs.DeadLetterQueue | undefined {
  if (!props.existingQueueObj && (props.deployDeadLetterQueue || props.deployDeadLetterQueue === undefined)) {
    // Create the Dead Letter Queue
    const [dlq] = buildQueue(scope, 'deadLetterQueue', {
      queueProps: props.deadLetterQueueProps
    });

    const mrc = (props.maxReceiveCount) ? props.maxReceiveCount : defaults.defaultMaxReceiveCount;

    // Setup the Dead Letter Queue interface
    const dlqInterface: sqs.DeadLetterQueue = {
      maxReceiveCount: mrc,
      queue: dlq
    };

    // Return the dead letter queue interface
    return dlqInterface;
  }
  return;
}

function applySecureQueuePolicy(queue: sqs.Queue): void {

  // Apply queue policy to enforce only the queue owner can perform operations on queue
  queue.addToResourcePolicy(
    new PolicyStatement({
      sid: 'QueueOwnerOnlyAccess',
      resources: [
        `${queue.queueArn}`
      ],
      actions: [
        "sqs:DeleteMessage",
        "sqs:ReceiveMessage",
        "sqs:SendMessage",
        "sqs:GetQueueAttributes",
        "sqs:RemovePermission",
        "sqs:AddPermission",
        "sqs:SetQueueAttributes"
      ],
      principals: [new AccountPrincipal(Stack.of(queue).account)],
      effect: Effect.ALLOW
    })
  );

  // Apply Topic policy to enforce encryption of data in transit
  queue.addToResourcePolicy(
    new PolicyStatement({
      sid: 'HttpsOnly',
      resources: [
        `${queue.queueArn}`
      ],
      actions: [
        "SQS:*"
      ],
      principals: [new AnyPrincipal()],
      effect: Effect.DENY,
      conditions:
          {
            Bool: {
              'aws:SecureTransport': 'false'
            }
          }
    })
  );
}