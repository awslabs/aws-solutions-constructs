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
import * as defaults from '@aws-solutions-constructs/core';
import { Construct } from '@aws-cdk/core';
import { overrideProps } from '@aws-solutions-constructs/core';
import { Effect, PolicyStatement, ServicePrincipal } from '@aws-cdk/aws-iam';

export interface EventsRuleToSNSTopicProps {
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
}

export class EventsRuleToSNSTopic extends Construct {
    public readonly snsTopic: sns.Topic;
    public readonly eventsRule: events.Rule;


    /**
     * @summary Constructs a new instance of the EventRuleToSns class.
     * @param {cdk.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a a scope-unique id.
     * @param {EventsRuleToSNSTopicProps} props - user provided props for the construct.
     * @since 1.61.1
     * @access public
     */
    constructor(scope: Construct, id: string, props: EventsRuleToSNSTopicProps) {
        super(scope, id);

        //Setup the sns topic.
        [this.snsTopic] = defaults.buildTopic(this, {
            existingTopicObj: props.existingTopicObj,
            topicProps: props.topicsProps
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

        //add the policy details for the event rule to be able to publish to the sns topic
        this.snsTopic.addToResourcePolicy(new PolicyStatement({
            actions: ['SNS:Publish'],
            resources: [this.eventsRule.ruleArn],
            effect: Effect.ALLOW,
            principals: [new ServicePrincipal('events.amazonaws.com')],
        }))
    }

}