/**
 *  Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import * as firehose from 'aws-cdk-lib/aws-kinesisfirehose';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as defaults from '@aws-solutions-constructs/core';

// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

/**
 * @summary The properties for the LambdaToKinesisFirehose class.
 */
export interface LambdaToKinesisFirehoseProps {
  /**
   * Existing instance of Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function;
  /**
   * Optional user provided props to override the default props for the Lambda function.
   *
   * @default - Default properties are used.
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps;
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
   * Optional Name for the Lambda function environment variable set to the name of the Firehose Delivery Stream.
   *
   * @default - FIREHOSE_DELIVERYSTREAM_NAME
   */
  readonly firehoseEnvironmentVariableName?: string;
  /**
   * An existing Kinesis Firehose Delivery Stream to which the Lambda function can put data. Note - the delivery stream
   * construct must have already been created and have the deliveryStreamName set. This construct will *not* create a
   * new Delivery Stream.
   */
  readonly existingKinesisFirehose: firehose.CfnDeliveryStream;
}

/**
 * @summary The LambdaToKinesisFirehose class.
 */
export class LambdaToKinesisFirehose extends Construct {
  public readonly lambdaFunction: lambda.Function;
  public readonly vpc?: ec2.IVpc;
  public readonly kinesisFirehose: firehose.CfnDeliveryStream;

  /**
   * @summary Constructs a new instance of the LambdaToKinesisFirehose class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {LambdaToKinesisFirehoseProps} props - user provided props for the construct.
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: LambdaToKinesisFirehoseProps) {
    super(scope, id);
    defaults.CheckProps(props);

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

      defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.KINESIS_FIREHOSE);
    }

    // Setup the Lambda function
    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps,
      vpc: this.vpc,
    });

    // Setup the firehose
    this.kinesisFirehose = props.existingKinesisFirehose;

    if (!this.kinesisFirehose.deliveryStreamName) {
      throw new Error('existingKinesisFirehose must have a defined deliveryStreamName');
    }

    this.lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "firehose:DeleteDeliveryStream",
        "firehose:PutRecord",
        "firehose:PutRecordBatch",
        "firehose:UpdateDestination"
      ],
      resources: [this.kinesisFirehose.attrArn],
    }));

    // Configure environment variables
    const deliverystreamEnvironmentVariableName = props.firehoseEnvironmentVariableName || 'FIREHOSE_DELIVERYSTREAM_NAME';
    this.lambdaFunction.addEnvironment(deliverystreamEnvironmentVariableName, this.kinesisFirehose!.deliveryStreamName);

  }
}