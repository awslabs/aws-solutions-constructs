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
import * as sns from '@aws-cdk/aws-sns';
import * as subscriptions from '@aws-cdk/aws-sns-subscriptions';
import * as kms from '@aws-cdk/aws-kms';
import * as iam from '@aws-cdk/aws-iam';
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from '@aws-cdk/core';
import {buildEncryptionKey} from "@aws-solutions-constructs/core";

/**
 * @summary The properties for the SnsToSqs class.
 */
export interface SnsToSqsProps {
    /**
     * Existing instance of SNS topic object, providing both this and topicProps will cause an error..
     *
     * @default - Default props are used
     */
    readonly existingTopicObj?: sns.Topic,
    /**
     * Optional user provided properties to override the default properties for the SNS topic.
     *
     * @default - Default properties are used.
     */
    readonly topicProps?: sns.TopicProps,
    /**
     * Existing instance of SQS queue object, Providing both this and queueProps will cause an error.
     *
     * @default - Default props are used
     */
    readonly existingQueueObj?: sqs.Queue,
    /**
     * Optional user provided properties
     *
     * @default - Default props are used
     */
    readonly queueProps?: sqs.QueueProps,
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

/**
 * @summary The SnsToSqs class.
 */
export class SnsToSqs extends Construct {
    public readonly snsTopic: sns.Topic;
    public readonly encryptionKey?: kms.Key;
    public readonly sqsQueue: sqs.Queue;
    public readonly deadLetterQueue?: sqs.DeadLetterQueue;

    /**
     * @summary Constructs a new instance of the SnsToSqs class.
     * @param {cdk.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a a scope-unique id.
     * @param {SnsToSqsProps} props - user provided props for the construct.
     * @since 1.62.0
     * @access public
     */
    constructor(scope: Construct, id: string, props: SnsToSqsProps) {
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
      let encryptionKeyParam = props.encryptionKey;

      if (props.enableEncryptionWithCustomerManagedKey === undefined ||
          props.enableEncryptionWithCustomerManagedKey === true) {
        enableEncryptionParam = true;
        // Create the encryptionKey if none was provided
        if (!props.encryptionKey) {
          encryptionKeyParam = buildEncryptionKey(scope, props.encryptionKeyProps);
        }
      }
      // Setup the SNS topic
      if (!props.existingTopicObj) {
        // If an existingTopicObj was not specified create new topic
        [this.snsTopic, this.encryptionKey] = defaults.buildTopic(this, {
          topicProps: props.topicProps,
          enableEncryptionWithCustomerManagedKey: enableEncryptionParam,
          encryptionKey: encryptionKeyParam
        });
      } else {
        // If an existingTopicObj was specified utilize the provided topic
        this.snsTopic = props.existingTopicObj;
      }

      // Setup the queue
      [this.sqsQueue] = defaults.buildQueue(this, 'queue', {
        existingQueueObj: props.existingQueueObj,
        queueProps: props.queueProps,
        deadLetterQueue: this.deadLetterQueue,
        enableEncryptionWithCustomerManagedKey: enableEncryptionParam,
        encryptionKey: encryptionKeyParam
      });

      // Setup the SQS queue subscription to the SNS topic
      this.snsTopic.addSubscription(new subscriptions.SqsSubscription(this.sqsQueue));

      // Grant SNS service access to the SQS queue encryption key
      if (this.sqsQueue.encryptionMasterKey) {
        this.sqsQueue.encryptionMasterKey.grant(new iam.ServicePrincipal("sns.amazonaws.com"),
          'kms:Decrypt',
          'kms:GenerateDataKey*',
        );
      }
    }
}
