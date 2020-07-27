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
import * as defaults from '@aws-solutions-constructs/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sqs from '@aws-cdk/aws-sqs';
import { Construct } from '@aws-cdk/core';

/**
 * @summary The properties for the LambdaToSqs class.
 */
export interface LambdaToSqsProps {
    /**
     * Existing instance of Lambda Function object, if this is set then the lambdaFunctionProps is ignored.
     *
     * @default - None
     */
    readonly existingLambdaObj?: lambda.Function,
    /**
     * User provided props to override the default props for the Lambda function.
     *
     * @default - Default properties are used.
     */
    readonly lambdaFunctionProps?: lambda.FunctionProps,
    /**
     * Existing instance of SQS queue object, if this is set then queueProps is ignored.
     *
     * @default - Default props are used
     */
    readonly existingQueueObj?: sqs.Queue,
    /**
     * Optional user-provided props to override the default props for the SQS queue.
     *
     * @default - Default props are used
     */
    readonly queueProps?: sqs.QueueProps,
    /**
     * Whether to grant additional permissions to the Lambda function enabling it to purge the SQS queue.
     *
     * @default - "false", disabled by default.
     */
    readonly enableQueuePurging?: boolean,
    /**
     * Optional user provided properties for the dead letter queue
     *
     * @default - Default props are used
     */
    readonly deadLetterQueueProps?: sqs.QueueProps,
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
 * @summary The LambdaToSqs class.
 */
export class LambdaToSqs extends Construct {
    public readonly lambdaFunction: lambda.Function;
    public readonly sqsQueue: sqs.Queue;
    public readonly deadLetterQueue?: sqs.DeadLetterQueue;

    /**
     * @summary Constructs a new instance of the LambdaToSqs class.
     * @param {cdk.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a a scope-unique id.
     * @param {LambdaToSqsProps} props - user provided props for the construct.
     * @since 1.49.0
     * @access public
     */
    constructor(scope: Construct, id: string, props: LambdaToSqsProps) {
        super(scope, id);

        // Setup the Lambda function
        this.lambdaFunction = defaults.buildLambdaFunction(this, {
            existingLambdaObj: props.existingLambdaObj,
            lambdaFunctionProps: props.lambdaFunctionProps
        });

        // Setup a dead letter queue, if applicable
        if (props.deployDeadLetterQueue || props.deployDeadLetterQueue === undefined) {
          const dlq: sqs.Queue = defaults.buildQueue(this, 'deadLetterQueue', {
              queueProps: props.deadLetterQueueProps
          });
          this.deadLetterQueue = defaults.buildDeadLetterQueue({
              deadLetterQueue: dlq,
              maxReceiveCount: props.maxReceiveCount
          });
        }

        // Setup the queue
        this.sqsQueue = defaults.buildQueue(this, 'queue', {
            existingQueueObj: props.existingQueueObj,
            queueProps: props.queueProps,
            deadLetterQueue: this.deadLetterQueue
        });

        // Configure environment variables
        this.lambdaFunction.addEnvironment('SQS_QUEUE_URL', this.sqsQueue.queueUrl);

        // Enable queue purging permissions for the Lambda function, if enabled
        if (props.enableQueuePurging) {
            this.sqsQueue.grantPurge(this.lambdaFunction);
        }

        // Enable message send permissions for the Lambda function by default
        this.sqsQueue.grantSendMessages(this.lambdaFunction);
    }
}