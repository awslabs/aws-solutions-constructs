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
import { Effect } from '@aws-cdk/aws-iam';

export interface EventsRuleToSNSTopicProps {
    /**
     * Existing instance of Lambda Function object, if this is set then the lambdaFunctionProps is ignored.
     *
     * @default - None
     */
    readonly existingSNSTopic?: sns.Topic,
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
}

export class EventsRuleToSNSTopic extends Construct {

    public readonly snsTopic: [sns.Topic, kms.Key];
    public readonly eventsRule: events.Rule;
    public readonly key: kms.Key

    constructor(scope: Construct, id: string, props: EventsRuleToSNSTopicProps) {
        super(scope, id);

        //TODO if the existingSNSTopic is undefined or null then only then use the buildTopic to create a set of Topic and Key?? Confirm this functionality.
        this.snsTopic = defaults.buildTopic(this, {
            topicProps: props.snsTopicProps
        });

        const topicEventTarget: events.IRuleTarget = {
            bind: () => ({
                id: '',
                arn: this.snsTopic[0].topicArn
            })
        }

        const defaultEventsRuleProps = defaults.DefaultEventsRuleProps([topicEventTarget]); 
        const eventsRuleProps = overrideProps(defaultEventsRuleProps, props.eventRuleProps, true);

        this.eventsRule = new events.Rule(this, 'EventsRule', eventsRuleProps);

        //Policy for event to be able to publish to the sns topic
        const publishPolicy = new iam.PolicyStatement()
        publishPolicy.addResources(this.snsTopic[0].topicArn)
        publishPolicy.effect = Effect.ALLOW
        publishPolicy.addActions('sns:Publish')
        publishPolicy.addServicePrincipal('events.amazonaws.com')

        this.snsTopic[0].addToResourcePolicy(publishPolicy)

        //TODO add logic for encryption using KMS. and also confirm if there needs to be an option to either enable or disable KMS Encryption.
    }

}