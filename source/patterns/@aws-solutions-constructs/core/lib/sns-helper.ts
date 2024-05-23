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

/*
 *  The functions found here in the core library are for internal use and can be changed
 *  or removed outside of a major release. We recommend against calling them directly from client code.
 */

// Imports
import * as sns from 'aws-cdk-lib/aws-sns';
import * as kms from 'aws-cdk-lib/aws-kms';
import { DefaultSnsTopicProps } from './sns-defaults';
import { buildEncryptionKey } from './kms-helper';
import { consolidateProps } from './utils';
import { PolicyStatement, AnyPrincipal, Effect, AccountPrincipal } from 'aws-cdk-lib/aws-iam';
import { Stack } from 'aws-cdk-lib';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

export interface BuildTopicProps {
    /**
     * Existing SNS topic to be used instead of the default topic. Providing both this and `topicProps` will cause an error.
     * If the SNS Topic is encrypted with a Customer-Managed managed KMS key, the key must be specified in the
     * `existingTopicEncryptionKey` property.
     *
     * @default - Default props are used
     */
    readonly existingTopicObj?: sns.Topic;
     /**
      * If an existing topic is provided in the `existingTopicObj` property, and that topic is encrypted with a customer managed KMS key,
      * this property also needs to be set with same CMK.
      *
      * @default - None
      */
    readonly existingTopicEncryptionKey?: kms.Key;
    /**
     * Optional user provided props to override the default props for the SNS topic.
     *
     * @default - Default props are used.
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
     * An optional, imported encryption key to encrypt the SNS topic with.
     *
     * @default - None
     */
    readonly encryptionKey?: kms.Key;
    /**
     * Optional user provided properties to override the default properties for the KMS encryption key used to encrypt the SNS topic with.
     *
     * @default - None
     */
    readonly encryptionKeyProps?: kms.KeyProps;
}

function applySecureTopicPolicy(topic: sns.Topic): void {

  // Apply topic policy to enforce only the topic owner can publish and subscribe to this topic
  topic.addToResourcePolicy(
    new PolicyStatement({
      sid: 'TopicOwnerOnlyAccess',
      resources: [
        `${topic.topicArn}`
      ],
      actions: [
        "SNS:Publish",
        "SNS:RemovePermission",
        "SNS:SetTopicAttributes",
        "SNS:DeleteTopic",
        "SNS:ListSubscriptionsByTopic",
        "SNS:GetTopicAttributes",
        "SNS:Receive",
        "SNS:AddPermission",
        "SNS:Subscribe"
      ],
      principals: [new AccountPrincipal(Stack.of(topic).account)],
      effect: Effect.ALLOW,
      conditions:
            {
              StringEquals: {
                "AWS:SourceOwner": Stack.of(topic).account
              }
            }
    })
  );

  // Apply Topic policy to enforce encryption of data in transit
  topic.addToResourcePolicy(
    new PolicyStatement({
      sid: 'HttpsOnly',
      resources: [
        `${topic.topicArn}`
      ],
      actions: [
        "SNS:Publish",
        "SNS:RemovePermission",
        "SNS:SetTopicAttributes",
        "SNS:DeleteTopic",
        "SNS:ListSubscriptionsByTopic",
        "SNS:GetTopicAttributes",
        "SNS:Receive",
        "SNS:AddPermission",
        "SNS:Subscribe"
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

export interface BuildTopicResponse {
  readonly topic: sns.Topic,
  readonly key?: kms.Key
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function buildTopic(scope: Construct, id: string, props: BuildTopicProps): BuildTopicResponse {
  if (!props.existingTopicObj) {
    // Setup the topic properties
    const snsTopicProps = consolidateProps(DefaultSnsTopicProps, props.topicProps);

    // Set encryption properties
    if (props.topicProps?.masterKey) {
      snsTopicProps.masterKey = props.topicProps?.masterKey;
    } else if (props.encryptionKey) {
      snsTopicProps.masterKey = props.encryptionKey;
    } else if (props.encryptionKeyProps || props.enableEncryptionWithCustomerManagedKey === true) {
      snsTopicProps.masterKey = buildEncryptionKey(scope, id, props.encryptionKeyProps);
    } else {
      snsTopicProps.masterKey = kms.Alias.fromAliasName(scope, 'aws-managed-key', 'alias/aws/sns');
    }

    // Create the SNS Topic
    // NOSONAR (typescript:S6327) - The masterKey is set in the if statement above, SONAR is
    // not catching it. Behavior is confirmed in the
    // 'Test deployment with no properties using AWS Managed KMS Key' unit test
    const topic: sns.Topic = new sns.Topic(scope, 'SnsTopic', snsTopicProps); // NOSONAR

    applySecureTopicPolicy(topic);

    return { topic, key: snsTopicProps.masterKey };
  } else {
    return { topic: props.existingTopicObj, key: props.existingTopicEncryptionKey };
  }
}

export interface SnsProps {
  readonly topicProps?: sns.TopicProps,
  readonly existingTopicObj?: sns.Topic,
  readonly existingTopicObject?: sns.Topic,
  readonly encryptionKey?: kms.Key,
  readonly encryptionKeyProps?: kms.KeyProps
}

export function CheckSnsProps(propsObject: SnsProps | any) {
  let errorMessages = '';
  let errorFound = false;

  // FargateToSns used TopicObject instead of TopicObj - to fix would be a breaking change, so we
  // must look for both here.
  if (propsObject.topicProps && (propsObject.existingTopicObj || propsObject.existingTopicObject)) {
    errorMessages += 'Error - Either provide topicProps or existingTopicObj, but not both.\n';
    errorFound = true;
  }

  if (propsObject.topicProps?.masterKey && propsObject.encryptionKey) {
    errorMessages += 'Error - Either provide topicProps.masterKey or encryptionKey, but not both.\n';
    errorFound = true;
  }

  if (propsObject.topicProps?.masterKey && propsObject.encryptionKeyProps) {
    errorMessages += 'Error - Either provide topicProps.masterKey or encryptionKeyProps, but not both.\n';
    errorFound = true;
  }

  if (propsObject.encryptionKey && propsObject.encryptionKeyProps) {
    errorMessages += 'Error - Either provide encryptionKey or encryptionKeyProps, but not both.\n';
    errorFound = true;
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }
}
