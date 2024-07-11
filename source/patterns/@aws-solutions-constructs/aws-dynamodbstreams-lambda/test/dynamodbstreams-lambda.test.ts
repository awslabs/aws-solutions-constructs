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

import { DynamoDBStreamsToLambda, DynamoDBStreamsToLambdaProps } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import * as defaults from '@aws-solutions-constructs/core';

function deployNewFunc(stack: cdk.Stack) {
  const props: DynamoDBStreamsToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
  };

  return new DynamoDBStreamsToLambda(stack, 'test-lambda-dynamodb-stack', props);
}

test('check lambda EventSourceMapping', () => {
  const stack = new cdk.Stack();
  deployNewFunc(stack);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
    EventSourceArn: {
      "Fn::GetAtt": [
        "testlambdadynamodbstackDynamoTable8138E93B",
        "StreamArn"
      ]
    },
    FunctionName: {
      Ref: "testlambdadynamodbstackLambdaFunction5DDB3E8D"
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
  const props: DynamoDBStreamsToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    dynamoEventSourceProps: {
      startingPosition: lambda.StartingPosition.LATEST,
      batchSize: 55
    }
  };

  new DynamoDBStreamsToLambda(stack, 'test-lambda-dynamodb-stack', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
    EventSourceArn: {
      "Fn::GetAtt": [
        "testlambdadynamodbstackDynamoTable8138E93B",
        "StreamArn"
      ]
    },
    FunctionName: {
      Ref: "testlambdadynamodbstackLambdaFunction5DDB3E8D"
    },
    BatchSize: 55,
    StartingPosition: "LATEST"
  });
});

test('check lambda permission to read dynamodb stream', () => {
  const stack = new cdk.Stack();
  deployNewFunc(stack);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::IAM::Policy', {
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
              "testlambdadynamodbstackDynamoTable8138E93B",
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
              "testlambdadynamodbstackSqsDlqQueue4CC9868B",
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
  const props: DynamoDBStreamsToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
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

  new DynamoDBStreamsToLambda(stack, 'test-lambda-dynamodb-stack', props);
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::DynamoDB::Table', {
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

  const construct: DynamoDBStreamsToLambda = deployNewFunc(stack);

  expect(construct.lambdaFunction).toBeInstanceOf(lambda.Function);
  expect(construct.dynamoTableInterface).toHaveProperty('tableName');
  expect(construct.dynamoTable).toBeInstanceOf(dynamodb.Table);
  expect(construct.dynamoTable).toHaveProperty('addGlobalSecondaryIndex');
});

test('check getter methods with existingTableInterface', () => {
  const stack = new cdk.Stack();

  const construct: DynamoDBStreamsToLambda = new DynamoDBStreamsToLambda(stack, 'test', {
    existingTableInterface: new dynamodb.Table(stack, 'table', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING
      },
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
    }),
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
  });

  expect(construct.lambdaFunction).toBeInstanceOf(lambda.Function);
  expect(construct.dynamoTable).toBeUndefined();
});

test('check exception for Missing existingObj from props', () => {
  const stack = new cdk.Stack();

  const props: DynamoDBStreamsToLambdaProps = {
  };

  try {
    new DynamoDBStreamsToLambda(stack, 'test-iot-lambda-integration', props);
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
  const props: DynamoDBStreamsToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler'
    },
    existingTableInterface
  };

  new DynamoDBStreamsToLambda(stack, 'test-lambda-dynamodb-stack', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
    EventSourceArn: "arn:aws:dynamodb:us-east-1:xxxxxxxxxxxxx:table/existing-table/stream/2020-06-22T18:34:05.824",
  });

  template.hasResourceProperties('AWS::IAM::Policy', {
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
              "testlambdadynamodbstackSqsDlqQueue4CC9868B",
              "Arn"
            ]
          }
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test('Confirm call to CheckLambdaProps', () => {
  // Initial Setup
  const stack = new cdk.Stack();
  const lambdaFunction = new lambda.Function(stack, 'a-function', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  });

  const props: DynamoDBStreamsToLambdaProps = {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    },
    existingLambdaObj: lambdaFunction,
  };
  const app = () => {
    new DynamoDBStreamsToLambda(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n');
});
