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

import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as sagemaker from '@aws-cdk/aws-sagemaker';
import * as defaults from '@aws-solutions-constructs/core';

/**
 * @summary The properties for the LambdaToSagemakerEndpoint class
 */
export interface LambdaToSagemakerEndpointProps {
  /**
   * Existing instance of Lambda Function object, if this is set then the lambdaFunctionProps is ignored
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
   * Existing Sagemaker Enpoint object, if this is set then the modelProps, endpointConfigProps, and endpointProps are ignored
   *
   * @default - None
   */
  readonly existingSagemakerEndpointObj?: sagemaker.CfnEndpoint;
  /**
   * User provided props to create Sagemaker Model
   *
   * @default - None
   */
  readonly modelProps?: sagemaker.CfnModelProps | any;
  /**
   * User provided props to create Sagemaker Endpoint Configuration
   *
   * @default - Default props are used
   */
  readonly endpointConfigProps?: sagemaker.CfnEndpointConfigProps;
  /**
   * User provided props to create Sagemaker Endpoint
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
   * Optional Name for the SageMaker endpoint environment variable set for the Lambda function.
   *
   * @default - None
   */
  readonly sagemakerEnvironmentVariableName?: string;
}

/**
 * @summary The LambdaToSagemakerEndpoint class.
 */
export class LambdaToSagemakerEndpoint extends cdk.Construct {
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
  constructor(scope: cdk.Construct, id: string, props: LambdaToSagemakerEndpointProps) {
    super(scope, id);

    if (props.deployVpc || props.existingVpc) {
      if (props.deployVpc && props.existingVpc) {
        throw new Error('More than 1 VPC specified in the properties');
      }

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

      // Add S3 VPC Gateway Endpoint, required by Sagemaker to access Models artifacts via AWS private network
      defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.S3);
      // Add SAGEMAKER_RUNTIME VPC Interface Endpoint, required by the lambda function to invoke the Sagemaker endpoint
      defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.SAGEMAKER_RUNTIME);
    }

    // Build Sagemaker Endpoint (inclduing Sagemaker's Endpoint Configuration and Model)
    [this.sagemakerEndpoint, this.sagemakerEndpointConfig, this.sagemakerModel] = defaults.BuildSagemakerEndpoint(
      this,
      {
        ...props,
        vpc: this.vpc,
      }
    );

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
