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
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import { LambdaToStepfunctions } from "@aws-solutions-constructs/aws-lambda-stepfunctions";
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from '@aws-cdk/core';
import * as ec2 from "@aws-cdk/aws-ec2";
import * as logs from '@aws-cdk/aws-logs';

/**
 * @summary Properties for the LambdaToStepFunction class.
 */
export interface LambdaToStepFunctionProps {
  /**
   * Existing instance of Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.
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
   * User provided StateMachineProps to override the defaults
   *
   * @default - None
   */
  readonly stateMachineProps: sfn.StateMachineProps;
  /**
   * Whether to create recommended CloudWatch alarms
   *
   * @default - Alarms are created
   */
  readonly createCloudWatchAlarms?: boolean;
  /**
   * User provided props to override the default props for the CloudWatchLogs LogGroup.
   *
   * @default - Default props are used
   */
  readonly logGroupProps?: logs.LogGroupProps;
  /**
   * Optional Name for the Step Functions state machine environment variable set for the producer Lambda function.
   *
   * @default - None
   */
  readonly stateMachineEnvironmentVariableName?: string;
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
 * @summary The LambdaToStepFunctionProps class.
 */
export class LambdaToStepFunction extends Construct {
  public readonly lambdaFunction: lambda.Function;
  public readonly stateMachine: sfn.StateMachine;
  public readonly stateMachineLogGroup: logs.ILogGroup;
  public readonly cloudwatchAlarms?: cloudwatch.Alarm[];
  public readonly vpc?: ec2.IVpc;

  /**
   * @summary Constructs a new instance of the LambdaToStepFunctionProps class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {LambdaToStepFunctionProps} props - user provided props for the construct.
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: LambdaToStepFunctionProps) {
    super(scope, id);
    const convertedProps: LambdaToStepFunctionProps = { ...props };
    const wrappedConstruct: LambdaToStepFunction = new LambdaToStepfunctions(this, `${id}-wrapped`, convertedProps);

    this.lambdaFunction = wrappedConstruct.lambdaFunction;
    this.stateMachine = wrappedConstruct.stateMachine;
    this.stateMachineLogGroup = wrappedConstruct.stateMachineLogGroup;
    this.cloudwatchAlarms = wrappedConstruct.cloudwatchAlarms;
    this.vpc = wrappedConstruct.vpc;
  }
}