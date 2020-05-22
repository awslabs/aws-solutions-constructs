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
import * as cognito from '@aws-cdk/aws-cognito';
import * as defaults from '@aws-solutions-konstruk/core';
import { Construct } from '@aws-cdk/core';
import { Role } from '@aws-cdk/aws-iam';
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';

/**
 * @summary The properties for the CognitoToApiGatewayToLambda Construct
 */
export interface LambdaToElasticSearchAndKibanaProps {
  /**
   * Whether to create a new Lambda function or use an existing Lambda function.
   * If set to false, you must provide a lambda function object as `existingLambdaObj`
   *
   * @default - true
   */
  readonly deployLambda: boolean,
  /**
   * Existing instance of Lambda Function object.
   * If `deploy` is set to false only then this property is required
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function,
  /**
   * Optional user provided props to override the default props for the Lambda function.
   * If `deploy` is set to true only then this property is required
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
  readonly domainName: string
}

export class LambdaToElasticSearchAndKibana extends Construct {
  private userpool: cognito.UserPool;
  private identitypool: cognito.CfnIdentityPool;
  private userpoolclient: cognito.UserPoolClient;
  private elasticsearch: elasticsearch.CfnDomain;
  private fn: lambda.Function;
  private cwAlarms: cloudwatch.Alarm[];

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

    this.fn = defaults.buildLambdaFunction(this, {
      deployLambda: props.deployLambda,
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps
    });

    // Find the lambda service Role ARN
    const lambdaFunctionRoleARN = this.fn.role?.roleArn;

    this.userpool = defaults.buildUserPool(this);
    this.userpoolclient = defaults.buildUserPoolClient(this, this.userpool);
    this.identitypool = defaults.buildIdentityPool(this, this.userpool, this.userpoolclient);

    const cognitoAuthorizedRole: Role = defaults.setupCognitoForElasticSearch(this, props.domainName, {
      userpool: this.userpool,
      identitypool: this.identitypool,
      userpoolclient: this.userpoolclient
    });

    this.elasticsearch = defaults.buildElasticSearch(this, props.domainName, {
        userpool: this.userpool,
        identitypool: this.identitypool,
        cognitoAuthorizedRoleARN: cognitoAuthorizedRole.roleArn,
        serviceRoleARN: lambdaFunctionRoleARN}, props.esDomainProps);

    // Add ES Domain to lambda envrionment variable
    this.fn.addEnvironment('DOMAIN_ENDPOINT', this.elasticsearch.attrDomainEndpoint);

    // Deploy best practices CW Alarms for ES
    this.cwAlarms = defaults.buildElasticSearchCWAlarms(this);
  }

  /**
   * @summary Returns an instance of lambda.Function created by the construct.
   * @returns {lambda.Function} Instance of Function created by the construct
   * @since 0.8.0
   * @access public
   */
  public lambdaFunction(): lambda.Function {
    return this.fn;
  }

  /**
   * @summary Returns an instance of cognito.UserPool created by the construct.
   * @returns {cognito.UserPool} Instance of UserPool created by the construct
   * @since 0.8.0
   * @access public
   */
  public userPool(): cognito.UserPool {
    return this.userpool;
  }

  /**
   * @summary Returns an instance of cognito.UserPoolClient created by the construct.
   * @returns {cognito.UserPoolClient} Instance of UserPoolClient created by the construct
   * @since 0.8.0
   * @access public
   */
  public userPoolClient(): cognito.UserPoolClient {
    return this.userpoolclient;
  }

  /**
   * @summary Returns an instance of cognito.CfnIdentityPool created by the construct.
   * @returns {cognito.CfnIdentityPool} Instance of CfnIdentityPool created by the construct
   * @since 0.8.0
   * @access public
   */
  public identityPool(): cognito.CfnIdentityPool {
    return this.identitypool;
  }

  /**
   * @summary Returns an instance of elasticsearch.CfnDomain created by the construct.
   * @returns {elasticsearch.CfnDomain} Instance of CfnDomain created by the construct
   * @since 0.8.0
   * @access public
   */
  public elasticsearchDomain(): elasticsearch.CfnDomain {
    return this.elasticsearch;
  }

  /**
   * @summary Returns a list of cloudwatch.Alarm created by the construct.
   * @returns {cloudwatch.Alarm[]} List of cloudwatch.Alarm  created by the construct
   * @since 0.8.0
   * @access public
   */
  public cloudwatchAlarms(): cloudwatch.Alarm[]  {
    return this.cwAlarms;
  }
}
