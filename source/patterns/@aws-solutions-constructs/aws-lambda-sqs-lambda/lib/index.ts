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

// Imports
import * as lambda from '@aws-cdk/aws-lambda';
import * as sqs from '@aws-cdk/aws-sqs';
import { LambdaToSqs } from '@aws-solutions-constructs/aws-lambda-sqs';
import { SqsToLambda } from '@aws-solutions-constructs/aws-sqs-lambda';
import { Construct } from '@aws-cdk/core';

/**
 * @summary The properties for the LambdaToSqsToLambda class.
 */
export interface LambdaToSqsToLambdaProps {
    /**
     * An optional, existing Lambda function to be used instead of the default function for sending messages to the
     * queue. If an existing function is provided, the `producerLambdaFunctionProps` property will be ignored.
     *
     * @default - None.
     */
    readonly existingProducerLambdaObj?: lambda.Function,
    /**
     * Optional user-provided properties to override the default properties for the producer Lambda function. Ignored if
     * an `existingProducerLambdaObj` is provided.
     *
     * @default - Default properties are used.
     */
    readonly producerLambdaFunctionProps?: lambda.FunctionProps,
    /**
     * An optional, existing SQS queue to be used instead of the default queue. If an existing queue is provided, the
     * `queueProps` property will be ignored.
     *
     * @default - None.
     */
    readonly existingQueueObj?: sqs.Queue,
    /**
     * Optional user-provided properties to override the default properties for the SQS queue. Ignored if an
     * `existingQueueObj` is provided.
     *
     * @default - Default props are used.
     */
    readonly queueProps?: sqs.QueueProps,
    /**
     * Whether to create a secondary queue to be used as a dead letter queue. Defaults to `true`.
     *
     * @default - true.
     */
    readonly deployDeadLetterQueue?: boolean,
    /**
     * Optional user-provided props to override the default props for the dead letter queue. Only used if the
     * `deployDeadLetterQueue` property is set to true.
     *
     * @default - Default props are used.
     */
    readonly deadLetterQueueProps?: sqs.QueueProps,
    /**
     * The number of times a message can be unsuccessfully dequeued before being moved to the dead letter queue.
     * Defaults to `15`.
     *
     * @default - 15.
     */
    readonly maxReceiveCount?: number,
    /**
     * An optional, existing Lambda function to be used instead of the default function for receiving/consuming messages
     * from the queue. If an existing function is provided, the `consumerLambdaFunctionProps` property will be ignored.
     *
     * @default - None.
     */
    readonly existingConsumerLambdaObj?: lambda.Function,
    /**
     * Optional user-provided properties to override the default properties for the consumer Lambda function. Ignored if
     * an `existingConsumerLambdaObj` is provided.
     *
     * @default - Default properties are used.
     */
    readonly consumerLambdaFunctionProps?: lambda.FunctionProps
}

/**
 * @summary The LambdaToSqsToLambda class.
 */
export class LambdaToSqsToLambda extends Construct {
    public readonly producerLambdaFunction: lambda.Function;
    public readonly sqsQueue: sqs.Queue;
    public readonly deadLetterQueue?: sqs.DeadLetterQueue;
    public readonly consumerLambdaFunction: lambda.Function;

    /**
     * @summary Constructs a new instance of the LambdaToSqsToLambda class.
     * @param {cdk.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a a scope-unique id.
     * @param {LambdaToSqsToLambdaProps} props - user provided props for the construct.
     * @since 1.53.0
     * @access public
     */
    constructor(scope: Construct, id: string, props: LambdaToSqsToLambdaProps) {
      super(scope, id);

      // Setup the aws-lambda-sqs pattern
      const lambdaToSqs = new LambdaToSqs(this, 'lambda-to-sqs', {
        existingLambdaObj: props.existingProducerLambdaObj,
        lambdaFunctionProps: props.producerLambdaFunctionProps,
        existingQueueObj: props.existingQueueObj,
        queueProps: props.queueProps,
        deadLetterQueueProps: props.deadLetterQueueProps,
        deployDeadLetterQueue: props.deployDeadLetterQueue,
        maxReceiveCount: props.maxReceiveCount
      });

      // Set the queue as a pattern property
      this.sqsQueue = lambdaToSqs.sqsQueue;

      // Setup the aws-sqs-lambda pattern
      const sqsToLambda = new SqsToLambda(this, 'sqs-to-lambda', {
        existingLambdaObj: props.existingConsumerLambdaObj,
        lambdaFunctionProps: props.consumerLambdaFunctionProps,
        existingQueueObj: this.sqsQueue,
        deployDeadLetterQueue: false
      });

      // Set other relevant pattern properties
      this.producerLambdaFunction = lambdaToSqs.lambdaFunction;
      this.deadLetterQueue = lambdaToSqs.deadLetterQueue;
      this.consumerLambdaFunction = sqsToLambda.lambdaFunction;
    }
}