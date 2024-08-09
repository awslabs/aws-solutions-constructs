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
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as logs from 'aws-cdk-lib/aws-logs';

/**
 * @summary Properties for the LambdaToStepfunctions class.
 */
export interface LambdaToStepfunctionsProps {
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
   * Optional Name for the Lambda function environment variable set to the ARN of the state machine.
   *
   * @default - STATE_MACHINE_ARN
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
 * @summary The LambdaToStepfunctionsProps class.
 */
export class LambdaToStepfunctions extends Construct {
  public readonly lambdaFunction: lambda.Function;
  public readonly stateMachine: sfn.StateMachine;
  public readonly stateMachineLogGroup: logs.ILogGroup;
  public readonly cloudwatchAlarms?: cloudwatch.Alarm[];
  public readonly vpc?: ec2.IVpc;

  /**
   * @summary Constructs a new instance of the LambdaToStepfunctionsProps class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {LambdaToStepfunctionsProps} props - user provided props for the construct.
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: LambdaToStepfunctionsProps) {
    super(scope, id);
    defaults.CheckVpcProps(props);
    defaults.CheckLambdaProps(props);

    // Setup vpc
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

      defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.STEP_FUNCTIONS);
    }

    // Setup the state machine
    const buildStateMachineResponse = defaults.buildStateMachine(this, defaults.idPlaceholder, props.stateMachineProps,
      props.logGroupProps);
    this.stateMachine = buildStateMachineResponse.stateMachine;
    this.stateMachineLogGroup = buildStateMachineResponse.logGroup;

    // Setup the Lambda function
    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps,
      vpc: this.vpc
    });

    // Assign the state machine ARN as an environment variable
    const stateMachineEnvironmentVariableName = props.stateMachineEnvironmentVariableName || 'STATE_MACHINE_ARN';
    this.lambdaFunction.addEnvironment(stateMachineEnvironmentVariableName, this.stateMachine.stateMachineArn);

    // Grant the start execution permission to the Lambda function
    this.stateMachine.grantStartExecution(this.lambdaFunction);

    if (props.createCloudWatchAlarms === undefined || props.createCloudWatchAlarms) {
      // Deploy best-practice CloudWatch Alarm for state machine
      this.cloudwatchAlarms = defaults.buildStepFunctionCWAlarms(this, this.stateMachine);
    }
  }
}