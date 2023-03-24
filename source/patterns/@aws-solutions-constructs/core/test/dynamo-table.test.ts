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

  const defaultProps: dynamodb.TableProps = defaults.DefaultTableProps;

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

test('Test providing both existingTableInterface and existingTableObj', () => {
  const stack = new Stack();

  const tableProps: dynamodb.TableProps = {
    partitionKey: {
      name: 'table_id',
      type: dynamodb.AttributeType.STRING
    },
    stream: dynamodb.StreamViewType.NEW_IMAGE
  };

  const existingTableInterface = new dynamodb.Table(stack, 'DynamoTable', tableProps)
  ;
  const newProps = {
    existingTableInterface,
    existingTableObj: existingTableInterface
  };
  const app = () => {
    defaults.buildDynamoDBTable(stack, newProps);
  };

  expect(app).toThrowError('Error - Either provide existingTableInterface or existingTableObj, but not both.\n');
});

test('Test providing both existingTableInterface and dynamoTableProps', () => {
  const stack = new Stack();

  const dynamoTableProps: dynamodb.TableProps = {
    partitionKey: {
      name: 'table_id',
      type: dynamodb.AttributeType.STRING
    },
    stream: dynamodb.StreamViewType.NEW_IMAGE
  };

  const existingTableInterface = new dynamodb.Table(stack, 'DynamoTable', dynamoTableProps)
  ;
  const newProps = {
    existingTableInterface,
    dynamoTableProps
  };
  const app = () => {
    defaults.buildDynamoDBTable(stack, newProps);
  };

  expect(app).toThrowError('Error - Either provide existingTableInterface or dynamoTableProps, but not both.\n');
});

test('Test providing both existingTableObj and dynamoTableProps', () => {
  const stack = new Stack();

  const dynamoTableProps: dynamodb.TableProps = {
    partitionKey: {
      name: 'table_id',
      type: dynamodb.AttributeType.STRING
    },
    stream: dynamodb.StreamViewType.NEW_IMAGE
  };

  const existingTableObj = new dynamodb.Table(stack, 'DynamoTable', dynamoTableProps)
  ;
  const newProps = {
    existingTableObj,
    dynamoTableProps
  };
  const app = () => {
    defaults.buildDynamoDBTable(stack, newProps);
  };

  expect(app).toThrowError('Error - Either provide existingTableObj or dynamoTableProps, but not both.\n');
});