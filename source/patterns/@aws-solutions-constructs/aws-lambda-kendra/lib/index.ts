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
import * as iam from "aws-cdk-lib/aws-iam";
import * as kendra from "aws-cdk-lib/aws-kendra";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

/**
 * @summary The properties for the LambdaToKendra class.
 */
export interface LambdaToKendraProps {
  /**
   *
   *
   * @default - Optional user provided props to override the default props for the Kendra index. Is this required?
   */
  readonly kendraIndexProps?: kendra.CfnIndexProps;
  /**
   * A list of data sources that will provide data to the Kendra index. ?At least 1 must be specified. We will do majority of
   * processing for some data sources (S3 crawler initially), but for others the props must be complete (e.g. proper roleArn, etc.)
   *
   * @default - empty list (no data sources)
   */
  readonly kendraDataSourcesProps: Array<kendra.CfnDataSourceProps | any>;
  /**
   * Optional - index permissions to grant to the Lambda function. One or more of the following
   * may be specified: `Read`, `SubmitFeedback` and `Write`. Default is `["Read", "SubmitFeedback"]`. Read is
   * all the operations IAM defines as Read and List. SubmitFeedback is only the SubmitFeedback action. Write is all the
   * operations IAM defines as Write and Tag. This functionality may be overridden by providing a specific role arn in lambdaFunctionProps
   *
   * @default - ["Read", "SubmitFeedback"]
   */
  readonly indexPermissions?: string[];
  /**
   * Existing instance of a Kendra Index. Providing both this and kendraCfnIndexProps will cause an error.
   *
   * @default - None
   */
  readonly existingKendraIndexObj?: kendra.CfnIndex;
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
   * Optional Name for the Lambda function environment variable set to the index id for the Kendra index.
   *
   * @default - KENDRA_INDEX_ID
   */
  readonly indexIdEnvironmentVariableName?: string;
}

/**
 * @summary The LambdaToKendra class.
 */
export class LambdaToKendra extends Construct {
  public readonly lambdaFunction: lambda.Function;
  public readonly vpc?: ec2.IVpc;
  public readonly kendraIndex: kendra.CfnIndex;
  public readonly kendraDataSources: kendra.CfnDataSource[];

  /**
   * @summary Constructs a new instance of the LambdaToKendra class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {LambdaToKendraProps} props - user provided props for the construct.
   * @since 1.120.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: LambdaToKendraProps) {
    super(scope, id);
    defaults.CheckProps(props);

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

      defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.KENDRA);
    }

    // Setup the Lambda function
    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps,
      vpc: this.vpc,
    });

    this.kendraIndex = defaults.buildKendraIndex(this, id, {
      kendraIndexProps: props.kendraIndexProps,
      existingIndexObj: props.existingKendraIndexObj
    });

    this.kendraDataSources = defaults.AddMultipleKendraDataSources(this, id, this.kendraIndex, props.kendraDataSourcesProps);

    // Update Lambda function IAM policy with correct privileges to Kendra index
    const normalizedPermissions = props.indexPermissions ? defaults.normalizeKendraPermissions(props.indexPermissions) : undefined;
    if (!normalizedPermissions || normalizedPermissions.includes("READ")) {
      // Add policy with query permissions
      this.lambdaFunction.addToRolePolicy(
        new iam.PolicyStatement({
          actions: [
            "kendra:Query",
            "kendra:Describe*",
            "kendra:Get*",
            "kendra:BatchGet*",
            "kendra:List*",
            "kendra:Retrieve"],
          resources: [this.kendraIndex.attrArn]
        })
      );
    }

    if (!normalizedPermissions || normalizedPermissions.includes("SUBMITFEEDBACK")) {
      // Add policy with query permissions
      this.lambdaFunction.addToRolePolicy(
        new iam.PolicyStatement({
          actions: [
            "kendra:SubmitFeedback"],
          resources: [this.kendraIndex.attrArn]
        })
      );
    }

    if (normalizedPermissions?.includes("WRITE")) {
      // Add policy with query permissions
      this.lambdaFunction.addToRolePolicy(
        new iam.PolicyStatement({
          actions: [
            "kendra:Associate*",
            "kendra:BatchPut*",
            "kendra:Clear",
            "kendra:Create*",
            "kendra:Delete*",
            "kendra:Disassociate*",
            "kendra:Put*",
            "kendra:Update*",
            "kendra:Start*",
            "kendra:Submit*",
            "kendra:Stop*",
            "kendra:TagResource",
            "kendra:UntagResource"
          ],
          resources: [this.kendraIndex.attrArn]
        })
      );
    }

    // Configure environment variables
    const indexIdEnvironmentVariableName = props.indexIdEnvironmentVariableName || 'KENDRA_INDEX_ID';
    this.lambdaFunction.addEnvironment(indexIdEnvironmentVariableName, this.kendraIndex.attrId);

  }

}