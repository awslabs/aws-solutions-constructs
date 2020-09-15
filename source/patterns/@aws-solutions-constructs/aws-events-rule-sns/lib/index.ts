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

import * as sns from '@aws-cdk/aws-sns';
import * as events from '@aws-cdk/aws-events';
import * as kms from '@aws-cdk/aws-kms';
import * as defaults from '@aws-solutions-constructs/core';
import { Construct } from '@aws-cdk/core';
import { overrideProps } from '@aws-solutions-constructs/core';
import { ServicePrincipal } from '@aws-cdk/aws-iam';

export interface EventsRuleToSNSProps {
    /**
     * User provided props to override the default props for the SNS Topic.
     *
     * @default - Default props are used
     */
    readonly topicsProps?: sns.TopicProps
    /**
     * User provided eventRuleProps to override the defaults
     *
     * @default - None
     */
    readonly eventRuleProps: events.RuleProps
    /**
     * Existing instance of SNS Topic object, if this is set then topicProps is ignored.
     *
     * @default - Default props are used
     */
    readonly existingTopicObj?: sns.Topic,
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

export class EventsRuleToSNS extends Construct {
    public readonly snsTopic: sns.Topic;
    public readonly eventsRule: events.Rule;
    public readonly encryptionKey?: kms.Key;

    /**
     * @summary Constructs a new instance of the EventRuleToSns class.
     * @param {cdk.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a a scope-unique id.
     * @param {EventsRuleToSNSProps} props - user provided props for the construct.
     * @since 1.62.0
     * @access public
     */
    constructor(scope: Construct, id: string, props: EventsRuleToSNSProps) {
        super(scope, id);

        let enableEncryptionParam = props.enableEncryptionWithCustomerManagedKey;
        if (props.enableEncryptionWithCustomerManagedKey === undefined ||
          props.enableEncryptionWithCustomerManagedKey === true) {
            enableEncryptionParam = true;
        }

        // Setup the sns topic.
        [this.snsTopic, this.encryptionKey] = defaults.buildTopic(this, {
            existingTopicObj: props.existingTopicObj,
            topicProps: props.topicsProps,
            enableEncryptionWithCustomerManagedKey: enableEncryptionParam,
            encryptionKey: props.encryptionKey,
            encryptionKeyProps: props.encryptionKeyProps
        });

        // Setup the event rule target as sns topic.
        const topicEventTarget: events.IRuleTarget = {
            bind: () => ({
                id: this.snsTopic.topicName,
                arn: this.snsTopic.topicArn
            })
        };

        // Setup up the event rule property.
        const defaultEventsRuleProps = defaults.DefaultEventsRuleProps([topicEventTarget]);
        const eventsRuleProps = overrideProps(defaultEventsRuleProps, props.eventRuleProps, true);

        // Setup up the event rule.
        this.eventsRule = new events.Rule(this, 'EventsRule', eventsRuleProps);

        // Setup up the grant policy for event to be able to publish to the sns topic.
        this.snsTopic.grantPublish(new ServicePrincipal('events.amazonaws.com'));

        // Grant EventBridge service access to the SNS Topic encryption key
        this.encryptionKey?.grant(new ServicePrincipal('events.amazonaws.com'),
            "kms:Decrypt",
            "kms:Encrypt",
            "kms:ReEncrypt*",
            "kms:GenerateDataKey*"
        );
    }

}