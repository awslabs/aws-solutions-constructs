/**
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import * as defaults from '@aws-solutions-constructs/core';
import * as kms from '@aws-cdk/aws-kms';
import * as iam from '@aws-cdk/aws-iam';
import { Construct } from '@aws-cdk/core';
import { overrideProps } from '@aws-solutions-constructs/core';
import { ArnPrincipal, Effect } from '@aws-cdk/aws-iam';

export interface EventsRuleToSNSTopicProps {
    /**
     * User provided props to override the default props for the SNS Topic.
     *
     * @default - Default props are used
     */
    readonly snsTopicProps?: sns.TopicProps
    /**
     * User provided eventRuleProps to override the defaults
     *
     * @default - None
     */
    readonly eventRuleProps: events.RuleProps
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

export class EventsRuleToSNSTopic extends Construct {
    public readonly snsTopic: sns.Topic;
    public readonly eventsRule: events.Rule;
    public readonly encryptionKey: kms.Key


    /**
     * @summary Constructs a new instance of the EventRuleToSns class.
     * @param {cdk.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a a scope-unique id.
     * @param {EventsRuleToSNSTopicProps} props - user provided props for the construct.
     * @since 0.8.0
     * @access public
     */
    constructor(scope: Construct, id: string, props: EventsRuleToSNSTopicProps) {
        super(scope, id);

        //Setup the sns topic.
        [this.snsTopic, this.encryptionKey] = defaults.buildTopic(this, {
            topicProps: props.snsTopicProps,
            enableEncryption: props.enableEncryption,
            encryptionKey: props.encryptionKey
        });

        //Setup the event rule target as sns topic.
        const topicEventTarget: events.IRuleTarget = {
            bind: () => ({
                id: this.snsTopic.topicName,
                arn: this.snsTopic.topicArn
            })
        }

        //Setup up the event rule property.
        const defaultEventsRuleProps = defaults.DefaultEventsRuleProps([topicEventTarget]); 
        const eventsRuleProps = overrideProps(defaultEventsRuleProps, props.eventRuleProps, true);

        //Setup up the event rule.
        this.eventsRule = new events.Rule(this, 'EventsRule', eventsRuleProps);

        //Setup up the grant policy for event to be able to publish to the sns topic.
        this.snsTopic.grantPublish(new ArnPrincipal(this.eventsRule.ruleArn))
    }

}