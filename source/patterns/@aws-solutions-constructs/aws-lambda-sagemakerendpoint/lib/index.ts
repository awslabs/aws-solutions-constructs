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

import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as sagemaker from '@aws-cdk/aws-sagemaker';
import * as defaults from '@aws-solutions-constructs/core';

/**
 * @summary The properties for the LambdaToSageMakerEndpoint class
 */
export interface LambdaToSageMakerEndpointProps {
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
   * Existing SageMaker Enpoint object, if this is set then the modelProps, endpointConfigProps, and endpointProps are ignored
   *
   * @default - None
   */
  readonly existingSageMakerEndpointObj?: sagemaker.CfnEndpoint;
  /**
   * User provided props to create SageMaker Model
   *
   * @default - None
   */
  readonly modelProps?: sagemaker.CfnModelProps;
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
  readonly existingVpc?: ec2.Vpc;
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
   * Whether to deploy a natgatway in the new VPC (if deployVpc is true).
   * If deployNatGateway is true, the construct creates Public and Private subnets.
   * Otherwise, it creates Isolated subnets only
   *
   * @default - false
   */
  readonly deployNatGateway?: boolean;
  /**
   * IAM Role, with all required permissions, to be assumed by SageMaker to create resources
   * The Role is not required if existingSageMakerEndpointObj is provided.
   *
   * @default - None
   */
  readonly role?: iam.Role;
}

/**
 * @summary The LambdaToSageMakerEndpoint class.
 */
export class LambdaToSageMakerEndpoint extends cdk.Construct {
  public readonly lambdaFunction: lambda.Function;
  public readonly sageMakerEndpoint: sagemaker.CfnEndpoint;
  public readonly sageMakerEndpointConfig?: sagemaker.CfnEndpointConfig;
  public readonly sageMakerModel?: sagemaker.CfnModel;
  public readonly vpc?: ec2.Vpc;

  /**
   * @summary Constructs a new instance of the LambdaToSageMakerEndpoint class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {LambdaToSageMakerEndpointProps} props - user provided props for the construct.
   * @since 1.76.0
   * @access public
   */
  constructor(scope: cdk.Construct, id: string, props: LambdaToSageMakerEndpointProps) {
    super(scope, id);

    if (props.deployVpc || props.existingVpc) {
      if (props.deployVpc && props.existingVpc) {
        throw new Error('More than 1 VPC specified in the properties');
      }

      // If deployNatGateway is true, create Public and Private subnets. Otherwise, create Isolated subnets only
      const subnetConfiguration: ec2.SubnetConfiguration[] = props.deployNatGateway
        ? [
            {
              cidrMask: 18,
              name: 'Public',
              subnetType: ec2.SubnetType.PUBLIC,
            },
            {
              cidrMask: 18,
              name: 'Private',
              subnetType: ec2.SubnetType.PRIVATE,
            },
          ]
        : [
            {
              cidrMask: 18,
              name: 'Isolated',
              subnetType: ec2.SubnetType.ISOLATED,
            },
          ];

      // create the VPC
      this.vpc = defaults.buildVpc(scope, {
        existingVpc: props.existingVpc,
        userVpcProps: props.vpcProps,
        constructVpcProps: {
          enableDnsHostnames: true,
          enableDnsSupport: true,
          // set # NatGateways to 2 if deployNatGateway is true. Otherwise, 0
          natGateways: props.deployNatGateway ? 2 : 0,
          subnetConfiguration,
        },
      });

      // Add S3 VPC Gateway Endpint, required by SageMaker to access Models artifacts via AWS private network
      defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.S3);
      // Add SAGEMAKER_RUNTIME VPC Interface Endpint, required by the lambda function to invoke the SageMaker endpoint
      defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.SAGEMAKER_RUNTIME);
    }

    // Build SageMaker Endpoint (inclduing SageMaker's Endpoint Configuration and Model)
    [this.sageMakerEndpoint, this.sageMakerEndpointConfig, this.sageMakerModel] = defaults.BuildSageMakerEndpoint(
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

    // Add ENDPOINT_NAME environment variable
    this.lambdaFunction.addEnvironment('ENDPOINT_NAME', this.sageMakerEndpoint.attrEndpointName);

    // Add permission to invoke the SageMaker endpoint
    this.lambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['sagemaker:InvokeEndpoint'],
        resources: [this.sageMakerEndpoint.ref],
      })
    );
  }
}
