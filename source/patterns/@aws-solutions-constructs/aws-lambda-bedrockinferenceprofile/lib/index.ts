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
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as defaults from '@aws-solutions-constructs/core';
import * as cdk from 'aws-cdk-lib';

// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { buildInferenceProfile , createAreaRegionMapping, CheckBedrockInferenceProps } from '@aws-solutions-constructs/core';

/**
 * @summary The properties for the LambdaToSns class.
 */
export interface LambdaToBedrockinferenceprofileProps {
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
   * The foundation model to use with the inference profile. The construct
   * will validate the model name, create the correct inference profile name
   * based on the region and remind the developer in which regions the model
   * must be available for this profile. Be certain that the account is granted
   * access to the foundation model in all the regions covered by cross-region
   * inference profile
   */
  readonly bedrockModelId: string;
  /**
   * Properties to override constructs props values for the Inference Profile.
   * The construct will populate inverenceProfileName - so don't override it
   * unless you have an very good reason.  The construct base IAM policies around
   * the modelSource that it creates, so trying to send a modelSource in ths
   * parameter will cause an error. This is where you set tags required for
   * tracking inference calls.
   */
  readonly inferenceProfileProps?: bedrock.CfnApplicationInferenceProfileProps;
  /**
   * Whether to deploy a cross-region inference profile that will automatically
   * distribute Invoke calls across multiple regions.
   *
   * @default - true
   */
  readonly deployCrossRegionProfile?: boolean;
  /**
   * Optional Name for the Lambda function environment variable set to the Model name.
   *
   * @default - BEDROCK_MODEL
   */
  readonly foundationModelEnvironmentVariableName?: string;
  /**
   * Optional Name for the Lambda function environment variable set to the inference profile arn
   *
   * @default - BEDROCK_PROFILE
   */
  readonly inferenceProfileEnvironmentVariableName?: string;
}

/**
 * @summary The LambdaToBedrockinferenceprofile class.
 */
export class LambdaToBedrockinferenceprofile extends Construct {
  public readonly lambdaFunction: lambda.Function;
  public readonly vpc?: ec2.IVpc;
  public readonly inferenceProfile: bedrock.CfnApplicationInferenceProfile;

  /**
   * @summary Constructs a new instance of the LambdaToSns class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {LambdaToSnsProps} props - user provided props for the construct.
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: LambdaToBedrockinferenceprofileProps) {
    super(scope, id);
    CheckBedrockInferenceProps(props);
    defaults.CheckVpcProps(props);
    defaults.CheckLambdaProps(props);

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

      defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.BEDROCK);
      defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.BEDROCK_RUNTIME);
    }

    const constructFunctionProps = defaults.consolidateProps({ timeout: cdk.Duration.seconds(30) }, props.lambdaFunctionProps );

    // Setup the Lambda function
    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: constructFunctionProps,
      vpc: this.vpc,
    });

    const buildInferenceResponse = buildInferenceProfile(this, id, {
      bedrockModelId: props.bedrockModelId,
      deployCrossRegionProfile: props.deployCrossRegionProfile,
      inferenceProfileProps: props.inferenceProfileProps
    });
    this.inferenceProfile = buildInferenceResponse.inferenceProfile;

    const regionMapping = createAreaRegionMapping(this, id, props.bedrockModelId);
    const regionPrefix = cdk.Fn.select(0, cdk.Fn.split('-', cdk.Aws.REGION));

    this.lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:Invoke*'],
      resources: [
        this.inferenceProfile.attrInferenceProfileArn,
      ]
    }));

    this.lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:Invoke*'],
      resources: defaults.IsCrossRegionProfile(props.deployCrossRegionProfile) ?
        cdk.Fn.split(",", cdk.Fn.findInMap(regionMapping.mappingName, regionPrefix, 'regionalModels')) :
        [ `arn:${cdk.Aws.PARTITION}:bedrock:${cdk.Aws.REGION}::foundation-model/${props.bedrockModelId}` ]
    }));

    // Configure environment variables
    const foundationModelEnvironmentVariableName = props.foundationModelEnvironmentVariableName || 'BEDROCK_MODEL';
    this.lambdaFunction.addEnvironment(foundationModelEnvironmentVariableName, props.bedrockModelId);

    const inferenceProfileEnvironmentVariableName = props.inferenceProfileEnvironmentVariableName || 'BEDROCK_PROFILE';
    this.lambdaFunction.addEnvironment(inferenceProfileEnvironmentVariableName, this.inferenceProfile.attrInferenceProfileArn);

  }

}