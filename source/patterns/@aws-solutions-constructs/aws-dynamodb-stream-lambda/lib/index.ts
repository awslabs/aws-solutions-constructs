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

import * as lambda from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSourceProps } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { DynamoDBStreamsToLambda } from '@aws-solutions-constructs/aws-dynamodbstreams-lambda';

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
  readonly existingTableInterface?: dynamodb.ITable,
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
  public readonly dynamoTableInterface: dynamodb.ITable;
  public readonly dynamoTable?: dynamodb.Table;

  /**
   * @summary Constructs a new instance of the LambdaToDynamoDB class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {DynamoDBStreamToLambdaProps} props - user provided props for the construct
   * @access public
   */
  constructor(scope: Construct, id: string, props: DynamoDBStreamToLambdaProps) {
    super(scope, id);
    const convertedProps: DynamoDBStreamToLambdaProps = { ...props };

    // W (for 'wrapped') is added to the id so that the id's of the constructs with the old and new names don't collide
    // If this character pushes you beyond the 64 character limit, just import the new named construct and instantiate
    // it in place of the older named version. They are functionally identical, aside from the types no other changes
    // will be required.  (eg - new DynamoDBStreamsToLambda instead of DynamoDBStreamToLambda)
    const wrappedConstruct: DynamoDBStreamToLambda = new DynamoDBStreamsToLambda(this, `${id}W`, convertedProps);

    this.lambdaFunction = wrappedConstruct.lambdaFunction;
    this.dynamoTableInterface = wrappedConstruct.dynamoTableInterface;
    this.dynamoTable = wrappedConstruct.dynamoTable;
  }
}