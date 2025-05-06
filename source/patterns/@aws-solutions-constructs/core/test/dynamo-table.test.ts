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

import { Stack } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as defaults from '../index';
import { overrideProps } from '../lib/utils';
import { Template } from 'aws-cdk-lib/assertions';
import { getPartitionKeyNameFromTable } from '../lib/dynamodb-table-helper';

test('test TableProps change billing mode', () => {
  const stack = new Stack();

  const defaultProps: dynamodb.TableProps = defaults.GetDefaultTableProps({
    partitionKey: {
      name: 'donotuse',
      type: dynamodb.AttributeType.BINARY
    },
  });

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

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::DynamoDB::Table", {
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

  const defaultProps: dynamodb.TableProps = defaults.GetDefaultTableProps({
    partitionKey: {
      name: 'donotuse',
      type: dynamodb.AttributeType.BINARY
    },
  });

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

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::DynamoDB::Table", {
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

  const defaultProps: dynamodb.TableProps = defaults.GetDefaultTableWithStreamProps({
    partitionKey: {
      name: 'donotuse',
      type: dynamodb.AttributeType.BINARY
    },
  });

  const inProps: dynamodb.TableProps = {
    partitionKey: {
      name: 'id',
      type: dynamodb.AttributeType.STRING
    },
    stream: dynamodb.StreamViewType.NEW_IMAGE
  };

  const outProps = overrideProps(defaultProps, inProps);
  new dynamodb.Table(stack, 'test-dynamo-override', outProps);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::DynamoDB::Table", {
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

test('test buildDynamoDBTable with existingTableObj', () => {
  const stack = new Stack();

  const tableProps: dynamodb.TableProps = {
    billingMode: dynamodb.BillingMode.PROVISIONED,
    partitionKey: {
      name: 'table_id',
      type: dynamodb.AttributeType.STRING
    }
  };

  const existingTableObj = new dynamodb.Table(stack, 'DynamoTable', tableProps);

  const buildDynamoDBTableResponse = defaults.buildDynamoDBTable(stack, {
    existingTableObj
  });

  expect(buildDynamoDBTableResponse.tableInterface).toBeDefined();
  expect(buildDynamoDBTableResponse.tableObject).toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    KeySchema: [
      {
        AttributeName: "table_id",
        KeyType: "HASH"
      }
    ]
  });

  template.hasResourceProperties('AWS::DynamoDB::Table', {
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  });
});

test('test buildDynamoDBTable without any arguments', () => {
  const stack = new Stack();

  const buildDynamoDBTableResponse = defaults.buildDynamoDBTable(stack, {});

  expect(buildDynamoDBTableResponse.tableInterface).toBeDefined();
  expect(buildDynamoDBTableResponse.tableObject).toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    KeySchema: [
      {
        AttributeName: "id",
        KeyType: "HASH"
      }
    ]
  });

  template.hasResourceProperties('AWS::DynamoDB::Table', {
    BillingMode: "PAY_PER_REQUEST"
  });

  template.hasResourceProperties('AWS::DynamoDB::Table', {
    SSESpecification: {
      SSEEnabled: true
    }
  });
});

test('test buildDynamoDBTable with TableProps', () => {
  const stack = new Stack();

  const dynamoTableProps: dynamodb.TableProps = {
    billingMode: dynamodb.BillingMode.PROVISIONED,
    partitionKey: {
      name: 'table_id',
      type: dynamodb.AttributeType.STRING
    }
  };

  const buildDynamoDBTableResponse = defaults.buildDynamoDBTable(stack, {
    dynamoTableProps
  });

  expect(buildDynamoDBTableResponse.tableInterface).toBeDefined();
  expect(buildDynamoDBTableResponse.tableObject).toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    KeySchema: [
      {
        AttributeName: "table_id",
        KeyType: "HASH"
      }
    ]
  });

  template.hasResourceProperties('AWS::DynamoDB::Table', {
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  });
});

test('test buildDynamoDBTableWithStream with TableProps', () => {
  const stack = new Stack();

  const dynamoTableProps: dynamodb.TableProps = {
    partitionKey: {
      name: 'table_id',
      type: dynamodb.AttributeType.STRING
    },
    stream: dynamodb.StreamViewType.NEW_IMAGE
  };

  const response = defaults.buildDynamoDBTableWithStream(stack, {
    dynamoTableProps
  });

  expect(response.tableInterface).toBeDefined();
  expect(response.tableObject).toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    KeySchema: [
      {
        AttributeName: "table_id",
        KeyType: "HASH"
      }
    ]
  });

  template.hasResourceProperties('AWS::DynamoDB::Table', {
    StreamSpecification: {
      StreamViewType: "NEW_IMAGE"
    }
  });
});

test('test buildDynamoDBTableWithStream without any arguments', () => {
  const stack = new Stack();

  const response = defaults.buildDynamoDBTableWithStream(stack, {});

  expect(response.tableInterface).toBeDefined();
  expect(response.tableObject).toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    KeySchema: [
      {
        AttributeName: "id",
        KeyType: "HASH"
      }
    ]
  });

  template.hasResourceProperties('AWS::DynamoDB::Table', {
    BillingMode: "PAY_PER_REQUEST"
  });

  template.hasResourceProperties('AWS::DynamoDB::Table', {
    SSESpecification: {
      SSEEnabled: true
    }
  });

  template.hasResourceProperties('AWS::DynamoDB::Table', {
    StreamSpecification: {
      StreamViewType: "NEW_AND_OLD_IMAGES"
    }
  });
});

test('test buildDynamoDBTableWithStream with existingTableObj', () => {
  const stack = new Stack();

  const tableProps: dynamodb.TableProps = {
    partitionKey: {
      name: 'table_id',
      type: dynamodb.AttributeType.STRING
    },
    stream: dynamodb.StreamViewType.NEW_IMAGE
  };

  const existingTableInterface = new dynamodb.Table(stack, 'DynamoTable', tableProps);

  const response = defaults.buildDynamoDBTableWithStream(stack, {
    existingTableInterface
  });

  expect(response.tableInterface).toBeDefined();
  expect(response.tableObject).not.toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    KeySchema: [
      {
        AttributeName: "table_id",
        KeyType: "HASH"
      }
    ]
  });

  template.hasResourceProperties('AWS::DynamoDB::Table', {
    StreamSpecification: {
      StreamViewType: "NEW_IMAGE"
    }
  });
});

test('test buildDynamoDBTable with existingTableInterface', () => {
  const stack = new Stack();

  const tableProps: dynamodb.TableProps = {
    partitionKey: {
      name: 'table_id',
      type: dynamodb.AttributeType.STRING
    },
    stream: dynamodb.StreamViewType.NEW_IMAGE
  };

  const existingTableInterface = new dynamodb.Table(stack, 'DynamoTable', tableProps);

  const buildDynamoDBTableResponse = defaults.buildDynamoDBTable(stack, {
    existingTableInterface
  });

  expect(buildDynamoDBTableResponse.tableInterface).toBeDefined();
  expect(buildDynamoDBTableResponse.tableObject).not.toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    KeySchema: [
      {
        AttributeName: "table_id",
        KeyType: "HASH"
      }
    ]
  });

  template.hasResourceProperties('AWS::DynamoDB::Table', {
    StreamSpecification: {
      StreamViewType: "NEW_IMAGE"
    }
  });
});

test('test getPartitionKeyNameFromTable()', () => {
  const partitionKeyName = 'testPartitionKey';

  const stack = new Stack();

  const defaultProps: dynamodb.TableProps = defaults.GetDefaultTableProps({
    partitionKey: {
      name: 'donotuse',
      type: dynamodb.AttributeType.BINARY
    },
  });

  const inProps: dynamodb.TableProps = {
    partitionKey: {
      name: partitionKeyName,
      type: dynamodb.AttributeType.STRING
    },
    sortKey: {
      name: 'sort_key',
      type: dynamodb.AttributeType.STRING
    }
  };

  const outProps = overrideProps(defaultProps, inProps);
  const newTable = new dynamodb.Table(stack, 'test-dynamo-override', outProps);

  const testKeyName = getPartitionKeyNameFromTable(newTable);

  expect(testKeyName).toEqual(partitionKeyName);
});

// TODO: We should never set pointInTimeRecovery in defaults, only default to the new
// TODO: If the old is provided, don't set the new as a default
// TODO: If the new is provided, we can still set the default - the new will override. so
// we don't need a "if  pointInTimeRecoverySpecification" check here - just look for old stuff.

test('Test that PointInTimeRecovery is not set when PointInTimeRecoverySpecification is provided', () => {
  const defaultProps: dynamodb.TableProps = defaults.GetDefaultTableProps({
    partitionKey: {
      name: 'donotuse',
      type: dynamodb.AttributeType.BINARY
    },
    pointInTimeRecovery: true
  });

  expect(defaultProps.pointInTimeRecoverySpecification).toBeUndefined();

  // Let's confirm the alternative  as well
  const moreDefaultProps: dynamodb.TableProps = defaults.GetDefaultTableProps({
    partitionKey: {
      name: 'donotuse',
      type: dynamodb.AttributeType.BINARY
    }
  });

  expect(moreDefaultProps.pointInTimeRecoverySpecification).toBeDefined();
});

test('Test that PointInTimeRecovery is not set when PointInTimeRecoverySpecification is provided for table with stream', () => {
  const defaultProps: dynamodb.TableProps = defaults.GetDefaultTableWithStreamProps({
    partitionKey: {
      name: 'donotuse',
      type: dynamodb.AttributeType.BINARY
    },
    pointInTimeRecovery: true
  });

  expect(defaultProps.pointInTimeRecoverySpecification).toBeUndefined();

  // Let's confirm the alternative  as well
  const moreDefaultProps: dynamodb.TableProps = defaults.GetDefaultTableWithStreamProps({
    partitionKey: {
      name: 'donotuse',
      type: dynamodb.AttributeType.BINARY
    }
  });

  expect(moreDefaultProps.pointInTimeRecoverySpecification).toBeDefined();
});

// ---------------------------
// Prop Tests
// ---------------------------
test('Test fail DynamoDB table check', () => {
  const stack = new Stack();

  const props: defaults.DynamoDBProps = {
    existingTableObj: new dynamodb.Table(stack, 'placeholder', defaults.GetDefaultTableProps({
      partitionKey: {
        name: 'donotuse',
        type: dynamodb.AttributeType.BINARY
      },
    })),
    dynamoTableProps: defaults.GetDefaultTableProps({
      partitionKey: {
        name: 'donotuse',
        type: dynamodb.AttributeType.BINARY
      },
    }),
  };

  const app = () => {
    defaults.CheckDynamoDBProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide existingTableObj or dynamoTableProps, but not both.\n');
});

test('Test fail DynamoDB table check (for interface AND obj)', () => {
  const stack = new Stack();

  const props: defaults.DynamoDBProps = {
    existingTableInterface: new dynamodb.Table(stack, 'placeholder', defaults.GetDefaultTableProps({
      partitionKey: {
        name: 'donotuse',
        type: dynamodb.AttributeType.BINARY
      },
    })),
    existingTableObj: new dynamodb.Table(stack, 'placeholderobj', defaults.GetDefaultTableProps({
      partitionKey: {
        name: 'donotuse',
        type: dynamodb.AttributeType.BINARY
      },
    })),
  };

  const app = () => {
    defaults.CheckDynamoDBProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide existingTableInterface or existingTableObj, but not both.\n');
});

test('Test fail DynamoDB pointInTimeRecoverySpecification and pointInTimeRecovery both specified', () => {
  const props: defaults.DynamoDBProps = {
    pointInTimeRecovery: true,
    pointInTimeRecoverySpecification: {
      pointInTimeRecoveryEnabled: true
    }
  };

  const app = () => {
    defaults.CheckDynamoDBProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide pointInTimeRecovery or pointInTimeRecoverySpecification, but not both.\n');
});


// ---------------------------
// New Tests
// ---------------------------
test('test pointInTimeRecoverySpecification default is set correctly', () => {
  const stack = new Stack();

  const dynamoTableProps: dynamodb.TableProps = {
    partitionKey: {
      name: 'table_id',
      type: dynamodb.AttributeType.STRING
    },
  };

  defaults.buildDynamoDBTable(stack, {
    dynamoTableProps
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    PointInTimeRecoverySpecification: {
      PointInTimeRecoveryEnabled: true
    }
  });
});


test('test that a provided pointInTimeRecoverySpecification value is used', () => {
  const stack = new Stack();

  const dynamoTableProps: dynamodb.TableProps = {
    partitionKey: {
      name: 'table_id',
      type: dynamodb.AttributeType.STRING
    },
    pointInTimeRecoverySpecification: {
      pointInTimeRecoveryEnabled: false
    }
  };

  defaults.buildDynamoDBTable(stack, {
    dynamoTableProps
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    PointInTimeRecoverySpecification: {
      PointInTimeRecoveryEnabled: false
    }
  });
});

test('test that if client provides pointInTimeRecovery it is used', () => {
  const stack = new Stack();

  const dynamoTableProps: dynamodb.TableProps = {
    partitionKey: {
      name: 'table_id',
      type: dynamodb.AttributeType.STRING
    },
    pointInTimeRecovery: true
  };

  defaults.buildDynamoDBTable(stack, {
    dynamoTableProps
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    // pointInTimeRecovery has no CFN equivalent, CDK converts it to PointInTimeRecoverySpecification
    PointInTimeRecoverySpecification: {
      PointInTimeRecoveryEnabled: true
    }
  });
});

test('test that if client provides pointInTimeRecovery: false will turn off feature', () => {
  const stack = new Stack();

  const dynamoTableProps: dynamodb.TableProps = {
    partitionKey: {
      name: 'table_id',
      type: dynamodb.AttributeType.STRING
    },
    pointInTimeRecovery: false
  };

  defaults.buildDynamoDBTable(stack, {
    dynamoTableProps
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    // pointInTimeRecovery has no CFN equivalent, CDK converts it to PointInTimeRecoverySpecification
    PointInTimeRecoverySpecification: {
      PointInTimeRecoveryEnabled: false
    }
  });
});

test('test pointInTimeRecoverySpecification default is set correctly', () => {
  const stack = new Stack();

  const dynamoTableProps: dynamodb.TableProps = {
    partitionKey: {
      name: 'table_id',
      type: dynamodb.AttributeType.STRING
    },
  };

  defaults.buildDynamoDBTableWithStream(stack, {
    dynamoTableProps
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    PointInTimeRecoverySpecification: {
      PointInTimeRecoveryEnabled: true
    }
  });
});

test('test that a provided pointInTimeRecoverySpecification value is used', () => {
  const stack = new Stack();

  const dynamoTableProps: dynamodb.TableProps = {
    partitionKey: {
      name: 'table_id',
      type: dynamodb.AttributeType.STRING
    },
    pointInTimeRecoverySpecification: {
      pointInTimeRecoveryEnabled: false
    }
  };

  defaults.buildDynamoDBTableWithStream(stack, {
    dynamoTableProps
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    PointInTimeRecoverySpecification: {
      PointInTimeRecoveryEnabled: false
    }
  });
});

test('test that if client provides pointInTimeRecovery it is used', () => {
  const stack = new Stack();

  const dynamoTableProps: dynamodb.TableProps = {
    partitionKey: {
      name: 'table_id',
      type: dynamodb.AttributeType.STRING
    },
    pointInTimeRecovery: true
  };

  defaults.buildDynamoDBTableWithStream(stack, {
    dynamoTableProps
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    // pointInTimeRecovery has no CFN equivalent, CDK converts it to PointInTimeRecoverySpecification
    PointInTimeRecoverySpecification: {
      PointInTimeRecoveryEnabled: true
    }
  });
});

test('test that if client provides pointInTimeRecovery: false will turn off feature', () => {
  const stack = new Stack();

  const dynamoTableProps: dynamodb.TableProps = {
    partitionKey: {
      name: 'table_id',
      type: dynamodb.AttributeType.STRING
    },
    pointInTimeRecovery: false
  };

  defaults.buildDynamoDBTableWithStream(stack, {
    dynamoTableProps
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    // pointInTimeRecovery has no CFN equivalent, CDK converts it to PointInTimeRecoverySpecification
    PointInTimeRecoverySpecification: {
      PointInTimeRecoveryEnabled: false
    }
  });
});
