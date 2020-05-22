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
import * as iot from '@aws-cdk/aws-iot';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { IotToLambda } from '@aws-solutions-konstruk/aws-iot-lambda';
import { LambdaToDynamoDB } from '@aws-solutions-konstruk/aws-lambda-dynamodb';
import { Construct } from '@aws-cdk/core';

/**
 * @summary The properties for the IotToLambdaToDynamoDB class.
 */
export interface IotToLambdaToDynamoDBProps {
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
   * User provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly iotTopicRuleProps: iot.CfnTopicRuleProps,
  /**
   * Optional user provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly dynamoTableProps?: dynamodb.TableProps
}

export class IotToLambdaToDynamoDB extends Construct {
  private topic: iot.CfnTopicRule;
  private fn: lambda.Function;
  private table: dynamodb.Table;

  /**
   * @summary Constructs a new instance of the IotToLambdaToDynamoDB class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {IotToLambdaToDynamoDBProps} props - user provided props for the construct
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: IotToLambdaToDynamoDBProps) {
    super(scope, id);

    // Setup the IotToLambda
    const iotToLambda = new IotToLambda(this, 'IotToLambda', props);
    this.topic = iotToLambda.iotTopicRule();
    this.fn = iotToLambda.lambdaFunction();

    // Setup the LambdaToDynamoDB
    const lambdaToDynamoDB = new LambdaToDynamoDB(this, 'LambdaToDynamoDB', {
      deployLambda: false,
      existingLambdaObj: this.fn,
      dynamoTableProps: props.dynamoTableProps
    });
    this.table = lambdaToDynamoDB.dynamoTable();
  }

  /**
   * @summary Returns an instance of iot.CfnTopicRule created by the construct.
   * @returns {iot.CfnTopicRule} Instance of CfnTopicRule created by the construct
   * @since 0.8.0
   * @access public
   */
  public iotTopicRule(): iot.CfnTopicRule {
    return this.topic;
  }

  /**
   * @summary Returns an instance of lambda.Function created by the construct.
   * @returns {lambda.Function} Instance of lambda.Function created by the construct
   * @since 0.8.0
   * @access public
   */
  public lambdaFunction(): lambda.Function {
    return this.fn;
  }

  /**
   * @summary Returns an instance of dynamodb.Table created by the construct.
   * @returns {dynamodb.Table} Instance of dynamodb.Table created by the construct
   * @since 0.8.0
   * @access public
   */
  public dynamoTable(): dynamodb.Table {
    return this.table;
  }
}