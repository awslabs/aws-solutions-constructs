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
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as ec2 from "aws-cdk-lib/aws-ec2";

/**
 * The properties for the LambdaToKinesisStreams class.
 */
export interface LambdaToKinesisStreamsProps {
    /**
     * Existing instance of Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.
     *
     * @default - None
     */
    readonly existingLambdaObj?: lambda.Function;
    /**
     * User provided props to override the default props for the Lambda function.
     *
     * @default - Default props are used.
     */
    readonly lambdaFunctionProps?: lambda.FunctionProps;
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
    readonly kinesisStreamProps?: kinesis.StreamProps;
    /**
     * Whether to create recommended CloudWatch alarms for the Kinesis Stream
     *
     * @default - Alarms are created
     */
    readonly createCloudWatchAlarms?: boolean;
    /**
     * An existing VPC for the construct to use (construct will NOT create a new VPC in this case)
     */
    readonly existingVpc?: ec2.IVpc;
    /**
     *  Properties to override default properties if deployVpc is true
     */
    readonly vpcProps?: ec2.VpcProps;
    /**
     * Whether to deploy a new VPC
     *
     * @default - false
     */
    readonly deployVpc?: boolean;
    /**
     * Optional Name to override the Lambda Function default environment variable name that holds the Kinesis Data Stream name value
     *
     * @default - KINESIS_DATASTREAM_NAME
     */
    readonly streamEnvironmentVariableName?: string;
}

/**
 * @summary The LambdaToKinesisStream class.
 */
export class LambdaToKinesisStreams extends Construct {
    public readonly vpc?: ec2.IVpc;
    public readonly kinesisStream: kinesis.Stream;
    public readonly lambdaFunction: lambda.Function;
    public readonly cloudwatchAlarms?: cloudwatch.Alarm[];

    /**
     * @summary Constructs a new instance of the KinesisStreamsToLambda class.
     * @param {cdk.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a a scope-unique id.
     * @param {LambdaToKinesisStreamsProps} props - user provided props for the construct
     * @since 0.8.0
     * @access public
     */
    constructor(scope: Construct, id: string, props: LambdaToKinesisStreamsProps) {
      super(scope, id);
      defaults.CheckProps(props);

      // Setup the VPC
      if (props.deployVpc || props.existingVpc) {
        this.vpc = defaults.buildVpc(scope, {
          defaultVpcProps: defaults.DefaultIsolatedVpcProps(),
          existingVpc: props.existingVpc,
          userVpcProps: props.vpcProps,
          constructVpcProps: {
            enableDnsHostnames: true,
            enableDnsSupport: true,
          },
        });

        defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.KINESIS_STREAMS);
      }

      // Setup the Lambda function
      this.lambdaFunction = defaults.buildLambdaFunction(this, {
        existingLambdaObj: props.existingLambdaObj,
        lambdaFunctionProps: props.lambdaFunctionProps,
        vpc: this.vpc
      });

      // Setup the Kinesis Stream
      this.kinesisStream = defaults.buildKinesisStream(this, {
        existingStreamObj: props.existingStreamObj,
        kinesisStreamProps: props.kinesisStreamProps
      });

      // Configure Lambda Function environment variables
      const streamNameEnvironmentVariableName = props.streamEnvironmentVariableName || 'KINESIS_DATASTREAM_NAME';
      this.lambdaFunction.addEnvironment(streamNameEnvironmentVariableName, this.kinesisStream.streamName);

      // Grant the Lambda Function permission to write to the Kinesis Stream
      this.kinesisStream.grantWrite(this.lambdaFunction.grantPrincipal);

      // Grant the Lambda Function permission to use the stream's encryption key so it can publish messages to it
      this.kinesisStream.encryptionKey?.grant(this.lambdaFunction.grantPrincipal,
        'kms:Decrypt',
        'kms:GenerateDataKey*',
      );

      if (props.createCloudWatchAlarms === undefined || props.createCloudWatchAlarms) {
        // Deploy best practices CW Alarms for Kinesis Stream
        this.cloudwatchAlarms = defaults.buildKinesisStreamCWAlarms(this);
      }
    }
}