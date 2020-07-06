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
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as defaults from '@aws-solutions-constructs/core';
import { Construct } from '@aws-cdk/core';

/**
 * @summary Properties for the LambdaToStepFunction class.
 */
export interface LambdaToStepFunctionProps {
    /**
     * Whether to create a new Lambda function or use an existing Lambda function.
     * If set to false, you must provide an existing function for the `existingLambdaObj` property.
     *
     * @default - true
     */
    readonly deployLambda: boolean,
    /**
     * Existing instance of Lambda Function object.
     * If `deploy` is set to false only then this property is required
     *
     * @default - None
     */
    readonly existingLambdaObj?: lambda.Function,
    /**
     * Optional user provided properties to override the default properties for the Lambda function.
     * If `deploy` is set to true only then this property is required.
     *
     * @default - Default properties are used.
     */
    readonly lambdaFunctionProps?: lambda.FunctionProps
    /**
     * User provided StateMachineProps to override the defaults
     *
     * @default - None
     */
    readonly stateMachineProps: sfn.StateMachineProps
}

/**
 * @summary The LambdaToStepFunctionProps class.
 */
export class LambdaToStepFunction extends Construct {
    public readonly lambdaFunction: lambda.Function;
    public readonly stateMachine: sfn.StateMachine;
    public readonly cloudwatchAlarms: cloudwatch.Alarm[];

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
      this.stateMachine = defaults.buildStateMachine(this, props.stateMachineProps);

      // Setup the Lambda function
      this.lambdaFunction = defaults.buildLambdaFunction(this, {
          deployLambda: props.deployLambda,
          existingLambdaObj: props.existingLambdaObj,
          lambdaFunctionProps: props.lambdaFunctionProps,
      });

      // Assign the state machine ARN as an environment variable
      this.lambdaFunction.addEnvironment('STATE_MACHINE_ARN', this.stateMachine.stateMachineArn);

      // Grant the start execution permission to the Lambda function
      this.stateMachine.grantStartExecution(this.lambdaFunction);

      // Deploy best-practice CloudWatch Alarm for state machine
      this.cloudwatchAlarms = defaults.buildStepFunctionCWAlarms(this, this.stateMachine);
    }
}