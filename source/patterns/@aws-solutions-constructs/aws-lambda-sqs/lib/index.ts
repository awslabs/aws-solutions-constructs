/**
 *  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import * as defaults from "@aws-solutions-constructs/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as sqs from "@aws-cdk/aws-sqs";
import * as ec2 from "@aws-cdk/aws-ec2";
import { Construct } from "@aws-cdk/core";

/**
 * @summary The properties for the LambdaToSqs class.
 */
export interface LambdaToSqsProps {
  /**
   * Existing instance of Lambda Function object, if this is set then the lambdaFunctionProps is ignored.
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function;
  /**
   * User provided props to override the default props for the Lambda function.
   *
   * @default - Default properties are used.
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps;
  /**
   * Existing instance of SQS queue object, if this is set then queueProps is ignored.
   *
   * @default - Default props are used
   */
  readonly existingQueueObj?: sqs.Queue;
  /**
   * Optional user-provided props to override the default props for the SQS queue.
   *
   * @default - Default props are used
   */
  readonly queueProps?: sqs.QueueProps;
  /**
   * Whether to grant additional permissions to the Lambda function enabling it to purge the SQS queue.
   *
   * @default - "false", disabled by default.
   */
  readonly enableQueuePurging?: boolean;
  /**
   * Optional user provided properties for the dead letter queue
   *
   * @default - Default props are used
   */
  readonly deadLetterQueueProps?: sqs.QueueProps;
  /**
   * Whether to deploy a secondary queue to be used as a dead letter queue.
   *
   * @default - true.
   */
  readonly deployDeadLetterQueue?: boolean;
  /**
   * The number of times a message can be unsuccessfully dequeued before being moved to the dead-letter queue.
   *
   * @default - required field if deployDeadLetterQueue=true.
   */
  readonly maxReceiveCount?: number;
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
  /**
   * Optional Name for the SQS queue URL environment variable set for the Lambda function.
   *
   * @default - None
   */
  readonly queueEnvironmentVariableName?: string;
}

/**
 * @summary The LambdaToSqs class.
 */
export class LambdaToSqs extends Construct {
    public readonly lambdaFunction: lambda.Function;
    public readonly sqsQueue: sqs.Queue;
    public readonly deadLetterQueue?: sqs.DeadLetterQueue;
    public readonly vpc?: ec2.IVpc;

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

      if (props.deployVpc || props.existingVpc) {
        if (props.deployVpc && props.existingVpc) {
          throw new Error("More than 1 VPC specified in the properties");
        }

        this.vpc = defaults.buildVpc(scope, {
          defaultVpcProps: defaults.DefaultIsolatedVpcProps(),
          existingVpc: props.existingVpc,
          userVpcProps: props.vpcProps,
          constructVpcProps: {
            enableDnsHostnames: true,
            enableDnsSupport: true,
          },
        });

        defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.SQS);
      }

      // Setup the Lambda function
      this.lambdaFunction = defaults.buildLambdaFunction(this, {
        existingLambdaObj: props.existingLambdaObj,
        lambdaFunctionProps: props.lambdaFunctionProps,
        vpc: this.vpc,
      });

      // Setup the dead letter queue, if applicable
      this.deadLetterQueue = defaults.buildDeadLetterQueue(this, {
        existingQueueObj: props.existingQueueObj,
        deployDeadLetterQueue: props.deployDeadLetterQueue,
        deadLetterQueueProps: props.deadLetterQueueProps,
        maxReceiveCount: props.maxReceiveCount
      });

      // Setup the queue
      [this.sqsQueue] = defaults.buildQueue(this, 'queue', {
        existingQueueObj: props.existingQueueObj,
        queueProps: props.queueProps,
        deadLetterQueue: this.deadLetterQueue
      });

      // Configure environment variables
      const queueEnvironmentVariableName = props.queueEnvironmentVariableName || 'SQS_QUEUE_URL';
      this.lambdaFunction.addEnvironment(queueEnvironmentVariableName, this.sqsQueue.queueUrl);

      // Enable queue purging permissions for the Lambda function, if enabled
      if (props.enableQueuePurging) {
        this.sqsQueue.grantPurge(this.lambdaFunction);
      }

      // Enable message send permissions for the Lambda function by default
      this.sqsQueue.grantSendMessages(this.lambdaFunction);
    }
}