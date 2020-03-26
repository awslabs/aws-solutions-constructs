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
import * as kms from '@aws-cdk/aws-kms';
import * as defaults from '@aws-solutions-konstruk/core';
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
     * Optional user provided props to override the default props for the KMS.
     *
     * @default - Default props are used
     */
    readonly encryptionKeyProps?: kms.KeyProps | any
    /**
     * Whether to deploy a secondary queue to be used as a dead letter queue.
     *
     * @default - required field.
     */
    readonly deployDeadLetterQueue: boolean,
    /**
     * The number of times a message can be unsuccesfully dequeued before being moved to the dead-letter queue.
     *
     * @default - required field.
     */
    readonly maxReceiveCount: number
}

/**
 * @summary The SqsToLambda class.
 */
export class SqsToLambda extends Construct {
    // Private variables
    private queue: sqs.Queue;
    private fn: lambda.Function;
    private encryptionKey: kms.Key;

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

        // Setup the encryption key
        this.encryptionKey = defaults.buildEncryptionKey(scope, props.encryptionKeyProps);

        // Setup the Lambda function
        this.fn = defaults.buildLambdaFunction(scope, {
            deployLambda: props.deployLambda,
            existingLambdaObj: props.existingLambdaObj,
            lambdaFunctionProps: props.lambdaFunctionProps
        });

        // Setup the dead letter queue, if applicable
        let dlqi: sqs.DeadLetterQueue | undefined;
        if (props.deployDeadLetterQueue) {
            const dlq: sqs.Queue = defaults.buildQueue(scope, 'deadLetterQueue', {
                encryptionKey: this.encryptionKey,
                queueProps: props.queueProps
            });
            dlqi = defaults.buildDeadLetterQueue({
                deadLetterQueue: dlq,
                maxReceiveCount: props.maxReceiveCount
            });
        }

        // Setup the queue
        this.queue = defaults.buildQueue(scope, 'queue', {
            encryptionKey: this.encryptionKey,
            queueProps: props.queueProps,
            deadLetterQueue: dlqi
        });

        // Setup the event source mapping
        this.fn.addEventSource(new SqsEventSource(this.queue));
    }

    /**
     * @summary Returns an instance of the lambda.Function created by the construct.
     * @returns {lambda.Function} Instance of the Function created by the construct.
     * @since 0.8.0
     * @access public
     */
    public lambdaFunction(): lambda.Function {
        return this.fn;
    }

    /**
     * @summary Returns an instance of the sqs.Queue created by the construct.
     * @returns {sqs.Queue} Instance of the Queue created by the construct.
     * @since 0.8.0
     * @access public
     */
    public sqsQueue(): sqs.Queue {
        return this.queue;
    }
}