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

/*
 *  The functions found here in the core library are for internal use and can be changed
 *  or removed outside of a major release. We recommend against calling them directly from client code.
 */

import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { DefaultTableProps, DefaultTableWithStreamProps } from './dynamodb-table-defaults';
import { addCfnGuardSuppressRules, consolidateProps } from './utils';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

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
  /**
   * Existing instance of dynamodb interface.
   * Providing both this and `dynamoTableProps` will cause an error.
   *
   * @default - None
   */
  readonly existingTableInterface?: dynamodb.ITable
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

export interface BuildDynamoDBTableResponse {
  readonly tableInterface: dynamodb.ITable,
  readonly tableObject?: dynamodb.Table,
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function buildDynamoDBTable(scope: Construct, props: BuildDynamoDBTableProps): BuildDynamoDBTableResponse {

  // Conditional DynamoDB Table creation
  if (props.existingTableObj) {
    return { tableInterface: props.existingTableObj, tableObject: props.existingTableObj };
  } else if (props.existingTableInterface) {
    return { tableInterface: props.existingTableInterface };
  } else {
    const consolidatedTableProps = consolidateProps(DefaultTableProps, props.dynamoTableProps);
    const newTable = new dynamodb.Table(scope, 'DynamoTable', consolidatedTableProps);
    // AWS Managed encryption keys is acceptable under published best practices
    // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices-security-preventative.html
    addCfnGuardSuppressRules(newTable, ["DYNAMODB_TABLE_ENCRYPTED_KMS"]);
    return { tableInterface: newTable, tableObject: newTable };
  }
}

export interface BuildDynamoDBTableWithStreamResponse {
  readonly tableInterface: dynamodb.ITable,
  readonly tableObject?: dynamodb.Table,
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function buildDynamoDBTableWithStream(scope: Construct, props: BuildDynamoDBTableWithStreamProps): BuildDynamoDBTableWithStreamResponse {
  // Conditional DynamoDB Table creation
  if (!props.existingTableInterface) {
    // Set the default props for DynamoDB table
    const dynamoTableProps = consolidateProps(DefaultTableWithStreamProps, props.dynamoTableProps);
    const dynamoTable: dynamodb.Table = new dynamodb.Table(scope, 'DynamoTable', dynamoTableProps);
    // AWS Managed encryption keys is acceptable under published best practices
    // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices-security-preventative.html
    addCfnGuardSuppressRules(dynamoTable, ["DYNAMODB_TABLE_ENCRYPTED_KMS"]);
    return { tableInterface: dynamoTable, tableObject: dynamoTable };
  } else {
    return { tableInterface: props.existingTableInterface };
  }
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function getPartitionKeyNameFromTable(table: dynamodb.Table): string {
  const cfnTable = table.node.findChild('Resource') as dynamodb.CfnTable;
  const keySchema = cfnTable.keySchema as dynamodb.CfnTable.KeySchemaProperty[];
  const partitionKey = keySchema.find((keyPart: any) => keyPart.keyType === 'HASH');
  if (!partitionKey) {
    throw new Error('Partition key for table not defined');
  }
  return partitionKey.attributeName;
}

export interface DynamoDBProps {
  readonly dynamoTableProps?: dynamodb.TableProps,
  readonly existingTableObj?: dynamodb.Table,
  readonly existingTableInterface?: dynamodb.ITable,
}

export function CheckDynamoDBProps(propsObject: DynamoDBProps | any) {
  let errorMessages = '';
  let errorFound = false;

  if (propsObject.dynamoTableProps && propsObject.existingTableObj) {
    errorMessages += 'Error - Either provide existingTableObj or dynamoTableProps, but not both.\n';
    errorFound = true;
  }

  if (propsObject.dynamoTableProps && propsObject.existingTableInterface) {
    errorMessages += 'Error - Either provide existingTableInterface or dynamoTableProps, but not both.\n';
    errorFound = true;
  }

  if (propsObject.existingTableObj && propsObject.existingTableInterface) {
    errorMessages += 'Error - Either provide existingTableInterface or existingTableObj, but not both.\n';
    errorFound = true;
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }
}
