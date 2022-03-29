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

import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { DefaultTableProps, DefaultTableWithStreamProps } from './dynamodb-table-defaults';
import { consolidateProps } from './utils';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from '@aws-cdk/core';

export interface BuildDynamoDBTableProps {
  /**
   * Optional user provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly dynamoTableProps?: dynamodb.TableProps,
  /**
   * Existing instance of dynamodb table object.
   * Providing both this and `dynamoTableProps` will cause an error.
   *
   * @default - None
   */
  readonly existingTableObj?: dynamodb.Table
}

export interface BuildDynamoDBTableWithStreamProps {
  /**
   * Optional user provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly dynamoTableProps?: dynamodb.TableProps,
  /**
   * Existing instance of dynamodb table object.
   * Providing both this and `dynamoTableProps` will cause an error.
   *
   * @default - None
   */
  readonly existingTableInterface?: dynamodb.ITable
}

export function buildDynamoDBTable(scope: Construct, props: BuildDynamoDBTableProps): dynamodb.Table {
  // Conditional DynamoDB Table creation
  if (!props.existingTableObj) {
    // Set the default props for DynamoDB table
    const dynamoTableProps = consolidateProps(DefaultTableProps, props.dynamoTableProps);
    return new dynamodb.Table(scope, 'DynamoTable', dynamoTableProps);
  } else {
    return props.existingTableObj;
  }
}

export function buildDynamoDBTableWithStream(scope: Construct, props: BuildDynamoDBTableWithStreamProps): [dynamodb.ITable, dynamodb.Table?] {
  // Conditional DynamoDB Table creation
  if (!props.existingTableInterface) {
    // Set the default props for DynamoDB table
    const dynamoTableProps = consolidateProps(DefaultTableWithStreamProps, props.dynamoTableProps);
    const dynamoTable: dynamodb.Table = new dynamodb.Table(scope, 'DynamoTable', dynamoTableProps);
    return [dynamoTable as dynamodb.ITable, dynamoTable];
  } else {
    return [props.existingTableInterface, undefined];
  }
}

export function getPartitionKeyNameFromTable(table: dynamodb.Table): string {
  const cfnTable = table.node.findChild('Resource') as dynamodb.CfnTable;
  const keySchema = cfnTable.keySchema as dynamodb.CfnTable.KeySchemaProperty[];
  const partitionKey = keySchema.find((keyPart: any) => keyPart.keyType === 'HASH');
  if (!partitionKey) {
    throw new Error('Partition key for table not defined');
  }
  return partitionKey.attributeName;
}
