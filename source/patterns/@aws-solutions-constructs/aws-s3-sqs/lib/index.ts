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

// Imports
import { Construct } from 'constructs';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as defaults from '@aws-solutions-constructs/core';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import { Stack } from 'aws-cdk-lib';
import {addCfnNagS3BucketNotificationRulesToSuppress} from "@aws-solutions-constructs/core";

/**
 * @summary The properties for the S3ToSqs class.
 */
export interface S3ToSqsProps {
    /**
     * Existing instance of S3 Bucket object, providing both this and `bucketProps` will cause an error.
     *
     * @default - None
     */
    readonly existingBucketObj?: s3.Bucket;
    /**
     * Optional user provided props to override the default props for the S3 Bucket.
     *
     * @default - Default props are used
     */
    readonly bucketProps?: s3.BucketProps;
    /**
     * The S3 event types that will trigger the notification.
     *
     * @default - If not specified the s3.EventType.OBJECT_CREATED event will trigger the notification.
     */
    readonly s3EventTypes?: s3.EventType[];
    /**
     * S3 object key filter rules to determine which objects trigger this event.
     *
     * @default - If not specified no filter rules will be applied.
     */
    readonly s3EventFilters?: s3.NotificationKeyFilter[];
    /**
     * Existing instance of SQS queue object, Providing both this and queueProps will cause an error.
     *
     * @default - Default props are used
     */
    readonly existingQueueObj?: sqs.Queue;
    /**
     * Optional user provided properties
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
     * Optional user provided props to override the default props for the S3 Logging Bucket.
     *
     * @default - Default props are used
     */
    readonly loggingBucketProps?: s3.BucketProps;
    /**
     * Whether to turn on Access Logs for the S3 bucket with the associated storage costs.
     * Enabling Access Logging is a best practice.
     *
     * @default - true
     */
    readonly logS3AccessLogs?: boolean;
}

/**
 * @summary The S3ToSqs class.
 */
export class S3ToSqs extends Construct {
    public readonly sqsQueue: sqs.Queue;
    public readonly deadLetterQueue?: sqs.DeadLetterQueue;
    public readonly s3Bucket?: s3.Bucket;
    public readonly s3LoggingBucket?: s3.Bucket;
    public readonly encryptionKey?: kms.IKey;
    public readonly s3BucketInterface: s3.IBucket;

    /**
     * @summary Constructs a new instance of the S3ToSqs class.
     * @param {cdk.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a a scope-unique id.
     * @param {S3ToSqsProps} props - user provided props for the construct.
     * @since 0.8.0
     * @access public
     */
    constructor(scope: Construct, id: string, props: S3ToSqsProps) {
      super(scope, id);

      // All our tests are based upon this behavior being on, so we're setting
      // context here rather than assuming the client will set it
      this.node.setContext("@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy", true);

      defaults.CheckSqsProps(props);
      defaults.CheckS3Props(props);

      let bucket: s3.Bucket;
      let enableEncryptionParam = props.enableEncryptionWithCustomerManagedKey;

      if (props.enableEncryptionWithCustomerManagedKey === undefined ||
          props.enableEncryptionWithCustomerManagedKey === true) {
        enableEncryptionParam = true;
      }

      // Setup the S3 bucket
      if (!props.existingBucketObj) {
        const buildS3BucketResponse = defaults.buildS3Bucket(this, {
          bucketProps: props.bucketProps,
          loggingBucketProps: props.loggingBucketProps,
          logS3AccessLogs: props.logS3AccessLogs
        });
        this.s3Bucket = buildS3BucketResponse.bucket;
        this.s3LoggingBucket = buildS3BucketResponse.loggingBucket;

        bucket = this.s3Bucket;
      } else {
        bucket = props.existingBucketObj;
      }

      this.s3BucketInterface = bucket;

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

      // Setup the S3 bucket event types
      let s3EventTypes;
      if (!props.s3EventTypes) {
        s3EventTypes = defaults.defaultS3NotificationEventTypes;
      } else {
        s3EventTypes = props.s3EventTypes;
      }

      // Setup the S3 bucket event filters
      let s3Eventfilters: s3.NotificationKeyFilter[] = [];
      if (props.s3EventFilters) {
        s3Eventfilters = props.s3EventFilters;
      }

      // Setup the S3 bucket event notifications
      s3EventTypes.forEach(type => bucket.addEventNotification(type, new s3n.SqsDestination(this.sqsQueue), ...s3Eventfilters));

      addCfnNagS3BucketNotificationRulesToSuppress(Stack.of(this), 'BucketNotificationsHandler050a0587b7544547bf325f094a3db834');
    }
}
