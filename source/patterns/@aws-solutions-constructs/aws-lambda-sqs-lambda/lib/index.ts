/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { LambdaToSqs } from '@aws-solutions-constructs/aws-lambda-sqs';
import { SqsToLambda } from '@aws-solutions-constructs/aws-sqs-lambda';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import { SqsEventSourceProps } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as ec2 from "aws-cdk-lib/aws-ec2";

/**
 * @summary The properties for the LambdaToSqsToLambda class.
 */
export interface LambdaToSqsToLambdaProps {
  /**
   * An optional, existing Lambda function to be used instead of the default function for sending messages to the
   * queue. Providing both this and `producerLambdaFunctionProps` property will cause an error.
   *
   * @default - None.
   */
  readonly existingProducerLambdaObj?: lambda.Function;
  /**
   * Optional - user provided props to override the default props for the producer Lambda function. Providing
   * both this and `existingProducerLambdaObj` is an error.
   *
   * @default - Default properties are used.
   */
  readonly producerLambdaFunctionProps?: lambda.FunctionProps;
  /**
   * An optional, existing SQS queue to be used instead of the default queue. Providing both this and `queueProps`
   * will cause an error.
   *
   * @default - None.
   */
  readonly existingQueueObj?: sqs.Queue;
  /**
   * Optional - user provided properties to override the default properties for the SQS queue.
   * Providing both this and `existingQueueObj` will cause an error.
   *
   * @default - Default props are used.
   */
  readonly queueProps?: sqs.QueueProps;
  /**
   * Whether to create a secondary queue to be used as a dead letter queue. Defaults to `true`.
   *
   * @default - true.
   */
  readonly deployDeadLetterQueue?: boolean;
  /**
   * Optional user-provided props to override the default props for the dead letter queue. Only used if the
   * `deployDeadLetterQueue` property is set to true.
   *
   * @default - Default props are used.
   */
  readonly deadLetterQueueProps?: sqs.QueueProps;
  /**
   * The number of times a message can be unsuccessfully dequeued before being moved to the dead letter queue.
   * Defaults to `15`.
   *
   * @default - 15.
   */
  readonly maxReceiveCount?: number;
  /**
   * An optional, existing Lambda function to be used instead of the default function for receiving/consuming messages
   * from the queue. Providing both this and `consumerLambdaFunctionProps` will cause an error.
   *
   * @default - None.
   */
  readonly existingConsumerLambdaObj?: lambda.Function;
  /**
   * Optional - user provided props to override the default props for the consumer
   * Lambda function. Providing both this and `existingConsumerLambdaObj` is an error.
   * @default - Default properties are used.
   */
  readonly consumerLambdaFunctionProps?: lambda.FunctionProps;
  /**
   * Optional Name for the Lambda function environment variable set to the URL of the queue.
   *
   * @default - SQS_QUEUE_URL
   */
  readonly queueEnvironmentVariableName?: string;
  /**
   * Optional user provided properties for the queue event source
   *
   * @default - Default props are used
   */
  readonly sqsEventSourceProps?: SqsEventSourceProps
  /**
   * An existing VPC for the construct to use (construct will NOT create a new VPC in this case)
   */
  readonly existingVpc?: ec2.IVpc;
  /**
   * Properties to override default properties if deployVpc is true
   */
  readonly vpcProps?: ec2.VpcProps;
  /**
   * Whether to deploy a new VPC
   *
   * @default - false
   */
  readonly deployVpc?: boolean;
}

/**
 * @summary The LambdaToSqsToLambda class.
 */
export class LambdaToSqsToLambda extends Construct {
  public readonly producerLambdaFunction: lambda.Function;
  public readonly sqsQueue: sqs.Queue;
  public readonly deadLetterQueue?: sqs.DeadLetterQueue;
  public readonly consumerLambdaFunction: lambda.Function;
  public readonly vpc?: ec2.IVpc;

  /**
   * @summary Constructs a new instance of the LambdaToSqsToLambda class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {LambdaToSqsToLambdaProps} props - user provided props for the construct.
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
      maxReceiveCount: props.maxReceiveCount,
      queueEnvironmentVariableName: props.queueEnvironmentVariableName,
      existingVpc: props.existingVpc,
      vpcProps: props.vpcProps,
      deployVpc: props.deployVpc
    });
    // Set the vpc as a pattern property
    this.vpc = lambdaToSqs.vpc;
    // Set the queue as a pattern property
    this.sqsQueue = lambdaToSqs.sqsQueue;

    // Setup the aws-sqs-lambda pattern
    const sqsToLambda = new SqsToLambda(this, 'sqs-to-lambda', {
      existingLambdaObj: props.existingConsumerLambdaObj,
      lambdaFunctionProps: props.consumerLambdaFunctionProps,
      existingQueueObj: this.sqsQueue,
      deployDeadLetterQueue: false,
      sqsEventSourceProps: props.sqsEventSourceProps
    });

    // Set other relevant pattern properties
    this.producerLambdaFunction = lambdaToSqs.lambdaFunction;
    this.deadLetterQueue = lambdaToSqs.deadLetterQueue;
    this.consumerLambdaFunction = sqsToLambda.lambdaFunction;
  }
}