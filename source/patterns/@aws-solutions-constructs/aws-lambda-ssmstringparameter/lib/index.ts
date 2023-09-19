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
import * as defaults from "@aws-solutions-constructs/core";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import {Construct} from "constructs";

/**
 * @summary The properties for the LambdaToSsmstringparameter class.
 */
export interface LambdaToSsmstringparameterProps {
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
   * Optional user provided props to override the default props for SSM String parameter. If existingStringParameterObj
   * is not set stringParameterProps is required. The only supported string parameter type is ParameterType.STRING.
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
   * Optional Name for the Lambda function environment variable set to the name of the parameter.
   *
   * @default - SSM_STRING_PARAMETER_NAME
   */
  readonly stringParameterEnvironmentVariableName?: string;
  /**
   * Optional SSM String parameter permissions to grant to the Lambda function.
   * One of the following may be specified: "Read", "ReadWrite".
   *
   * @default - Read access is given to the Lambda function if no value is specified.
   */
  readonly stringParameterPermissions?: string;
}

/**
 * @summary The LambdaToSsmstringparameter class.
 */
export class LambdaToSsmstringparameter extends Construct {
  public readonly lambdaFunction: lambda.Function;
  public readonly stringParameter: ssm.StringParameter;
  public readonly vpc?: ec2.IVpc;

  /**
   * @summary Constructs a new instance of the LambdaToSsmstringparameter class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {LambdaToSsmstringparameterProps} props - user provided props for the construct.
   * @since 1.49.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: LambdaToSsmstringparameterProps) {
    super(scope, id);
    defaults.CheckProps(props);
    defaults.CheckVpcProps(props);
    defaults.CheckLambdaProps(props);

    // This should have been an array, we will make it an array for validation
    if (props.stringParameterPermissions) {
      defaults.CheckListValues(['Read', 'ReadWrite'], [props.stringParameterPermissions], 'String Parameter permission');
    }

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

      defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.SSM);
    }

    // Setup the Lambda function
    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps,
      vpc: this.vpc,
    });

    // Setup the SSM String parameter
    if (props.existingStringParameterObj) {
      this.stringParameter = props.existingStringParameterObj;
    } else {
      if (!props.stringParameterProps) {
        throw new Error("existingStringParameterObj or stringParameterProps needs to be provided.");
      }
      this.stringParameter = defaults.buildSsmStringParameter(this, 'stringParameter', props.stringParameterProps);
    }

    // Configure environment variables
    const stringParameterEnvironmentVariableName = props.stringParameterEnvironmentVariableName || 'SSM_STRING_PARAMETER_NAME';
    this.lambdaFunction.addEnvironment(stringParameterEnvironmentVariableName, this.stringParameter.parameterName);

    // Add the requested or default SSM String parameter permissions
    this.stringParameter.grantRead(this.lambdaFunction);
    if (props.stringParameterPermissions) {
      const _permissions = props.stringParameterPermissions.toUpperCase();

      if (_permissions === 'READWRITE') {
        this.stringParameter.grantWrite(this.lambdaFunction);
      }
    }
  }
}
