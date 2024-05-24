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
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as defaults from '@aws-solutions-constructs/core';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import { addCfnNagS3BucketNotificationRulesToSuppress } from "@aws-solutions-constructs/core";
import { Stack } from 'aws-cdk-lib';

/**
 * @summary The properties for the S3ToSns class.
 */
export interface S3ToSnsProps {
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
    /**
     * An optional, existing SNS topic to be used instead of the default topic. Providing both this and `topicProps` will cause an error.
     * If the SNS Topic is encrypted with a Customer-Managed KMS Key, the key must be specified in the `existingTopicEncryptionKey` property.
     *
     * @default - Default props are used
     */
    readonly existingTopicObj?: sns.Topic;
    /**
     * If an existing topic is provided in the `existingTopicObj` property, and that topic is encrypted with a Customer-Managed KMS key,
     * this property also needs to be set with same key.
     *
     * @default - None
     */
    readonly existingTopicEncryptionKey?: kms.Key;
    /**
     * Optional user provided properties
     *
     * @default - Default props are used
     */
    readonly topicProps?: sns.TopicProps;
    /**
     * If no key is provided, this flag determines whether the topic is encrypted with a new CMK or an AWS managed key.
     * This flag is ignored if any of the following are defined: topicProps.masterKey, encryptionKey or encryptionKeyProps.
     *
     * @default - False if topicProps.masterKey, encryptionKey, and encryptionKeyProps are all undefined.
     */
    readonly enableEncryptionWithCustomerManagedKey?: boolean;
    /**
     * An optional, imported encryption key to encrypt the SNS Topic with.
     *
     * @default - None
     */
    readonly encryptionKey?: kms.Key;
    /**
     * Optional user provided properties to override the default properties for the KMS encryption key used to encrypt the SNS Topic with.
     *
     * @default - None
     */
    readonly encryptionKeyProps?: kms.KeyProps;
}

/**
 * @summary The S3ToSns class.
 */
export class S3ToSns extends Construct {
    public readonly snsTopic: sns.Topic;
    public readonly s3Bucket?: s3.Bucket;
    public readonly s3LoggingBucket?: s3.Bucket;
    public readonly encryptionKey?: kms.IKey;
    public readonly s3BucketInterface: s3.IBucket;

    /**
     * @summary Constructs a new instance of the S3ToSns class.
     * @param {cdk.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a a scope-unique id.
     * @param {S3ToSnsProps} props - user provided props for the construct.
     * @since 0.8.0
     * @access public
     */
    constructor(scope: Construct, id: string, props: S3ToSnsProps) {
      super(scope, id);

      // All our tests are based upon this behavior being on, so we're setting
      // context here rather than assuming the client will set it
      this.node.setContext("@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy", true);

      defaults.CheckSnsProps(props);
      defaults.CheckS3Props(props);

      // If the enableEncryptionWithCustomerManagedKey is undefined, default it to true
      const enableEncryptionParam = props.enableEncryptionWithCustomerManagedKey === false ? false : true;

      // Setup the S3 bucket
      if (!props.existingBucketObj) {
        const buildS3BucketResponse = defaults.buildS3Bucket(this, {
          bucketProps: props.bucketProps,
          loggingBucketProps: props.loggingBucketProps,
          logS3AccessLogs: props.logS3AccessLogs
        });
        this.s3Bucket = buildS3BucketResponse.bucket;
        this.s3LoggingBucket = buildS3BucketResponse.loggingBucket;

        this.s3BucketInterface = this.s3Bucket;
      } else {
        this.s3BucketInterface = props.existingBucketObj;
      }

      // Setup the topic
      const buildTopicResponse = defaults.buildTopic(this, id, {
        existingTopicObj: props.existingTopicObj,
        existingTopicEncryptionKey: props.existingTopicEncryptionKey,
        topicProps: props.topicProps,
        enableEncryptionWithCustomerManagedKey: enableEncryptionParam,
        encryptionKey: props.encryptionKey,
        encryptionKeyProps: props.encryptionKeyProps
      });

      this.snsTopic = buildTopicResponse.topic;
      this.encryptionKey = buildTopicResponse.key;
      // Setup the S3 bucket event types
      const s3EventTypes = props.s3EventTypes ?? defaults.defaultS3NotificationEventTypes;

      // Setup the S3 bucket event filters
      const s3Eventfilters = props.s3EventFilters ?? [];

      // Setup the S3 bucket event notifications
      s3EventTypes.forEach((type) => {
        const destination = new s3n.SnsDestination(this.snsTopic);
        this.s3BucketInterface.addEventNotification(type, destination, ...s3Eventfilters);
      });

      // Grant S3 permission to use the topic's encryption key so it can publish messages to it
      this.encryptionKey?.grant(new iam.ServicePrincipal("s3.amazonaws.com"),
        'kms:Decrypt',
        'kms:GenerateDataKey*',
      );

      addCfnNagS3BucketNotificationRulesToSuppress(Stack.of(this), 'BucketNotificationsHandler050a0587b7544547bf325f094a3db834');
    }
}
