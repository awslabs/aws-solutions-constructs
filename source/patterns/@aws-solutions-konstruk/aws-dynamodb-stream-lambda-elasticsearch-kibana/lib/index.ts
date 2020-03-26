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

import * as lambda from '@aws-cdk/aws-lambda';
import * as elasticsearch from '@aws-cdk/aws-elasticsearch';
import { DynamoEventSourceProps } from '@aws-cdk/aws-lambda-event-sources';
import { DynamoDBStreamToLambdaProps, DynamoDBStreamToLambda } from '@aws-solutions-konstruk/aws-dynamodb-stream-lambda';
import { LambdaToElasticSearchAndKibanaProps, LambdaToElasticSearchAndKibana } from '@aws-solutions-konstruk/aws-lambda-elasticsearch-kibana';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as cognito from '@aws-cdk/aws-cognito';
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';
import { Construct } from '@aws-cdk/core';

/**
 * @summary The properties for the DynamoDBStreamToLambdaToElastciSearchAndKibana Construct
 */
export interface DynamoDBStreamToLambdaToElasticSearchAndKibanaProps {
  /**
   * Whether to create a new lambda function or use an existing lambda function.
   * If set to false, you must provide a lambda function object as `existingObj`
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
   * Optional user provided props to override the default props.
   * If `deploy` is set to true only then this property is required
   *
   * @default - Default props are used
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps,
  /**
   * Optional user provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly dynamoTableProps?: dynamodb.TableProps,
  /**
   * Optional user provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly dynamoEventSourceProps?: DynamoEventSourceProps,
  /**
   * Optional user provided props to override the default props for the API Gateway.
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

export class DynamoDBStreamToLambdaToElasticSearchAndKibana extends Construct {
  private dynamoDBStreamToLambda: DynamoDBStreamToLambda;
  private lambdaToElasticSearchAndKibana: LambdaToElasticSearchAndKibana;
  private fn: lambda.Function;

  /**
   * @summary Constructs a new instance of the LambdaToDynamoDB class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {DynamoDBStreamToLambdaToElasticSearchAndKibanaProps} props - user provided props for the construct
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: DynamoDBStreamToLambdaToElasticSearchAndKibanaProps) {
    super(scope, id);

    const _props1: DynamoDBStreamToLambdaProps = {
      deployLambda: props.deployLambda,
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps,
      dynamoEventSourceProps: props.dynamoEventSourceProps,
      dynamoTableProps: props.dynamoTableProps
    };

    this.dynamoDBStreamToLambda = new DynamoDBStreamToLambda(scope, 'DynamoDBStreamToLambda', _props1);

    this.fn = this.dynamoDBStreamToLambda.lambdaFunction();

    const _props2: LambdaToElasticSearchAndKibanaProps = {
      deployLambda: false,
      existingLambdaObj: this.fn,
      domainName: props.domainName,
      esDomainProps: props.esDomainProps
    };

    this.lambdaToElasticSearchAndKibana = new LambdaToElasticSearchAndKibana(scope, 'LambdaToElasticSearch', _props2);
  }

  /**
   * @summary Retruns an instance of dynamodb.Table created by the construct.
   * @returns {dynamodb.Table} Instance of dynamodb.Table created by the construct
   * @since 0.8.0
   * @access public
   */
  public dynamoTable(): dynamodb.Table {
    return this.dynamoDBStreamToLambda.dynamoTable();
  }

  /**
   * @summary Retruns an instance of lambda.Function created by the construct.
   * @returns {lambda.Function} Instance of lambda.Function created by the construct
   * @since 0.8.0
   * @access public
   */
  public lambdaFunction(): lambda.Function {
    return this.dynamoDBStreamToLambda.lambdaFunction();
  }

  /**
   * @summary Retruns an instance of cognito.UserPool created by the construct.
   * @returns {cognito.UserPool} Instance of UserPool created by the construct
   * @since 0.8.0
   * @access public
   */
  public userPool(): cognito.UserPool {
    return this.lambdaToElasticSearchAndKibana.userPool();
  }

  /**
   * @summary Retruns an instance of cognito.UserPoolClient created by the construct.
   * @returns {cognito.UserPoolClient} Instance of UserPoolClient created by the construct
   * @since 0.8.0
   * @access public
   */
  public userPoolClient(): cognito.UserPoolClient {
    return this.lambdaToElasticSearchAndKibana.userPoolClient();
  }

  /**
   * @summary Retruns an instance of cognito.CfnIdentityPool created by the construct.
   * @returns {cognito.CfnIdentityPool} Instance of CfnIdentityPool created by the construct
   * @since 0.8.0
   * @access public
   */
  public identityPool(): cognito.CfnIdentityPool {
    return this.lambdaToElasticSearchAndKibana.identityPool();
  }

  /**
   * @summary Retruns an instance of elasticsearch.CfnDomain created by the construct.
   * @returns {elasticsearch.CfnDomain} Instance of CfnDomain created by the construct
   * @since 0.8.0
   * @access public
   */
  public elasticsearchDomain(): elasticsearch.CfnDomain {
    return this.lambdaToElasticSearchAndKibana.elasticsearchDomain();
  }

  /**
   * @summary Retruns a list of cloudwatch.Alarm created by the construct.
   * @returns {cloudwatch.Alarm[]} List of cloudwatch.Alarm  created by the construct
   * @since 0.8.0
   * @access public
   */
  public cloudwatchAlarms(): cloudwatch.Alarm[]  {
    return this.lambdaToElasticSearchAndKibana.cloudwatchAlarms();
  }
}
