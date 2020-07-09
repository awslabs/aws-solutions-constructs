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
import { DynamoEventSourceProps, DynamoEventSource } from '@aws-cdk/aws-lambda-event-sources';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as defaults from '@aws-solutions-constructs/core';
import { Construct } from '@aws-cdk/core';

/**
 * @summary The properties for the DynamoDBStreamToLambda Construct
 */
export interface DynamoDBStreamToLambdaProps {
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
  readonly lambdaFunctionProps?: lambda.FunctionProps,
  /**
   * Optional user provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly dynamoTableProps?: dynamodb.TableProps,
  /**
   * Existing instance of DynamoDB table object, If this is set then the dynamoTableProps is ignored
   *
   * @default - None
   */
  readonly existingTableObj?: dynamodb.Table,
  /**
   * Optional user provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly dynamoEventSourceProps?: DynamoEventSourceProps
}

export class DynamoDBStreamToLambda extends Construct {
  public readonly lambdaFunction: lambda.Function;
  public readonly dynamoTable: dynamodb.Table;

  /**
   * @summary Constructs a new instance of the LambdaToDynamoDB class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {DynamoDBStreamToLambdaProps} props - user provided props for the construct
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: DynamoDBStreamToLambdaProps) {
    super(scope, id);

    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps
    });

    this.dynamoTable = defaults.buildDynamoDBTableWithStream(this, {
      dynamoTableProps: props.dynamoTableProps,
      existingTableObj: props.existingTableObj
    });

    // Grant DynamoDB Stream read perimssion for lambda function
    this.dynamoTable.grantStreamRead(this.lambdaFunction.grantPrincipal);

    // Create DynamDB trigger to invoke lambda function
    this.lambdaFunction.addEventSource(new DynamoEventSource(this.dynamoTable,
      defaults.DynamoEventSourceProps(props.dynamoEventSourceProps)));
  }
}