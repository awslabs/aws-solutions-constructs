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

import { DynamoDBStreamToLambda, DynamoDBStreamToLambdaProps } from "../lib";
import * as lambda from '@aws-cdk/aws-lambda';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as cdk from "@aws-cdk/core";
import '@aws-cdk/assert/jest';

function deployNewFunc(stack: cdk.Stack) {
  const props: DynamoDBStreamToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
  };

  return new DynamoDBStreamToLambda(stack, 'test-lambda-dynamodb-stack', props);
}

test('check lambda EventSourceMapping', () => {
  const stack = new cdk.Stack();
  deployNewFunc(stack);

  expect(stack).toHaveResource('AWS::Lambda::EventSourceMapping', {
    EventSourceArn: {
      "Fn::GetAtt": [
        "testlambdadynamodbstacktestlambdadynamodbstackWDynamoTableA36F83E4",
        "StreamArn"
      ]
    },
    FunctionName: {
      Ref: "testlambdadynamodbstacktestlambdadynamodbstackWLambdaFunctionB74B248B"
    },
    BatchSize: 100,
    StartingPosition: "TRIM_HORIZON",
    MaximumRecordAgeInSeconds: 86400,
    MaximumRetryAttempts: 500,
    BisectBatchOnFunctionError: true
  });
});

test('check DynamoEventSourceProps override', () => {
  const stack = new cdk.Stack();
  const props: DynamoDBStreamToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
    dynamoEventSourceProps: {
      startingPosition: lambda.StartingPosition.LATEST,
      batchSize: 55
    }
  };

  new DynamoDBStreamToLambda(stack, 'test-lambda-dynamodb-stack', props);

  expect(stack).toHaveResource('AWS::Lambda::EventSourceMapping', {
    EventSourceArn: {
      "Fn::GetAtt": [
        "testlambdadynamodbstacktestlambdadynamodbstackWDynamoTableA36F83E4",
        "StreamArn"
      ]
    },
    FunctionName: {
      Ref: "testlambdadynamodbstacktestlambdadynamodbstackWLambdaFunctionB74B248B"
    },
    BatchSize: 55,
    StartingPosition: "LATEST"
  });
});

test('check lambda permission to read dynamodb stream', () => {
  const stack = new cdk.Stack();
  deployNewFunc(stack);

  expect(stack).toHaveResource('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "xray:PutTraceSegments",
            "xray:PutTelemetryRecords"
          ],
          Effect: "Allow",
          Resource: "*"
        },
        {
          Action: "dynamodb:ListStreams",
          Effect: "Allow",
          Resource: "*"
        },
        {
          Action: [
            "dynamodb:DescribeStream",
            "dynamodb:GetRecords",
            "dynamodb:GetShardIterator"
          ],
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "testlambdadynamodbstacktestlambdadynamodbstackWDynamoTableA36F83E4",
              "StreamArn"
            ]
          }
        },
        {
          Action: [
            "sqs:SendMessage",
            "sqs:GetQueueAttributes",
            "sqs:GetQueueUrl"
          ],
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "testlambdadynamodbstacktestlambdadynamodbstackWSqsDlqQueueEABCC500",
              "Arn"
            ]
          }
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test('check dynamodb table stream override', () => {
  const stack = new cdk.Stack();
  const props: DynamoDBStreamToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
    dynamoTableProps: {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING
      },
      stream: dynamodb.StreamViewType.NEW_IMAGE
    }
  };

  new DynamoDBStreamToLambda(stack, 'test-lambda-dynamodb-stack', props);
  expect(stack).toHaveResource('AWS::DynamoDB::Table', {
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

test('check getter methods without existingTableInterface', () => {
  const stack = new cdk.Stack();

  const construct: DynamoDBStreamToLambda = deployNewFunc(stack);

  expect(construct.lambdaFunction).toBeInstanceOf(lambda.Function);
  expect(construct.dynamoTableInterface).toHaveProperty('tableName');
  expect(construct.dynamoTable).toBeInstanceOf(dynamodb.Table);
  expect(construct.dynamoTable).toHaveProperty('addGlobalSecondaryIndex');
});

test('check getter methods with existingTableInterface', () => {
  const stack = new cdk.Stack();

  const construct: DynamoDBStreamToLambda = new DynamoDBStreamToLambda(stack, 'test', {
    existingTableInterface: new dynamodb.Table(stack, 'table', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING
      },
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
    }),
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
  });

  expect(construct.lambdaFunction).toBeInstanceOf(lambda.Function);
  expect(construct.dynamoTable).toBeUndefined();
});

test('check exception for Missing existingObj from props', () => {
  const stack = new cdk.Stack();

  const props: DynamoDBStreamToLambdaProps = {
  };

  try {
    new DynamoDBStreamToLambda(stack, 'test-iot-lambda-integration', props);
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
  }
});

test('check dynamodb table stream override with ITable', () => {
  const stack = new cdk.Stack();
  const existingTableInterface = dynamodb.Table.fromTableAttributes(stack, 'existingtable', {
    tableArn: 'arn:aws:dynamodb:us-east-1:xxxxxxxxxxxxx:table/existing-table',
    tableStreamArn: 'arn:aws:dynamodb:us-east-1:xxxxxxxxxxxxx:table/existing-table/stream/2020-06-22T18:34:05.824'
  });
  const props: DynamoDBStreamToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
    existingTableInterface
  };

  new DynamoDBStreamToLambda(stack, 'test-lambda-dynamodb-stack', props);

  expect(stack).toHaveResource('AWS::Lambda::EventSourceMapping', {
    EventSourceArn: "arn:aws:dynamodb:us-east-1:xxxxxxxxxxxxx:table/existing-table/stream/2020-06-22T18:34:05.824",
  });

  expect(stack).toHaveResource('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "xray:PutTraceSegments",
            "xray:PutTelemetryRecords"
          ],
          Effect: "Allow",
          Resource: "*"
        },
        {
          Action: "dynamodb:ListStreams",
          Effect: "Allow",
          Resource: "*"
        },
        {
          Action: [
            "dynamodb:DescribeStream",
            "dynamodb:GetRecords",
            "dynamodb:GetShardIterator"
          ],
          Effect: "Allow",
          Resource: "arn:aws:dynamodb:us-east-1:xxxxxxxxxxxxx:table/existing-table/stream/2020-06-22T18:34:05.824"
        },
        {
          Action: [
            "sqs:SendMessage",
            "sqs:GetQueueAttributes",
            "sqs:GetQueueUrl"
          ],
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [
              "testlambdadynamodbstacktestlambdadynamodbstackWSqsDlqQueueEABCC500",
              "Arn"
            ]
          }
        }
      ],
      Version: "2012-10-17"
    }
  });
});
