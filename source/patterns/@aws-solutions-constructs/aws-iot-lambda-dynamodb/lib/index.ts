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

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iot from 'aws-cdk-lib/aws-iot';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { IotToLambda } from '@aws-solutions-constructs/aws-iot-lambda';
import { LambdaToDynamoDB } from '@aws-solutions-constructs/aws-lambda-dynamodb';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import * as defaults from '@aws-solutions-constructs/core';

/**
 * @summary The properties for the IotToLambdaToDynamoDB class.
 */
export interface IotToLambdaToDynamoDBProps {
  /**
   * Optional - instance of an existing Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.
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
   * Optional user provided props to override the default props for the DynamoDB Table. Providing both this and
   * `existingTableInterface` is an error.
   *
   * @default - Partition key ID: string
   */
  readonly dynamoTableProps?: dynamodb.TableProps,
  /**
   * Optional table permissions to grant to the Lambda function.
   * One of the following may be specified: "All", "Read", "ReadWrite", "Write".
   *
   * @default - Read/write access is given to the Lambda function if no value is specified.
   */
  readonly tablePermissions?: string,
  /**
   * Optional Name for the Lambda function environment variable set to the name of the DynamoDB table.
   *
   * @default - DDB_TABLE_NAME
   */
  readonly tableEnvironmentVariableName?: string;
  /**
   * An existing VPC for the construct to use (construct will NOT create a new VPC in this case)
   */
  readonly existingVpc?: ec2.IVpc;
  /**
   * Properties to override default properties if deployVpc is true
   */
  readonly vpcProps?: ec2.VpcProps;
  /**
   * Whether to deploy a new VPC
   *
   * @default - false
   */
  readonly deployVpc?: boolean;
}

export class IotToLambdaToDynamoDB extends Construct {
  public readonly iotTopicRule: iot.CfnTopicRule;
  public readonly lambdaFunction: lambda.Function;
  public readonly dynamoTable: dynamodb.Table;
  public readonly vpc?: ec2.IVpc;

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

    // Other permissions for constructs are accepted as arrays, turning tablePermissions into
    // an array to use the same validation function.
    if (props.tablePermissions) {
      defaults.CheckListValues(['All', 'Read', 'ReadWrite', 'Write'], [props.tablePermissions], 'table permission');
    }

    // Setup the LambdaToDynamoDB
    const lambdaToDynamoDB = new LambdaToDynamoDB(this, 'LambdaToDynamoDB', {
      tablePermissions: props.tablePermissions,
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps,
      dynamoTableProps: props.dynamoTableProps,
      tableEnvironmentVariableName: props.tableEnvironmentVariableName,
      existingVpc: props.existingVpc,
      deployVpc: props.deployVpc,
      vpcProps: props.vpcProps,
    });
    this.dynamoTable = lambdaToDynamoDB.dynamoTable;
    this.vpc = lambdaToDynamoDB.vpc;

    // Setup the IotToLambda
    const iotToLambda = new IotToLambda(this, 'IotToLambda', {
      existingLambdaObj: lambdaToDynamoDB.lambdaFunction,
      iotTopicRuleProps: props.iotTopicRuleProps
    });
    this.iotTopicRule = iotToLambda.iotTopicRule;
    this.lambdaFunction = iotToLambda.lambdaFunction;
  }
}