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
import * as sns from '@aws-cdk/aws-sns';
import * as kms from '@aws-cdk/aws-kms';
import { DefaultSnsTopicProps } from './sns-defaults';
import { buildEncryptionKey } from './kms-helper';
import { overrideProps } from './utils';
import { PolicyStatement, AnyPrincipal, Effect, AccountPrincipal } from '@aws-cdk/aws-iam';
import { Stack } from '@aws-cdk/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from '@aws-cdk/core';

export interface BuildTopicProps {
    /**
     * Existing instance of SNS Topic object, providing both this and `topicProps` will cause an error.
     *
     * @default - None.
     */
    readonly existingTopicObj?: sns.Topic,
    /**
     * Optional user provided props to override the default props for the SNS topic.
     *
     * @default - Default props are used.
     */
    readonly topicProps?: sns.TopicProps
    /**
     * Use a Customer Managed KMS Key, either managed by this CDK app, or imported. If importing an encryption key, it must be specified in
     * the encryptionKey property for this construct.
     *
     * @default - false (encryption enabled with AWS Managed KMS Key).
     */
    readonly enableEncryptionWithCustomerManagedKey?: boolean
    /**
     * An optional, imported encryption key to encrypt the SNS topic with.
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
    let snsTopicProps;
    if (props.topicProps) {
      // If property overrides have been provided, incorporate them and deploy
      snsTopicProps = overrideProps(DefaultSnsTopicProps, props.topicProps);
    } else {
      // If no property overrides, deploy using the default configuration
      snsTopicProps = DefaultSnsTopicProps;
    }
    // Set encryption properties
    if (props.enableEncryptionWithCustomerManagedKey === undefined || props.enableEncryptionWithCustomerManagedKey === false) {
      // Retrieve SNS managed key to encrypt the SNS Topic
      const awsManagedKey = kms.Alias.fromAliasName(scope, 'aws-managed-key', 'alias/aws/sns');
      snsTopicProps.masterKey = awsManagedKey;
    } else {
      // Use the imported Customer Managed KMS key
      if (props.encryptionKey) {
        snsTopicProps.masterKey = props.encryptionKey;
      } else {
        // Create a new Customer Managed KMS key
        snsTopicProps.masterKey = buildEncryptionKey(scope, props.encryptionKeyProps);
      }
    }
    // Create the SNS Topic
    const topic: sns.Topic = new sns.Topic(scope, 'SnsTopic', snsTopicProps);

    applySecureTopicPolicy(topic);

    return [topic, snsTopicProps.masterKey];
  } else {
    return [props.existingTopicObj];
  }
}
