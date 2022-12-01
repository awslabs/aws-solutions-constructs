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

// Imports
import * as sns from 'aws-cdk-lib/aws-sns';
import * as kms from 'aws-cdk-lib/aws-kms';
import { DefaultSnsTopicProps } from './sns-defaults';
import { buildEncryptionKey } from './kms-helper';
import { consolidateProps, printWarning } from './utils';
import { PolicyStatement, AnyPrincipal, Effect, AccountPrincipal } from 'aws-cdk-lib/aws-iam';
import { Stack } from 'aws-cdk-lib';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

export interface BuildTopicProps {
    /**
     * Existing instance of SNS Topic object, providing both this and `topicProps` will cause an error.
     *
     * @default - None.
     */
    readonly existingTopicObj?: sns.Topic;
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

export function buildTopic(scope: Construct, props: BuildTopicProps): [sns.Topic, kms.Key?] {
  if (!props.existingTopicObj) {
    // Setup the topic properties
    const snsTopicProps = consolidateProps(DefaultSnsTopicProps, props.topicProps);

    if ((props.topicProps?.masterKey || props.encryptionKey || props.encryptionKeyProps) && props.enableEncryptionWithCustomerManagedKey === true) {
      printWarning("Ignoring enableEncryptionWithCustomerManagedKey because one of topicProps.masterKey, encryptionKey, or encryptionKeyProps was already specified");
    }

    // Set encryption properties
    if (props.topicProps?.masterKey) {
      snsTopicProps.masterKey = props.topicProps?.masterKey;
    } else if (props.encryptionKey) {
      snsTopicProps.masterKey = props.encryptionKey;
    } else if (props.encryptionKeyProps || props.enableEncryptionWithCustomerManagedKey === true) {
      snsTopicProps.masterKey = buildEncryptionKey(scope, props.encryptionKeyProps);
    } else {
      snsTopicProps.masterKey = kms.Alias.fromAliasName(scope, 'aws-managed-key', 'alias/aws/sns');
    }

    // Create the SNS Topic
    const topic: sns.Topic = new sns.Topic(scope, 'SnsTopic', snsTopicProps);

    applySecureTopicPolicy(topic);

    return [topic, snsTopicProps.masterKey];
  } else {
    return [props.existingTopicObj];
  }
}
