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

import * as lambda from "@aws-cdk/aws-lambda";
import * as sagemaker from "@aws-cdk/aws-sagemaker";
import * as iam from "@aws-cdk/aws-iam";
import { Aws, Construct } from "@aws-cdk/core";
import * as defaults from "@aws-solutions-constructs/core";
import * as ec2 from "@aws-cdk/aws-ec2";

/**
 * @summary The properties for the LambdaToSagemaker Construct
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
  readonly sagemakerNotebookProps?: sagemaker.CfnNotebookInstanceProps | any;
  /**
   * Optional user provided props to deploy inside vpc
   *
   * @default - true
   */
  readonly deployInsideVpc?: boolean,
  /**
   * Existing instance of notebook object.
   * If this is set then the sagemakerNotebookProps is ignored
   *
   * @default - None
   */
  readonly existingNotebookObj?: sagemaker.CfnNotebookInstance
}
/**
 * @summary The LambdaToSagemaker class.
 */
export class LambdaToSagemaker extends Construct {
  public readonly lambdaFunction: lambda.Function;
  public readonly sagemakerNotebook: sagemaker.CfnNotebookInstance;
  public readonly sagemakerRole: iam.Role;
  public readonly vpc?: ec2.Vpc;
  public readonly securityGroup?: ec2.SecurityGroup;

  /**
   * @summary Constructs a new instance of the LambdaToSagemaker class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {LambdaToSagemakerProps} props - user provided props for the construct
   * @since 1.69.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: LambdaToSagemakerProps) {
    super(scope, id);

    // Set up Sagemaker role
    this.sagemakerRole = new iam.Role(this, "SagemakerRole", {
      assumedBy: new iam.ServicePrincipal("sagemaker.amazonaws.com"),
    });

    // Build notebook instance
    [this.sagemakerNotebook, this.vpc, this.securityGroup] = defaults.buildSagemakerNotebook(this, {
      role: this.sagemakerRole,
      sagemakerNotebookProps: props.sagemakerNotebookProps,
      deployInsideVpc: props.deployInsideVpc,
      existingNotebookObj: props.existingNotebookObj
    });

    // Set up Lambda function
    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps,
    });

    // Attach Sagemaker policy to lambda role
    const policy = new iam.Policy(this, 'LambdaFunctionPolicy');
    const lambdaFunctionRole = this.lambdaFunction.role as iam.Role;
    policy.addStatements(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [`arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:endpoint/*`],
        actions: ['sagemaker:InvokeEndpoint']
    }));
    policy.attachToRole(lambdaFunctionRole);
  }
}