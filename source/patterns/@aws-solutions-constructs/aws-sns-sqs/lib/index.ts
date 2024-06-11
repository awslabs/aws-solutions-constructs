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
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import { buildEncryptionKey } from "@aws-solutions-constructs/core";
import { FeatureFlags } from 'aws-cdk-lib/core';
import { SNS_SUBSCRIPTIONS_SQS_DECRYPTION_POLICY } from 'aws-cdk-lib/cx-api';

/**
 * @summary The properties for the SnsToSqs class.
 */
export interface SnsToSqsProps {
  /**
   * Existing instance of SNS topic object, providing both this and topicProps will cause an error..
   *
   * @default - Default props are used
   */
  readonly existingTopicObj?: sns.Topic;
  /**
   * Optional user provided properties to override the default properties for the SNS topic.
   *
   * @default - Default properties are used.
   */
  readonly topicProps?: sns.TopicProps;
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
   * If no keys are provided, this flag determines whether both the topic and queue are encrypted with a new CMK or an AWS managed key.
   * This flag is ignored if any of the following are defined:
   * topicProps.masterKey, queueProps.encryptionMasterKey, encryptionKey or encryptionKeyProps.
   *
   * @default - True if topicProps.masterKey, queueProps.encryptionMasterKey, encryptionKey, and encryptionKeyProps are all undefined.
   *
   * @deprecated Use the separate attributes for Queue and Topic encryption.
   */
  readonly enableEncryptionWithCustomerManagedKey?: boolean;
  /**
   * An optional, imported encryption key to encrypt the SQS Queue and SNS Topic with. We recommend
   * you migrate your code to use  queueEncryptionKey and topicEncryptionKey in place of this prop value.
   *
   * @default - None
   *
   * @deprecated Use the separate attributes for Queue and Topic encryption.
   */
  readonly encryptionKey?: kms.Key;
  /**
   * Optional user provided properties to override the default properties for the KMS encryption key used to
   * encrypt the SQS topic and queue with. We recommend you migrate your code to use queueEncryptionKeyProps
   * and topicEncryptionKeyProps in place of this prop value.
   *
   * @default - None
   *
   * @deprecated Use the separate attributes for Queue and Topic encryption.
   */
  readonly encryptionKeyProps?: kms.KeyProps;
  /**
   * Optional user-provided props to override the default props for sqsSubscriptionProps.
   *
   * @default - Default props are used.
   */
  readonly sqsSubscriptionProps?: subscriptions.SqsSubscriptionProps;
  /**
   * Whether to encrypt the Queue with a customer managed KMS key (CMK). This is the default
   * behavior, and this property defaults to true - if it is explicitly set to false then the
   * Queue is encrypted with an Amazon managed KMS key. For a completely unencrypted Queue (not recommended),
   * create the Queue separately from the construct and pass it in using the existingQueueObject.
   * Since SNS subscriptions do not currently support SQS queues with AWS managed encryption keys,
   * setting this to false will always result in an error from the underlying CDK - we have still
   * included this property for consistency with topics and to be ready if the services one day support
   * this functionality.
   *
   * @default - false
   */
  readonly encryptQueueWithCmk?: boolean;
  /**
   * An optional CMK that will be used by the construct to encrypt the new SQS queue.
   *
   * @default - None
   */
  readonly existingQueueEncryptionKey?: kms.Key;
  /**
   * An optional subset of key properties to override the default properties used by constructs (`enableKeyRotation: true`).
   * These properties will be used in constructing the CMK used to encrypt the SQS queue.
   *
   * @default - None
   */
  readonly queueEncryptionKeyProps?: kms.KeyProps;
  /**
   * Whether to encrypt the Topic with a customer managed KMS key (CMK). This is the
   * default behavior, and this property defaults to true - if it is explicitly set
   * to false then the Topic is encrypted with an Amazon managed KMS key. For a completely unencrypted
   * Topic (not recommended), create the Topic separately from the construct and pass it in using the existingTopicObject.
   *
   * @default - false
   */
  readonly encryptTopicWithCmk?: boolean;
  /**
   * An optional CMK that will be used by the construct to encrypt the new SNS Topic.
   *
   * @default - None
   */
  readonly existingTopicEncryptionKey?: kms.Key;
  /**
   * An optional subset of key properties to override the default properties used by constructs
   * (`enableKeyRotation: true`). These properties will be used in constructing the CMK used to
   * encrypt the SNS topic.
   *
   * @default - None
   */
  readonly topicEncryptionKeyProps?: kms.KeyProps;
}

export interface ConstructKeys {
  readonly useDeprecatedInterface: boolean,
  readonly singleKey?: kms.Key,
  readonly topicKey?: kms.Key,
  readonly queueKey?: kms.Key,
  readonly encryptTopicWithCmk: boolean,
  readonly encryptQueueWithCmk: boolean
}

/**
 * @summary The SnsToSqs class.
 */
export class SnsToSqs extends Construct {
  public readonly snsTopic: sns.Topic;
  /*
   * @deprecated
   */
  public readonly encryptionKey?: kms.Key;
  public readonly queueEncryptionKey?: kms.Key;
  public readonly topicEncryptionKey?: kms.Key;
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
    defaults.CheckSnsProps(props);
    defaults.CheckSqsProps(props);
    this.uniquePropChecks(props);

    const activeKeys = SnsToSqs.createRequiredKeys(scope, id, props);
    if (!activeKeys.useDeprecatedInterface) {
      this.queueEncryptionKey = activeKeys.queueKey;
      this.topicEncryptionKey = activeKeys.topicKey;
    }

    // Setup the SNS topic
    if (!props.existingTopicObj) {
      // If an existingTopicObj was not specified create new topic
      const buildTopicResponse = defaults.buildTopic(this, id, {
        topicProps: props.topicProps,
        encryptionKey: activeKeys.topicKey,
        enableEncryptionWithCustomerManagedKey: activeKeys.encryptTopicWithCmk,
      });
      if (activeKeys.useDeprecatedInterface) {
        this.encryptionKey = buildTopicResponse.key;
      }
      this.snsTopic = buildTopicResponse.topic;
    } else {
      // If an existingTopicObj was specified utilize the provided topic
      this.snsTopic = props.existingTopicObj;
    }

    // Setup the queue
    const buildQueueResponse = defaults.buildQueue(this, 'queue', {
      existingQueueObj: props.existingQueueObj,
      queueProps: props.queueProps,
      deployDeadLetterQueue: props.deployDeadLetterQueue,
      deadLetterQueueProps: props.deadLetterQueueProps,
      maxReceiveCount: props.maxReceiveCount,
      enableEncryptionWithCustomerManagedKey: activeKeys.encryptQueueWithCmk,
      encryptionKey: activeKeys.queueKey,
    });
    this.sqsQueue = buildQueueResponse.queue;
    this.deadLetterQueue = buildQueueResponse.dlq;

    // Setup the SQS queue subscription to the SNS topic
    this.snsTopic.addSubscription(new subscriptions.SqsSubscription(this.sqsQueue, props.sqsSubscriptionProps));

  }

  /*
  *
  * With the old and new interfaces both supported, it got complex figuring out
  * what props to use for what keys. This complexity has all been extracted to this
  * function to keep the constructor itself more straightforward
  *
  * This function will interpret what info the client provided (throw an error if there are conflicts),
  * determine from the data and it's own internal logic whether to implement the deprecated or new interface,
  * CREATE ANY KEYS NEEDED (not passing a create key flag to the buildTopic and buildQueue functions), then
  * return the keys in a structure.
  *
  * Odd things to know:
  * -If it decides to implement the deprecated interface it will still fill in the topicKey and queueKey values - topicKey
  *      and queueKey will ALWAYS be set, for the old interface they will be set to the same key as singleKey
  * -If the client provides no key info, this function will use the FeatureFlag to determine which interface to use
  */
  public static createRequiredKeys(scope: Construct, id: string, props: SnsToSqsProps): ConstructKeys {
    let topicKey: kms.Key | undefined;
    let encryptTopicWithCmk: boolean = false;
    let queueKey: kms.Key | undefined;
    let encryptQueueWithCmk: boolean = false;
    let singleKey: kms.Key | undefined;

    // First - confirm that only 1 interface is being used
    let useDeprecatedInterface: boolean = false;
    let useCurrentInterface: boolean = false;
    if (props.enableEncryptionWithCustomerManagedKey || props.enableEncryptionWithCustomerManagedKey || props.encryptionKeyProps) {
      useDeprecatedInterface = true;
      defaults.printWarning(
        'The enableEncryptionWithCustomerManagedKey, enableEncryptionWithCustomerManagedKey and encryptionKeyProps props values for SnsToSqsProps ' +
        'are deprecated. Consider moving to encryptQueueWithCmk, queueEncryptionKeyProps, existingQueueEncryptionKey, encryptTopicWithCmk, ' +
        'topicEncryptionKeyProps and existingTopicEncryptionKey.'
      );
    }
    if (props.encryptQueueWithCmk ||
      props.queueEncryptionKeyProps ||
      props.existingQueueEncryptionKey ||
      props.encryptTopicWithCmk ||
      props.topicEncryptionKeyProps ||
      props.existingTopicEncryptionKey) {
      useCurrentInterface = true;
    }
    if (useCurrentInterface && useDeprecatedInterface) {
      throw new Error('Cannot specify both deprecated key props and new key props');
    }

    // If neither are set, use the feature flag choose the functionality
    if (!useCurrentInterface && !useDeprecatedInterface) {
      defaults.printWarning('Unable to determine whether to use current or deprecated Key functionality, using Feature Flag SNS_SUBSCRIPTIONS_SQS_DECRYPTION_POLICY to decide');
      if (FeatureFlags.of(scope).isEnabled(SNS_SUBSCRIPTIONS_SQS_DECRYPTION_POLICY)) {
        useCurrentInterface = true;
      } else {
        useDeprecatedInterface = true;
      }
    }

    // If Deprecated functionality
    // Use code from above to create single key
    if (useDeprecatedInterface) {
      const queueKeyNeeded =
        DoWeNeedACmk(props.existingQueueObj, props.queueProps?.encryptionMasterKey, props.enableEncryptionWithCustomerManagedKey);
      const topicKeyNeeded =
        DoWeNeedACmk(props.existingTopicObj, props.topicProps?.masterKey, props.enableEncryptionWithCustomerManagedKey);

      if (queueKeyNeeded || topicKeyNeeded) {

        // We need to encrypt the resources with a single key
        singleKey = props.encryptionKey ?? buildEncryptionKey(scope, id, props.encryptionKeyProps);
        topicKey = topicKeyNeeded ? singleKey : undefined;
        queueKey = queueKeyNeeded ? singleKey : undefined;
        encryptQueueWithCmk = queueKeyNeeded;
        encryptTopicWithCmk = topicKeyNeeded;
      }
    }

    if (useCurrentInterface) {

      if (props.queueProps?.encryption) {
        throw new Error('The new interface of SnsToSqs does not support managing encryption using the queueProps.encryption setting. ' +
          'To use a totally unencrypted queue (not recommended), create the queue separately and pass in the existingQueueObj prop'
        );
      }

      if (DoWeNeedACmk(props.existingTopicObj, props.topicProps?.masterKey, props.encryptTopicWithCmk)) {
        topicKey = props.existingTopicEncryptionKey ?? buildEncryptionKey(scope, `${id}topic`, props.topicEncryptionKeyProps);
        encryptTopicWithCmk = true;
      }

      if (DoWeNeedACmk(props.existingQueueObj, props.queueProps?.encryptionMasterKey, props.encryptQueueWithCmk)) {
        queueKey = props.existingQueueEncryptionKey ?? buildEncryptionKey(scope, `${id}queue`, props.queueEncryptionKeyProps);
        encryptQueueWithCmk = true;
      }
    }

    return {
      useDeprecatedInterface,
      singleKey,
      topicKey,
      queueKey,
      encryptQueueWithCmk,
      encryptTopicWithCmk
    };
  }

  /*
   * Because the props for the queue and topic are unique on this construct, we need
   * to check for props issues that the standard checks won't catch
   */
  private uniquePropChecks(props: SnsToSqsProps) {
    let errorMessages = '';
    let errorFound = false;

    if (props.topicProps?.masterKey && props.existingTopicEncryptionKey) {
      errorMessages += 'Error - Either provide topicProps.masterKey or existingTopicEncryptionKey, but not both.\n';
      errorFound = true;
    }

    if (props.topicProps?.masterKey && props.topicEncryptionKeyProps) {
      errorMessages += 'Error - Either provide topicProps.masterKey or topicEncryptionKeyProps, but not both.\n';
      errorFound = true;
    }

    if (props.existingTopicEncryptionKey && props.topicEncryptionKeyProps) {
      errorMessages += 'Error - Either provide existingTopicEncryptionKey or topicEncryptionKeyProps, but not both.\n';
      errorFound = true;
    }

    if (props.queueProps?.encryptionMasterKey && props.queueEncryptionKeyProps) {
      errorMessages += 'Error - Either provide queueProps.encryptionMasterKey or queueEncryptionKeyProps, but not both.\n';
      errorFound = true;
    }

    if (props.queueProps?.encryptionMasterKey && props.existingQueueEncryptionKey) {
      errorMessages += 'Error - Either provide queueProps.encryptionMasterKey or existingQueueEncryptionKey, but not both.\n';
      errorFound = true;
    }

    if (props.existingQueueEncryptionKey && props.queueEncryptionKeyProps) {
      errorMessages += 'Error - Either provide existingQueueEncryptionKey or queueEncryptionKeyProps, but not both.\n';
      errorFound = true;
    }

    if ((props.encryptQueueWithCmk === false) && (props.queueEncryptionKeyProps)) {
      errorMessages += 'Error - if encryptQueueWithCmk is false, submitting queueEncryptionKeyProps is invalid\n';
      errorFound = true;
    }

    if ((props.encryptQueueWithCmk === false) && (props.existingQueueEncryptionKey)) {
      errorMessages += 'Error - if encryptQueueWithCmk is false, submitting existingQueueEncryptionKey is invalid\n';
      errorFound = true;
    }

    if ((props.encryptTopicWithCmk === false) && (props.topicEncryptionKeyProps)) {
      errorMessages += 'Error - if encryptTopicWithCmk is false, submitting topicEncryptionKeyProps is invalid\n';
      errorFound = true;
    }

    if ((props.encryptTopicWithCmk === false) && (props.existingTopicEncryptionKey)) {
      errorMessages += 'Error - if encryptTopicWithCmk is false, submitting existingTopicEncryptionKey is invalid\n';
      errorFound = true;
    }

    if ((props.enableEncryptionWithCustomerManagedKey === false) && (props.encryptionKey || props.encryptionKeyProps)) {
      errorMessages += 'Error - if enableEncryptionWithCustomerManagedKey is false, submitting encryptionKey or encryptionKeyProps is invalid\n';
      errorFound = true;
    }

    if (errorFound) {
      throw new Error(errorMessages);
    }

  }
}

function DoWeNeedACmk(existingResource?: object, keyInResourceProps?: kms.IKey, encryptionFlag?: boolean) {
  // We only need tp create a CMK if
  //   -The client did not supply an existing resource
  //   -The client did not specify an existing key in the resource properties
  //   -The client did not explicitly turn off encryption by setting the flag to false.
  if (!existingResource &&
    !keyInResourceProps &&
    defaults.CheckBooleanWithDefault(encryptionFlag, true)) {
    return true;
  }
  return false;
}
