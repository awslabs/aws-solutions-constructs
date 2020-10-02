/**
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import * as elasticsearch from '@aws-cdk/aws-elasticsearch';
import * as lambda from '@aws-cdk/aws-lambda';
import * as iam from '@aws-cdk/aws-iam';
import * as cognito from '@aws-cdk/aws-cognito';
import * as defaults from '@aws-solutions-constructs/core';
import { Construct } from '@aws-cdk/core';
import { Role } from '@aws-cdk/aws-iam';
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';

/**
 * @summary The properties for the CognitoToApiGatewayToLambda Construct
 */
export interface LambdaToElasticSearchAndKibanaProps {
  /**
   * Existing instance of Lambda Function object, if this is set then the lambdaFunctionProps is ignored.
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function,
  /**
   * User provided props to override the default props for the Lambda function.
   *
   * @default - Default props are used
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps
  /**
   * Optional user provided props to override the default props for the Elasticsearch Service.
   *
   * @default - Default props are used
   */
  readonly esDomainProps?: elasticsearch.CfnDomainProps,
  /**
   * Cognito & ES Domain Name
   *
   * @default - None
   */
  readonly domainName: string,
  /**
   * Optional Cognito Domain Name, if provided it will be used for Cognito Domain, and domainName will be used for the Elasticsearch Domain
   *
   * @default - None
   */
  readonly cognitoDomainName?: string
}

export class LambdaToElasticSearchAndKibana extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly identityPool: cognito.CfnIdentityPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly elasticsearchDomain: elasticsearch.CfnDomain;
  public readonly elasticsearchRole: iam.Role;
  public readonly lambdaFunction: lambda.Function;
  public readonly cloudwatchAlarms: cloudwatch.Alarm[];

  /**
   * @summary Constructs a new instance of the CognitoToApiGatewayToLambda class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {CognitoToApiGatewayToLambdaProps} props - user provided props for the construct
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: LambdaToElasticSearchAndKibanaProps) {
    super(scope, id);

    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps
    });

    // Find the lambda service Role ARN
    const lambdaFunctionRoleARN = this.lambdaFunction.role?.roleArn;

    this.userPool = defaults.buildUserPool(this);
    this.userPoolClient = defaults.buildUserPoolClient(this, this.userPool);
    this.identityPool = defaults.buildIdentityPool(this, this.userPool, this.userPoolClient);

    let cognitoDomainName = props.domainName;

    if (props.cognitoDomainName) {
      cognitoDomainName = props.cognitoDomainName;
    }

    const cognitoAuthorizedRole: Role = defaults.setupCognitoForElasticSearch(this, cognitoDomainName, {
      userpool: this.userPool,
      identitypool: this.identityPool,
      userpoolclient: this.userPoolClient
    });

    [this.elasticsearchDomain, this.elasticsearchRole] = defaults.buildElasticSearch(this, props.domainName, {
        userpool: this.userPool,
        identitypool: this.identityPool,
        cognitoAuthorizedRoleARN: cognitoAuthorizedRole.roleArn,
        serviceRoleARN: lambdaFunctionRoleARN}, props.esDomainProps);

    // Add ES Domain to lambda envrionment variable
    this.lambdaFunction.addEnvironment('DOMAIN_ENDPOINT', this.elasticsearchDomain.attrDomainEndpoint);

    // Deploy best practices CW Alarms for ES
    this.cloudwatchAlarms = defaults.buildElasticSearchCWAlarms(this);
  }
}
