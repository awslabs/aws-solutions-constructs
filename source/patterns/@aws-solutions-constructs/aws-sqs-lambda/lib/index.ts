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
import * as sqs from '@aws-cdk/aws-sqs';
import * as lambda from '@aws-cdk/aws-lambda';
import * as defaults from '@aws-solutions-constructs/core';
import { Construct } from '@aws-cdk/core';
import { SqsEventSource } from '@aws-cdk/aws-lambda-event-sources';

/**
 * @summary The properties for the SqsToLambda class.
 */
export interface SqsToLambdaProps {
    /**
     * Whether to create a new Lambda function or use an existing Lambda function.
     * If set to false, you must provide an existing function for the `existingLambdaObj` property.
     *
     * @default - true
     */
    readonly deployLambda: boolean,
    /**
     * Existing instance of Lambda Function object.
     * If `deploy` is set to false only then this property is required
     *
     * @default - None
     */
    readonly existingLambdaObj?: lambda.Function,
    /**
     * Optional user provided properties to override the default properties for the Lambda function.
     * If `deploy` is set to true only then this property is required.
     *
     * @default - Default properties are used.
     */
    readonly lambdaFunctionProps?: lambda.FunctionProps | any
    /**
     * Optional user provided properties
     *
     * @default - Default props are used
     */
    readonly queueProps?: sqs.QueueProps | any
    /**
     * Optional user provided properties for the dead letter queue
     *
     * @default - Default props are used
     */
    readonly dlQueueProps?: sqs.QueueProps | any
    /**
     * Whether to deploy a secondary queue to be used as a dead letter queue.
     *
     * @default - true.
     */
    readonly deployDeadLetterQueue?: boolean,
    /**
     * The number of times a message can be unsuccessfully dequeued before being moved to the dead-letter queue.
     *
     * @default - required field if deployDeadLetterQueue=true.
     */
    readonly maxReceiveCount?: number
}

/**
 * @summary The SqsToLambda class.
 */
export class SqsToLambda extends Construct {
    public readonly sqsQueue: sqs.Queue;
    public readonly lambdaFunction: lambda.Function;

    /**
     * @summary Constructs a new instance of the SqsToLambda class.
     * @param {cdk.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a a scope-unique id.
     * @param {CloudFrontToApiGatewayToLambdaProps} props - user provided props for the construct.
     * @since 0.8.0
     * @access public
     */
    constructor(scope: Construct, id: string, props: SqsToLambdaProps) {
        super(scope, id);

        // Setup the Lambda function
        this.lambdaFunction = defaults.buildLambdaFunction(this, {
            deployLambda: props.deployLambda,
            existingLambdaObj: props.existingLambdaObj,
            lambdaFunctionProps: props.lambdaFunctionProps
        });

        // Setup the dead letter queue, if applicable
        let dlqi: sqs.DeadLetterQueue | undefined;
        if (props.deployDeadLetterQueue || props.deployDeadLetterQueue === undefined) {
            const dlq: sqs.Queue = defaults.buildQueue(this, 'deadLetterQueue', {
                queueProps: props.dlQueueProps
            });
            dlqi = defaults.buildDeadLetterQueue({
                deadLetterQueue: dlq,
                maxReceiveCount: props.maxReceiveCount
            });
        }

        // Setup the queue
        this.sqsQueue = defaults.buildQueue(this, 'queue', {
            queueProps: props.queueProps,
            deadLetterQueue: dlqi
        });

        // Setup the event source mapping
        this.lambdaFunction.addEventSource(new SqsEventSource(this.sqsQueue));
    }
}