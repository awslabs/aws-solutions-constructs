/**
 *  Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import * as sns from 'aws-cdk-lib/aws-sns';
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import * as ec2 from "aws-cdk-lib/aws-ec2";

/**
 * @summary The properties for the LambdaToSns class.
 */
export interface LambdaToSnsProps {
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
   * Existing instance of SNS Topic object, providing both this and topicProps will cause an error..
   *
   * @default - Default props are used
   */
  readonly existingTopicObj?: sns.Topic;
  /**
   * Optional user provided properties to override the default properties for the SNS topic.
   *
   * @default - Default properties are used.
   */
  readonly topicProps?: sns.TopicProps;
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
   * Optional Name for the Lambda function environment variable set to the arn of the Topic.
   *
   * @default - SNS_TOPIC_ARN
   */
  readonly topicArnEnvironmentVariableName?: string;
  /**
   * Optional Name for the Lambda function environment variable set to the name of the Topic.
   *
   * @default - SNS_TOPIC_NAME
   */
  readonly topicNameEnvironmentVariableName?: string;
}

/**
 * @summary The LambdaToSns class.
 */
export class LambdaToSns extends Construct {
    public readonly lambdaFunction: lambda.Function;
    public readonly snsTopic: sns.Topic;
    public readonly vpc?: ec2.IVpc;

    /**
     * @summary Constructs a new instance of the LambdaToSns class.
     * @param {cdk.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a a scope-unique id.
     * @param {LambdaToSnsProps} props - user provided props for the construct.
     * @since 0.8.0
     * @access public
     */
    constructor(scope: Construct, id: string, props: LambdaToSnsProps) {
      super(scope, id);
      defaults.CheckProps(props);

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

        defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.SNS);
      }

      // Setup the Lambda function
      this.lambdaFunction = defaults.buildLambdaFunction(this, {
        existingLambdaObj: props.existingLambdaObj,
        lambdaFunctionProps: props.lambdaFunctionProps,
        vpc: this.vpc,
      });

      // Setup the SNS topic
      [this.snsTopic] = defaults.buildTopic(this, {
        existingTopicObj: props.existingTopicObj,
        topicProps: props.topicProps
      });

      // Configure environment variables
      const topicArnEnvironmentVariableName = props.topicArnEnvironmentVariableName || 'SNS_TOPIC_ARN';
      this.lambdaFunction.addEnvironment(topicArnEnvironmentVariableName, this.snsTopic.topicArn);
      const topicNameEnvironmentVariableName = props.topicNameEnvironmentVariableName || 'SNS_TOPIC_NAME';
      this.lambdaFunction.addEnvironment(topicNameEnvironmentVariableName, this.snsTopic.topicName);

      // Add publishing permissions to the function
      this.snsTopic.grantPublish(this.lambdaFunction.grantPrincipal);
    }
}