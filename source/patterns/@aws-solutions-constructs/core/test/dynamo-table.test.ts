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

import { SynthUtils } from '@aws-cdk/assert';
import { Stack } from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as defaults from '../index';
import { overrideProps } from '../lib/utils';
import '@aws-cdk/assert/jest';

test('snapshot test TableProps default params', () => {
    const stack = new Stack();
    new dynamodb.Table(stack, 'test-dynamo-defaults', defaults.DefaultTableProps);
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('snapshot test TableWithStream default params', () => {
  const stack = new Stack();
  new dynamodb.Table(stack, 'test-dynamo-stream-defaults', defaults.DefaultTableWithStreamProps);
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('test TableProps change billing mode', () => {
    const stack = new Stack();

    const defaultProps: dynamodb.TableProps = defaults.DefaultTableProps;

    const inProps: dynamodb.TableProps = {
        billingMode: dynamodb.BillingMode.PROVISIONED,
        readCapacity: 3,
        writeCapacity: 3,
        partitionKey: {
            name: 'id',
            type: dynamodb.AttributeType.STRING
        }
    };

    const outProps = overrideProps(defaultProps, inProps);
    new dynamodb.Table(stack, 'test-dynamo-override', outProps);

    expect(stack).toHaveResource("AWS::DynamoDB::Table", {
        KeySchema: [
          {
            AttributeName: "id",
            KeyType: "HASH"
          }
        ],
        AttributeDefinitions: [
          {
            AttributeName: "id",
            AttributeType: "S"
          }
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 3,
          WriteCapacityUnits: 3
        },
        SSESpecification: {
          SSEEnabled: true
        }
      });
});

test('test TableProps override add sort key', () => {
    const stack = new Stack();

    const defaultProps: dynamodb.TableProps = defaults.DefaultTableProps;

    const inProps: dynamodb.TableProps = {
        partitionKey: {
          name: 'id',
          type: dynamodb.AttributeType.STRING
        },
        sortKey: {
            name: 'sort_key',
            type: dynamodb.AttributeType.STRING
        }
    };

    const outProps = overrideProps(defaultProps, inProps);
    new dynamodb.Table(stack, 'test-dynamo-override', outProps);

    expect(stack).toHaveResource("AWS::DynamoDB::Table", {
        KeySchema: [
          {
            AttributeName: "id",
            KeyType: "HASH"
          },
          {
            AttributeName: "sort_key",
            KeyType: "RANGE"
          }
        ],
        AttributeDefinitions: [
          {
            AttributeName: "id",
            AttributeType: "S"
          },
          {
            AttributeName: "sort_key",
            AttributeType: "S"
          }
        ],
        BillingMode: "PAY_PER_REQUEST",
        SSESpecification: {
          SSEEnabled: true
        }
    });
});

test('test TableWithStreamProps override stream view type', () => {
  const stack = new Stack();

  const defaultProps: dynamodb.TableProps = defaults.DefaultTableWithStreamProps;

  const inProps: dynamodb.TableProps = {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING
      },
      stream: dynamodb.StreamViewType.NEW_IMAGE
  };

  const outProps = overrideProps(defaultProps, inProps);
  new dynamodb.Table(stack, 'test-dynamo-override', outProps);

  expect(stack).toHaveResource("AWS::DynamoDB::Table", {
    KeySchema: [
      {
        AttributeName: "id",
        KeyType: "HASH"
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: "id",
        AttributeType: "S"
      }
    ],
    BillingMode: "PAY_PER_REQUEST",
    SSESpecification: {
      SSEEnabled: true
    },
    StreamSpecification: {
      StreamViewType: "NEW_IMAGE"
    }
  });
});
