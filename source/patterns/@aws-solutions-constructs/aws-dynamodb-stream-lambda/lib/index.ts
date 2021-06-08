/**
 *  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import * as sqs from '@aws-cdk/aws-sqs';

/**
 * @summary The properties for the DynamoDBStreamToLambda Construct
 */
export interface DynamoDBStreamToLambdaProps {
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
   * Optional user provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly dynamoTableProps?: dynamodb.TableProps,
  /**
   * Existing instance of DynamoDB table object, providing both this and `dynamoTableProps` will cause an error.
   *
   * @default - None
   */
  readonly existingTableObj?: dynamodb.ITable,
  /**
   * Optional user provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly dynamoEventSourceProps?: DynamoEventSourceProps | any,
  /**
   * Whether to deploy a SQS dead letter queue when a data record reaches the Maximum Retry Attempts or Maximum Record Age,
   * its metadata like shard ID and stream ARN will be sent to an SQS queue.
   *
   * @default - true.
   */
  readonly deploySqsDlqQueue?: boolean,
  /**
   * Optional user provided properties for the SQS dead letter queue
   *
   * @default - Default props are used
   */
  readonly sqsDlqQueueProps?: sqs.QueueProps
}

export class DynamoDBStreamToLambda extends Construct {
  public readonly lambdaFunction: lambda.Function;
  public readonly dynamoTable?: dynamodb.Table;

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
    defaults.CheckProps(props);

    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps
    });

    const table: dynamodb.ITable = defaults.buildDynamoDBTableWithStream(this, {
      dynamoTableProps: props.dynamoTableProps,
      existingTableObj: props.existingTableObj
    });

    if (table instanceof dynamodb.Table) {
      this.dynamoTable = table;
    }

    // Grant DynamoDB Stream read perimssion for lambda function
    table.grantStreamRead(this.lambdaFunction.grantPrincipal);

    // Add the Lambda event source mapping
    const eventSourceProps = defaults.DynamoEventSourceProps(this, {
      eventSourceProps: props.dynamoEventSourceProps,
      deploySqsDlqQueue: props.deploySqsDlqQueue,
      sqsDlqQueueProps: props.sqsDlqQueueProps
    });
    this.lambdaFunction.addEventSource(new DynamoEventSource(table, eventSourceProps));
  }
}