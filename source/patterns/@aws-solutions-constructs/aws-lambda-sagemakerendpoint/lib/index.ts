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

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

/**
 * @summary The properties for the LambdaToSagemakerEndpoint class
 */
export interface LambdaToSagemakerEndpointProps {
  /**
   * Existing instance of Lambda Function object, Providing both this and lambdaFunctionProps will cause an error.
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function;
  /**
   * User provided props to override the default props for the Lambda function
   *
   * @default - Default props are used
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps;
  /**
   * Existing SageMaker Endpoint object, providing both this and endpointProps will cause an error.
   *
   * @default - None
   */
  readonly existingSagemakerEndpointObj?: sagemaker.CfnEndpoint;
  /**
   * User provided props to create SageMaker Model
   *
   * @default - None
   */
  readonly modelProps?: sagemaker.CfnModelProps | any;
  /**
   * User provided props to create SageMaker Endpoint Configuration
   *
   * @default - Default props are used
   */
  readonly endpointConfigProps?: sagemaker.CfnEndpointConfigProps;
  /**
   * User provided props to create SageMaker Endpoint
   *
   * @default - Default props are used
   */
  readonly endpointProps?: sagemaker.CfnEndpointProps;
  /**
   * An existing VPC for the construct to use (construct will NOT create a new VPC in this case)
   *
   * @default - None
   */
  readonly existingVpc?: ec2.IVpc;
  /**
   * Properties to override default properties if deployVpc is true
   *
   * @default - None
   */
  readonly vpcProps?: ec2.VpcProps;
  /**
   * Whether to deploy a new VPC
   *
   * @default - false
   */
  readonly deployVpc?: boolean;
  /**
   * Optional Name for the Lambda function environment variable set to the name of the SageMaker endpoint.
   *
   * @default - SAGEMAKER_ENDPOINT_NAME
   */
  readonly sagemakerEnvironmentVariableName?: string;
}

/**
 * @summary The LambdaToSagemakerEndpoint class.
 */
export class LambdaToSagemakerEndpoint extends Construct {
  public readonly lambdaFunction: lambda.Function;
  public readonly sagemakerEndpoint: sagemaker.CfnEndpoint;
  public readonly sagemakerEndpointConfig?: sagemaker.CfnEndpointConfig;
  public readonly sagemakerModel?: sagemaker.CfnModel;
  public readonly vpc?: ec2.IVpc;

  /**
   * @summary Constructs a new instance of the LambdaToSagemakerEndpoint class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a scope-unique id.
   * @param {LambdaToSagemakerEndpointProps} props - user provided props for the construct.
   * @since 1.87.1
   * @access public
   */
  constructor(scope: Construct, id: string, props: LambdaToSagemakerEndpointProps) {
    super(scope, id);
    defaults.CheckVpcProps(props);
    defaults.CheckLambdaProps(props);
    defaults.CheckSagemakerProps(props);

    if (props.deployVpc || props.existingVpc) {

      // create the VPC
      this.vpc = defaults.buildVpc(scope, {
        defaultVpcProps: defaults.DefaultIsolatedVpcProps(),
        existingVpc: props.existingVpc,
        userVpcProps: props.vpcProps,
        constructVpcProps: {
          enableDnsHostnames: true,
          enableDnsSupport: true,
        },
      });

      // Add S3 VPC Gateway Endpoint, required by SageMaker to access Models artifacts via AWS private network
      defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.S3);
      // Add SAGEMAKER_RUNTIME VPC Interface Endpoint, required by the lambda function to invoke the SageMaker endpoint
      defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.SAGEMAKER_RUNTIME);
    }

    // Build SageMaker Endpoint (inclduing SageMaker's Endpoint Configuration and Model)
    const buildSagemakerEndpointResponse = defaults.BuildSagemakerEndpoint(
      this,
      id,
      {
        ...props,
        vpc: this.vpc,
      }
    );
    this.sagemakerEndpoint = buildSagemakerEndpointResponse.endpoint;
    this.sagemakerEndpointConfig = buildSagemakerEndpointResponse.endpointConfig;
    this.sagemakerModel = buildSagemakerEndpointResponse.model;

    // Setup the Lambda function
    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps,
      vpc: this.vpc,
    });

    // Configure environment variables
    const sagemakerEnvironmentVariableName = props.sagemakerEnvironmentVariableName || 'SAGEMAKER_ENDPOINT_NAME';
    this.lambdaFunction.addEnvironment(sagemakerEnvironmentVariableName, this.sagemakerEndpoint.attrEndpointName);

    // Add permission to invoke the SageMaker endpoint
    this.lambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['sagemaker:InvokeEndpoint'],
        resources: [this.sagemakerEndpoint.ref],
      })
    );
  }
}
