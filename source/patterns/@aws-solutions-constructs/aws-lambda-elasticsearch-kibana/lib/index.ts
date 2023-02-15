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

import * as elasticsearch from 'aws-cdk-lib/aws-elasticsearch';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

/**
 * @summary The properties for the LambdaToElasticSearchAndKibana Construct
 */
export interface LambdaToElasticSearchAndKibanaProps {
  /**
   * Existing instance of Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function;
  /**
   * User provided props to override the default props for the Lambda function.
   *
   * @default - Default props are used
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps;
  /**
   * Optional user provided props to override the default props for the Elasticsearch Service.
   *
   * @default - Default props are used
   */
  readonly esDomainProps?: elasticsearch.CfnDomainProps;
  /**
   * Cognito & ES Domain Name
   *
   * @default - None
   */
  readonly domainName: string;
  /**
   * Optional Cognito Domain Name, if provided it will be used for Cognito Domain, and domainName will be used for the Elasticsearch Domain
   *
   * @default - None
   */
  readonly cognitoDomainName?: string;
  /**
   * Whether to create recommended CloudWatch alarms
   *
   * @default - Alarms are created
   */
  readonly createCloudWatchAlarms?: boolean;
  /**
   * Optional Name for the Lambda function environment variable set to the domain endpoint.
   *
   * @default - DOMAIN_ENDPOINT
   */
  readonly domainEndpointEnvironmentVariableName?: string;
  /**
   * An existing VPC for the construct to use (construct will NOT create a new VPC in this case)
   *
   * @default - None
   */
  readonly existingVpc?: ec2.IVpc;
  /**
   * Properties to override default properties if deployVpc is true
   *
   * @default - DefaultIsolatedVpcProps() in vpc-defaults.ts
   */
  readonly vpcProps?: ec2.VpcProps;
  /**
   * Whether to deploy a new VPC
   *
   * @default - false
   */
  readonly deployVpc?: boolean;
}

export class LambdaToElasticSearchAndKibana extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly identityPool: cognito.CfnIdentityPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly elasticsearchDomain: elasticsearch.CfnDomain;
  public readonly elasticsearchRole: iam.Role;
  public readonly lambdaFunction: lambda.Function;
  public readonly cloudwatchAlarms?: cloudwatch.Alarm[];
  public readonly vpc?: ec2.IVpc;

  /**
   * @summary Constructs a new instance of the LambdaToElasticSearchAndKibana class.
   * @param {Constructs} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {LambdaToElasticSearchAndKibanaProps} props - user provided props for the construct
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: LambdaToElasticSearchAndKibanaProps) {
    super(scope, id);
    defaults.CheckProps(props);

    if (props.vpcProps && !props.deployVpc) {
      throw new Error("Error - deployVpc must be true when defining vpcProps");
    }

    if (props.lambdaFunctionProps?.vpc || props.lambdaFunctionProps?.vpcSubnets) {
      throw new Error("Error - Define VPC using construct parameters not Lambda function props");
    }

    if (props.esDomainProps?.vpcOptions) {
      throw new Error("Error - Define VPC using construct parameters not Elasticsearch props");
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
    }

    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps,
      vpc: this.vpc
    });

    // Find the lambda service Role ARN
    const lambdaFunctionRoleARN = this.lambdaFunction.role?.roleArn;

    let cognitoAuthorizedRole: iam.Role;

    [this.userPool, this.userPoolClient, this.identityPool, cognitoAuthorizedRole] =
      defaults.buildCognitoForSearchService(this, props.cognitoDomainName ?? props.domainName);

    const buildElasticSearchProps: any = {
      userpool: this.userPool,
      identitypool: this.identityPool,
      cognitoAuthorizedRoleARN: cognitoAuthorizedRole.roleArn,
      serviceRoleARN: lambdaFunctionRoleARN,
      vpc: this.vpc,
      domainName: props.domainName,
      clientDomainProps: props.esDomainProps
    };

    if (this.vpc) {
      const securityGroupIds = defaults.getLambdaVpcSecurityGroupIds(this.lambdaFunction);
      buildElasticSearchProps.securityGroupIds = securityGroupIds;
    }

    const buildElasticSearchResponse = defaults.buildElasticSearch(this, buildElasticSearchProps);
    this.elasticsearchDomain = buildElasticSearchResponse.domain;
    this.elasticsearchRole = buildElasticSearchResponse.role;

    // Add ES Domain to lambda environment variable
    const domainEndpointEnvironmentVariableName = props.domainEndpointEnvironmentVariableName || 'DOMAIN_ENDPOINT';
    this.lambdaFunction.addEnvironment(domainEndpointEnvironmentVariableName, this.elasticsearchDomain.attrDomainEndpoint);

    if (props.createCloudWatchAlarms === undefined || props.createCloudWatchAlarms) {
      // Deploy best practices CW Alarms for ES
      this.cloudwatchAlarms = defaults.buildElasticSearchCWAlarms(this);
    }
  }
}
