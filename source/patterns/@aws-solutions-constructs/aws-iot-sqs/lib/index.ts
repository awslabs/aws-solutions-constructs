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

import * as sqs from '@aws-cdk/aws-sqs';
import * as iot from '@aws-cdk/aws-iot';
import * as kms from '@aws-cdk/aws-kms';
import * as iam from '@aws-cdk/aws-iam';
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from '@aws-cdk/core';

/**
 * @summary The properties for the IotToSqs class.
 */
export interface IotToSqsProps {
  /**
   * User provided CfnTopicRuleProps to override the defaults
   *
   * @default - None
   */
  readonly iotTopicRuleProps: iot.CfnTopicRuleProps;
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

export class IotToSqs extends Construct {
  public readonly sqsQueue: sqs.Queue;
  public readonly deadLetterQueue?: sqs.DeadLetterQueue;
  public readonly encryptionKey?: kms.IKey;
  public readonly iotActionsRole: iam.Role;
  public readonly iotTopicRule: iot.CfnTopicRule;

  /**
   * @summary Constructs a new instance of the IotToSqs class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {IotToSqsProps} props - user provided props for the construct
   * @access public
   */
  constructor(scope: Construct, id: string, props: IotToSqsProps) {
    super(scope, id);
    defaults.CheckProps(props);

    // Setup the dead letter queue, if applicable
    this.deadLetterQueue = defaults.buildDeadLetterQueue(this, {
      existingQueueObj: props.existingQueueObj,
      deployDeadLetterQueue: props.deployDeadLetterQueue,
      deadLetterQueueProps: props.deadLetterQueueProps,
      maxReceiveCount: props.maxReceiveCount
    });

    // Default to `true` if `enableEncryptionWithCustomerManagedKey` is undefined
    let enableEncryptionWithCustomerManagedKey = props.enableEncryptionWithCustomerManagedKey;
    if (enableEncryptionWithCustomerManagedKey === undefined) {
      enableEncryptionWithCustomerManagedKey = true;
    }

    // Setup the queue
    [this.sqsQueue, this.encryptionKey] = defaults.buildQueue(this, 'queue', {
      existingQueueObj: props.existingQueueObj,
      queueProps: props.queueProps,
      deadLetterQueue: this.deadLetterQueue,
      enableEncryptionWithCustomerManagedKey,
      encryptionKey: props.encryptionKey,
      encryptionKeyProps: props.encryptionKeyProps
    });

    if (this.sqsQueue.fifo) {
      throw new Error('The IoT SQS action doesn\'t support Amazon SQS FIFO (First-In-First-Out) queues');
    }

    // Role to allow IoT to send messages to the SQS Queue
    this.iotActionsRole = new iam.Role(this, 'iot-actions-role', {
      assumedBy: new iam.ServicePrincipal('iot.amazonaws.com')
    });
    this.sqsQueue.grantSendMessages(this.iotActionsRole);

    if (this.encryptionKey) {
      this.encryptionKey.grantEncrypt(this.iotActionsRole);
    }

    const defaultIotTopicProps = defaults.DefaultCfnTopicRuleProps([{
      sqs: {
        queueUrl: this.sqsQueue.queueUrl,
        roleArn: this.iotActionsRole.roleArn
      }
    }]);
    const iotTopicProps = defaults.overrideProps(defaultIotTopicProps, props.iotTopicRuleProps, true);

    // Create the IoT topic rule
    this.iotTopicRule = new iot.CfnTopicRule(this, 'IotTopicRule', iotTopicProps);
  }
}
