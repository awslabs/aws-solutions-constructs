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
import * as defaults from "@aws-solutions-constructs/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as ssm from "@aws-cdk/aws-ssm";
import * as ec2 from "@aws-cdk/aws-ec2";
import { Construct } from "@aws-cdk/core";

/**
 * @summary The properties for the LambdaToSsmStringParameter class.
 */
export interface LambdaToSsmStringParameterProps {
  /**
   * Existing instance of Lambda Function object, if this is set then the lambdaFunctionProps is ignored.
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
   * Existing instance of SSM String parameter object, If this is set then the stringParameterProps is ignored.
   *
   * @default - Default props are used
   */
  readonly existingStringParameterObj?: ssm.StringParameter;
  /**
   * Optional user provided props to override the default props for SSM String parameter
   *
   * @default - Default props are used
   */
  readonly stringParameterProps?: ssm.StringParameterProps;
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
   * Optional Name for the SSM String parameter environment variable set for the Lambda function.
   *
   * @default - SSM_STRING_PARAMETER_NAME
   */
  readonly stringParameterEnvironmentVariableName?: string;
  /**
   * Optional write access to the Secret for the Lambda function (Read-Only by default)
   *
   * @default - false
   */
  readonly grantWriteAccess?: boolean;
}

/**
 * @summary The LambdaToSsmStringParameter class.
 */
export class LambdaToSsmStringParameter extends Construct {
    public readonly lambdaFunction: lambda.Function;
    public readonly stringParameter: ssm.StringParameter;
    public readonly vpc?: ec2.IVpc;

    /**
     * @summary Constructs a new instance of the LambdaToSsmStringParameter class.
     * @param {cdk.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a a scope-unique id.
     * @param {LambdaToSsmStringParameterProps} props - user provided props for the construct.
     * @since 1.49.0
     * @access public
     */
    constructor(scope: Construct, id: string, props: LambdaToSsmStringParameterProps) {
      super(scope, id);

      if (props.deployVpc || props.existingVpc) {
        if (props.deployVpc && props.existingVpc) {
          throw new Error("More than 1 VPC specified in the properties");
        }
  
        this.vpc = defaults.buildVpc(scope, {
          defaultVpcProps: defaults.DefaultIsolatedVpcProps(),
          existingVpc: props.existingVpc,
          userVpcProps: props.vpcProps,
          constructVpcProps: {
            enableDnsHostnames: true,
            enableDnsSupport: true,
          },
        });
  
        defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.); 
      }

      // Setup the Lambda function
      this.lambdaFunction = defaults.buildLambdaFunction(this, {
        existingLambdaObj: props.existingLambdaObj,
        lambdaFunctionProps: props.lambdaFunctionProps,
        vpc: this.vpc,
      });

      // Setup the Secret
      if (props.existingStringParameterObj) {
        this.stringParameter = props.existingStringParameterObj;
      } else {
        this.stringParameter = defaults.buildSsmStringParamter(this, 'stringParameter', props.stringParameterProps);
      }

      // Configure environment variables
      const secretEnvironmentVariableName = props.secretEnvironmentVariableName || 'SECRET_NAME';
      this.lambdaFunction.addEnvironment(secretEnvironmentVariableName, this.stringParameter.secretName);

      // Enable read permissions for the Lambda function by default
      this.secret.grantRead(this.lambdaFunction);

      if (props.grantWriteAccess) {
        this.secret.grantWrite(this.lambdaFunction);
      }      
    }



}
