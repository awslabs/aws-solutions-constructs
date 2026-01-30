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
import { KinesisEventSourceProps, KinesisEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

/**
 * The properties for the KinesisStreamsToLambda class.
 */
export interface KinesisStreamsToLambdaProps {
    /**
     * Optional - instance of an existing Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.
     *
     * @default - None
     */
    readonly existingLambdaObj?: lambda.Function,
    /**
     * Optional - user provided props to override the default props for the Lambda function. Providing both this and `existingLambdaObj`
   * causes an error.
     *
     * @default - Default props are used.
     */
    readonly lambdaFunctionProps?: lambda.FunctionProps,
    /**
     * Existing instance of Kinesis Stream, providing both this and `kinesisStreamProps` will cause an error.
     *
     * @default - None
     */
    readonly existingStreamObj?: kinesis.Stream;
    /**
     * Optional user-provided props to override the default props for the Kinesis stream.
     *
     * @default - Default props are used.
     */
    readonly kinesisStreamProps?: kinesis.StreamProps,
    /**
     * Optional user-provided props to override the default props for the Lambda event source mapping.
     *
     * @default - Default props are used.
     */
    readonly kinesisEventSourceProps?: KinesisEventSourceProps | any,
    /**
     * Whether to deploy a SQS dead letter queue when a data record reaches the Maximum Retry Attempts or Maximum Record Age,
     * its metadata like shard ID and stream ARN will be sent to an SQS queue.
     *
     * @default - true.
     */
    readonly deploySqsDlqQueue?: boolean,
    /**
     * Optional user provided properties for the SQS dead letter queue
     *
     * @default - Default props are used
     */
    readonly sqsDlqQueueProps?: sqs.QueueProps
    /**
     * Whether to create recommended CloudWatch alarms
     *
     * @default - Alarms are created
     */
    readonly createCloudWatchAlarms?: boolean
}

/**
 * @summary The KinesisStreamsToLambda class.
 */
export class KinesisStreamsToLambda extends Construct {
    public readonly kinesisStream: kinesis.Stream;
    public readonly lambdaFunction: lambda.Function;
    public readonly cloudwatchAlarms?: cloudwatch.Alarm[];

    /**
     * @summary Constructs a new instance of the KinesisStreamsToLambda class.
     * @param {cdk.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a a scope-unique id.
     * @param {KinesisStreamsToLambdaProps} props - user provided props for the construct
     * @since 0.8.0
     * @access public
     */
    constructor(scope: Construct, id: string, props: KinesisStreamsToLambdaProps) {
      super(scope, id);
      defaults.CheckLambdaProps(props);
      defaults.CheckKinesisStreamProps(props);

      // Setup the Kinesis Stream
      this.kinesisStream = defaults.buildKinesisStream(this, {
        existingStreamObj: props.existingStreamObj,
        kinesisStreamProps: props.kinesisStreamProps
      });

      // Setup the Lambda function
      this.lambdaFunction = defaults.buildLambdaFunction(this, {
        existingLambdaObj: props.existingLambdaObj,
        lambdaFunctionProps: props.lambdaFunctionProps
      });

      // Grant Kinesis Stream read perimssion for lambda function
      this.kinesisStream.grantRead(this.lambdaFunction.grantPrincipal);

      // Add the Lambda event source mapping
      const eventSourceProps = defaults.DefaultKinesisEventSourceProps(this, {
        eventSourceProps: props.kinesisEventSourceProps,
        deploySqsDlqQueue: props.deploySqsDlqQueue,
        sqsDlqQueueProps: props.sqsDlqQueueProps
      });
      this.lambdaFunction.addEventSource(new KinesisEventSource(this.kinesisStream, eventSourceProps));

      if (props.createCloudWatchAlarms === undefined || props.createCloudWatchAlarms) {
        // Deploy best practices CW Alarms for Kinesis Stream
        this.cloudwatchAlarms = defaults.buildKinesisStreamCWAlarms(this);
      }
    }
}