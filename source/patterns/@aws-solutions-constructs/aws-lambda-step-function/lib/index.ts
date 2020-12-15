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
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as defaults from '@aws-solutions-constructs/core';
import { Construct } from '@aws-cdk/core';
import { LogGroup } from '@aws-cdk/aws-logs';

/**
 * @summary Properties for the LambdaToStepFunction class.
 */
export interface LambdaToStepFunctionProps {
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
    readonly lambdaFunctionProps?: lambda.FunctionProps
    /**
     * User provided StateMachineProps to override the defaults
     *
     * @default - None
     */
    readonly stateMachineProps: sfn.StateMachineProps,
    /**
     * Whether to create recommended CloudWatch alarms
     *
     * @default - Alarms are created
     */
    readonly createCloudWatchAlarms?: boolean
}

/**
 * @summary The LambdaToStepFunctionProps class.
 */
export class LambdaToStepFunction extends Construct {
    public readonly lambdaFunction: lambda.Function;
    public readonly stateMachine: sfn.StateMachine;
    public readonly stateMachineLogGroup: LogGroup;
    public readonly cloudwatchAlarms?: cloudwatch.Alarm[];

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

      // Setup the state machine
      [this.stateMachine, this.stateMachineLogGroup] = defaults.buildStateMachine(this, props.stateMachineProps);

      // Setup the Lambda function
      this.lambdaFunction = defaults.buildLambdaFunction(this, {
        existingLambdaObj: props.existingLambdaObj,
        lambdaFunctionProps: props.lambdaFunctionProps,
      });

      // Assign the state machine ARN as an environment variable
      this.lambdaFunction.addEnvironment('STATE_MACHINE_ARN', this.stateMachine.stateMachineArn);

      // Grant the start execution permission to the Lambda function
      this.stateMachine.grantStartExecution(this.lambdaFunction);

      if (props.createCloudWatchAlarms === undefined || props.createCloudWatchAlarms) {
        // Deploy best-practice CloudWatch Alarm for state machine
        this.cloudwatchAlarms = defaults.buildStepFunctionCWAlarms(this, this.stateMachine);
      }
    }
}