/**
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import * as cdk from '@aws-cdk/core';
import { overrideProps } from './utils';
import { PolicyStatement, AnyPrincipal, Effect, AccountPrincipal } from '@aws-cdk/aws-iam';
import { Stack } from '@aws-cdk/core';

export interface BuildTopicProps {
    /**
     * Optional user provided props to override the default props for the SNS topic.
     *
     * @default - Default props are used.
     */
    readonly topicProps?: sns.TopicProps
    /**
     * Use a KMS Key, either managed by this CDK app, or imported. If importing an encryption key, it must be specified in
     * the encryptionKey property for this construct.
     *
     * @default - true (encryption enabled, managed by this CDK app).
     */
    readonly enableEncryption?: boolean
    /**
     * An optional, imported encryption key to encrypt the SNS topic with.
     *
     * @default - not specified.
     */
    readonly encryptionKey?: kms.Key
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

export function buildTopic(scope: cdk.Construct, props?: BuildTopicProps): [sns.Topic, kms.Key] {
    // If props is undefined, define it
    props = (props === undefined) ? {} : props;
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
    // TODO: Look into using the AWS managed CMK by using 'alias/aws/sns'
    if (props.enableEncryption === undefined || props.enableEncryption === true) {
        if (props.encryptionKey) {
            snsTopicProps.masterKey = props.encryptionKey;
        } else {
            snsTopicProps.masterKey = buildEncryptionKey(scope);
        }
    }
    // Create the SNS Topic

    const topic: sns.Topic = new sns.Topic(scope, 'SnsTopic', snsTopicProps);

    applySecureTopicPolicy(topic);

    return [topic, snsTopicProps.masterKey];
}
