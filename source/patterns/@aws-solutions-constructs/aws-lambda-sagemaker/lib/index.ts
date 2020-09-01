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

import * as lambda from "@aws-cdk/aws-lambda";
import * as sagemaker from "@aws-cdk/aws-sagemaker";
import * as iam from "@aws-cdk/aws-iam";
import { Construct } from "@aws-cdk/core";
import * as defaults from "@aws-solutions-constructs/core";

/**
 * @summary The properties for the LambdaToDynamoDB Construct
 */
export interface LambdaToSagemakerProps {
  /**
   * Existing instance of Lambda Function object, if this is set then the lambdaFunctionProps is ignored.
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function;
  /**
   * User provided props to override the default props for the Lambda function.
   *
   * @default - Default props are used
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps;
  /**
   * Optional user provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly sagemakerNotebookProps: sagemaker.CfnNotebookInstanceProps;
}

/**
 * @summary The LambdaToSagemaker class.
 */
export class LambdaToSagemaker extends Construct {
  public readonly lambdaFunction: lambda.Function;
  public readonly sagemakerNotebook: sagemaker.CfnNotebookInstance;
  public readonly sagemakerRole: iam.Role;

  /**
   * @summary Constructs a new instance of the LambdaToSagemaker class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {LambdaToSagemakerProps} props - user provided props for the construct
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: LambdaToSagemakerProps) {
    super(scope, id);

    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps,
    });

    // Set up lambda policy for invoking sagemaker endpoint
    const invokeEndpointPolicy = new iam.Policy(this, 'InvokeEndpointPolicy', {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [ '*' ],
          actions: [
              'sagemaker:InvokeEndpoint',
          ]
        })
      ]
    });

    // Attach policy to lambda role
    invokeEndpointPolicy.attachToRole(this.lambdaFunction.role);

    // User provided Role ARN
    if (props.sagemakerNotebookProps.roleArn) {
      // Build notebook instance
      this.sagemakerNotebook = defaults.buildSagemakerNotebook(this, props.sagemakerNotebookProps.roleArn, props.sagemakerNotebookProps);
    } else {
      // Setup the IAM role for Sagemaker
      this.sagemakerRole = new iam.Role(this, "SagemakerRole", {
        assumedBy: new iam.ServicePrincipal("sagemaker.amazonaws.com"),
      });

      // Setup the IAM policy for Sagemaker
      const sagemakerPolicy = new iam.Policy(this, "SagemakerPolicy", {
        statements: [
          new iam.PolicyStatement({
            actions: ["sagemaker:CreateNotebookInstance"],
          }),
        ],
      });

      // Attach policy to sagemaker role
      sagemakerPolicy.attachToRole(this.sagemakerRole);

      // Build notebook instance
      this.sagemakerNotebook = defaults.buildSagemakerNotebook(this, this.sagemakerRole.roleArn, props.sagemakerNotebookProps);
      
      // Configure environment variables
      this.lambdaFunction.addEnvironment('NOTEBOOK_NAME', this.sagemakerNotebook.notebookInstanceName);
    }
  }
}
