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

export interface BuildTopicProps {
    /**
     * Optional user provided props to override the default props for the SNS topic.
     *
     * @default - Default props are used.
     */
    readonly topicProps?: sns.TopicProps | any
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

export function buildTopic(scope: cdk.Construct, props?: BuildTopicProps): sns.Topic {
    // If props is undefined, define it
    props = (props === undefined) ? {} : props;
    // Setup the topic properties
    let snsTopicProps;
    if (props.hasOwnProperty('topicProps')) {
        // If property overrides have been provided, incorporate them and deploy
        snsTopicProps = overrideProps(DefaultSnsTopicProps, props.topicProps);
    } else {
        // If no property overrides, deploy using the default configuration
        snsTopicProps = DefaultSnsTopicProps;
    }
    // Set encryption properties
    if (!props.enableEncryption || props.enableEncryption === true) {
        if (props.encryptionKey) {
            snsTopicProps.masterKey = props.encryptionKey;
        } else {
            snsTopicProps.masterKey = buildEncryptionKey(scope);
        }
    }
    // Create the stream and return
    return new sns.Topic(scope, 'SnsTopic', snsTopicProps);
}