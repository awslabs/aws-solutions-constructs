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
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";
import * as ec2 from "@aws-cdk/aws-ec2";
import { Construct } from "@aws-cdk/core";

/**
 * @summary The properties for the LambdaToSecretsmanager class.
 */
export interface LambdaToSecretsmanagerProps {
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
   * Existing instance of Secret object, if this is set then secretProps is ignored.
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
   * Optional Name for the Secret environment variable set for the Lambda function.
   *
   * @default - SECRET_NAME
   */
  readonly secretEnvironmentVariableName?: string;
  /**
   * Optional secret permissions to grant to the Lambda function.
   * One of the following may be specified: "Read" or "ReadWrite".
   *
   * @default - Read only acess is given to the Lambda function if no value is specified.
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
     * @since 1.101.0
     * @access public
     */
    constructor(scope: Construct, id: string, props: LambdaToSecretsmanagerProps) {
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

        // suppress warning on build
        const cfnSecret: secretsmanager.CfnSecret = this.secret.node.findChild('Resource') as secretsmanager.CfnSecret;
        cfnSecret.cfnOptions.metadata = {
          cfn_nag: {
            rules_to_suppress: [{
              id: 'W77',
              reason: `Secrets Manager Secret should explicitly specify KmsKeyId. Besides control of the key this will allow the secret to be shared cross-account`
            }]
          }
        };
      }

      // Configure environment variables
      const secretEnvironmentVariableName = props.secretEnvironmentVariableName || 'SECRET_NAME';
      this.lambdaFunction.addEnvironment(secretEnvironmentVariableName, this.secret.secretName);

      // Enable read permissions for the Lambda function by default
      this.secret.grantRead(this.lambdaFunction);

      if (props.grantWriteAccess) {
        this.secret.grantWrite(this.lambdaFunction);
      }
    }
}
