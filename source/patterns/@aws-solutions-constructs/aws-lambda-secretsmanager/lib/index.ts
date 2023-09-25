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
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

/**
 * @summary The properties for the LambdaToSecretsmanager class.
 */
export interface LambdaToSecretsmanagerProps {
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
   * Existing instance of Secret object, providing both this and secretProps will cause an error.
   *
   * @default - Default props are used
   */
  readonly existingSecretObj?: secretsmanager.Secret;
  /**
   * Optional user-provided props to override the default props for the Secret.
   *
   * @default - Default props are used
   */
  readonly secretProps?: secretsmanager.SecretProps;
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
   * Optional Name for the Lambda function environment variable set to the ARN of the secret.
   *
   * @default - SECRET_ARN
   */
  readonly secretEnvironmentVariableName?: string;
  /**
   * Optional secret permissions to grant to the Lambda function.
   * One of the following may be specified: "Read" or "ReadWrite".
   *
   * @default - Read only access is given to the Lambda function if no value is specified.
   */
  readonly grantWriteAccess?: string;
}

/**
 * @summary The LambdaToSecretsmanager class.
 */
export class LambdaToSecretsmanager extends Construct {
    public readonly lambdaFunction: lambda.Function;
    public readonly secret: secretsmanager.Secret;
    public readonly vpc?: ec2.IVpc;

    /**
     * @summary Constructs a new instance of the LambdaToSecretsmanager class.
     * @param {cdk.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a a scope-unique id.
     * @param {LambdaToSecretsmanagerProps} props - user provided props for the construct.
     * @access public
     */
    constructor(scope: Construct, id: string, props: LambdaToSecretsmanagerProps) {
      super(scope, id);
      defaults.CheckVpcProps(props);
      defaults.CheckLambdaProps(props);
      defaults.CheckSecretsManagerProps(props);

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

        defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.SECRETS_MANAGER);
      }

      // Setup the Lambda function
      this.lambdaFunction = defaults.buildLambdaFunction(this, {
        existingLambdaObj: props.existingLambdaObj,
        lambdaFunctionProps: props.lambdaFunctionProps,
        vpc: this.vpc,
      });

      // Setup the Secret
      if (props.existingSecretObj) {
        this.secret = props.existingSecretObj;
      } else {
        this.secret = defaults.buildSecretsManagerSecret(this, 'secret', props.secretProps);
      }

      // Configure environment variables
      const secretEnvironmentVariableName = props.secretEnvironmentVariableName || 'SECRET_ARN';
      this.lambdaFunction.addEnvironment(secretEnvironmentVariableName, this.secret.secretArn);

      // Enable read permissions for the Lambda function by default
      this.secret.grantRead(this.lambdaFunction);

      if (props.grantWriteAccess === 'ReadWrite') {
        this.secret.grantWrite(this.lambdaFunction);
      }
    }
}
