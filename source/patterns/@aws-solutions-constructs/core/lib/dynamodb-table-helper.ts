/**
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import * as cdk from '@aws-cdk/core';
import { DefaultTableProps, DefaultTableWithStreamProps } from './dynamodb-table-defaults';
import { overrideProps } from './utils';

export interface BuildDynamoDBTableProps {
  /**
   * Optional user provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly dynamoTableProps?: dynamodb.TableProps,
  /**
   * Existing instance of dynamodb table object.
   * If this is set then the dynamoTableProps is ignored
   *
   * @default - None
   */
  readonly existingTableObj?: dynamodb.Table
}

export function buildDynamoDBTable(scope: cdk.Construct, props: BuildDynamoDBTableProps): dynamodb.Table {
  // Conditional DynamoDB Table creation
  if (!props.existingTableObj) {
    // Set the default props for DynamoDB table
    if (props.dynamoTableProps) {
      const dynamoTableProps = overrideProps(DefaultTableProps, props.dynamoTableProps);
      return new dynamodb.Table(scope, 'DynamoTable', dynamoTableProps);
    } else {
      return new dynamodb.Table(scope, 'DynamoTable', DefaultTableProps);
    }
  } else {
    return props.existingTableObj;
  }
}

export function buildDynamoDBTableWithStream(scope: cdk.Construct, props: BuildDynamoDBTableProps): dynamodb.Table {
  // Conditional DynamoDB Table creation
  if (!props.existingTableObj) {
    // Set the default props for DynamoDB table
    if (props.dynamoTableProps) {
      const dynamoTableProps = overrideProps(DefaultTableWithStreamProps, props.dynamoTableProps);
      return new dynamodb.Table(scope, 'DynamoTable', dynamoTableProps);
    } else {
      return new dynamodb.Table(scope, 'DynamoTable', DefaultTableWithStreamProps);
    }
  } else {
    return props.existingTableObj;
  }
}