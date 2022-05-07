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

import * as lambda from '@aws-cdk/aws-lambda';
import * as iot from '@aws-cdk/aws-iot';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { IotToLambda } from '@aws-solutions-constructs/aws-iot-lambda';
import { LambdaToDynamoDB } from '@aws-solutions-constructs/aws-lambda-dynamodb';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from '@aws-cdk/core';
import * as defaults from '@aws-solutions-constructs/core';

/**
 * @summary The properties for the IotToLambdaToDynamoDB class.
 */
export interface IotToLambdaToDynamoDBProps {
  /**
   * Existing instance of Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function,
  /**
   * User provided props to override the default props for the Lambda function.
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
  readonly dynamoTableProps?: dynamodb.TableProps,
  /**
   * Optional table permissions to grant to the Lambda function.
   * One of the following may be specified: "All", "Read", "ReadWrite", "Write".
   *
   * @default - Read/write access is given to the Lambda function if no value is specified.
   */
  readonly tablePermissions?: string
}

export class IotToLambdaToDynamoDB extends Construct {
  public readonly iotTopicRule: iot.CfnTopicRule;
  public readonly lambdaFunction: lambda.Function;
  public readonly dynamoTable: dynamodb.Table;

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
    defaults.CheckProps(props);

    // Other permissions for constructs are accepted as arrays, turning tablePermissions into
    // an array to use the same validation function.
    if (props.tablePermissions) {
      defaults.CheckListValues(['All', 'Read', 'ReadWrite', 'Write'], [props.tablePermissions], 'table permission');
    }

    // Setup the IotToLambda
    const iotToLambda = new IotToLambda(this, 'IotToLambda', props);
    this.iotTopicRule = iotToLambda.iotTopicRule;
    this.lambdaFunction = iotToLambda.lambdaFunction;

    // Setup the LambdaToDynamoDB
    const lambdaToDynamoDB = new LambdaToDynamoDB(this, 'LambdaToDynamoDB', {
      tablePermissions: props.tablePermissions,
      existingLambdaObj: this.lambdaFunction,
      dynamoTableProps: props.dynamoTableProps
    });
    this.dynamoTable = lambdaToDynamoDB.dynamoTable;
  }
}