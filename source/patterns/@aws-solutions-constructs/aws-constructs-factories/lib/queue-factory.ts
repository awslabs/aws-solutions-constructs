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

// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as defaults from '@aws-solutions-constructs/core';

export interface SqsQueueFactoryProps {
  /**
   * Optional user provided props to override the default props for the primary queue.
   *
   * @default - Default props are used.
   */
  readonly queueProps?: sqs.QueueProps;
  /**
   * If no key is provided, this flag determines whether the queue is encrypted with a new CMK or an AWS managed key.
   * This flag is ignored if any of the following are defined: queueProps.encryptionMasterKey, encryptionKey or encryptionKeyProps.
   *
   * @default - False if queueProps.encryptionMasterKey, encryptionKey, and encryptionKeyProps are all undefined.
   */
  readonly enableEncryptionWithCustomerManagedKey?: boolean;
  /**
   * An optional, imported encryption key to encrypt the SQS Queue with.
   *
   * @default - None
   */
  readonly encryptionKey?: kms.Key;
  /**
   * Optional user provided properties to override the default properties for the KMS encryption key used to encrypt the SQS Queue with.
   *
   * @default - None
   */
  readonly encryptionKeyProps?: kms.KeyProps;
  /**
   * Whether to deploy a secondary queue to be used as a dead letter queue.
   *
   * @default - true
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

export interface SqsQueueFactoryResponse {
  // TODO: Document these
  readonly queue: sqs.Queue,
  readonly key?: kms.IKey,
  readonly deadLetterQueue?: sqs.DeadLetterQueue,
}

export class QueueFactory {

  public static factory(scope: Construct, id: string, props: SqsQueueFactoryProps): SqsQueueFactoryResponse {
    defaults.CheckS3Props(props);

    const buildQueueResponse = defaults.buildQueue(scope, id, {
      queueProps: props.queueProps,
      enableEncryptionWithCustomerManagedKey: props.enableEncryptionWithCustomerManagedKey,
      encryptionKey: props.encryptionKey,
      encryptionKeyProps: props.encryptionKeyProps,
      deployDeadLetterQueue: props.deployDeadLetterQueue,
      deadLetterQueueProps: props.deadLetterQueueProps,
      maxReceiveCount: props.maxReceiveCount,
    });

    return {
      queue: buildQueueResponse.queue,
      key: buildQueueResponse.key,
      deadLetterQueue: buildQueueResponse.dlq,
    };

  }
}
