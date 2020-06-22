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
import { DynamoDBStreamToLambdaProps, DynamoDBStreamToLambda } from '@aws-solutions-constructs/aws-dynamodb-stream-lambda';
import { LambdaToElasticSearchAndKibanaProps, LambdaToElasticSearchAndKibana } from '@aws-solutions-constructs/aws-lambda-elasticsearch-kibana';
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
  public readonly lambdaFunction: lambda.Function;
  public readonly dynamoTable: dynamodb.Table;
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPool: cognito.CfnIdentityPool;
  public readonly elasticsearchDomain: elasticsearch.CfnDomain;
  public readonly cloudwatchAlarms: cloudwatch.Alarm[];

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

    this.dynamoDBStreamToLambda = new DynamoDBStreamToLambda(this, 'DynamoDBStreamToLambda', _props1);

    this.lambdaFunction = this.dynamoDBStreamToLambda.lambdaFunction;

    const _props2: LambdaToElasticSearchAndKibanaProps = {
      deployLambda: false,
      existingLambdaObj: this.lambdaFunction,
      domainName: props.domainName,
      esDomainProps: props.esDomainProps
    };

    this.lambdaToElasticSearchAndKibana = new LambdaToElasticSearchAndKibana(this, 'LambdaToElasticSearch', _props2);

    this.dynamoTable = this.dynamoDBStreamToLambda.dynamoTable;
    this.userPool = this.lambdaToElasticSearchAndKibana.userPool;
    this.userPoolClient = this.lambdaToElasticSearchAndKibana.userPoolClient;
    this.identityPool = this.lambdaToElasticSearchAndKibana.identityPool;
    this.elasticsearchDomain = this.lambdaToElasticSearchAndKibana.elasticsearchDomain;
    this.cloudwatchAlarms = this.lambdaToElasticSearchAndKibana.cloudwatchAlarms;
  }
}
