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
import { DynamoDBStreamToLambda, DynamoDBStreamToLambdaProps } from "../lib";
import * as lambda from '@aws-cdk/aws-lambda';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as cdk from "@aws-cdk/core";
import '@aws-cdk/assert/jest';

function deployNewFunc(stack: cdk.Stack) {
  const props: DynamoDBStreamToLambdaProps = {
    deployLambda: true,
    lambdaFunctionProps: {
          code: lambda.Code.asset(`${__dirname}/lambda`),
          runtime: lambda.Runtime.NODEJS_12_X,
          handler: 'index.handler'
    },
  };

  return new DynamoDBStreamToLambda(stack, 'test-lambda-dynamodb-stack', props);
}

test('snapshot test DynamoDBStreamToLambda default params', () => {
  const stack = new cdk.Stack();
  deployNewFunc(stack);
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('check lambda EventSourceMapping', () => {
  const stack = new cdk.Stack();
  deployNewFunc(stack);

  expect(stack).toHaveResource('AWS::Lambda::EventSourceMapping', {
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
    StartingPosition: "TRIM_HORIZON"
  });
});

test('check DynamoEventSourceProps override', () => {
  const stack = new cdk.Stack();
  const props: DynamoDBStreamToLambdaProps = {
    deployLambda: true,
    lambdaFunctionProps: {
      code: lambda.Code.asset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_12_X,
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

  expect(stack).toHaveResource('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Action: "dynamodb:ListStreams",
          Effect: "Allow",
          Resource: {
            "Fn::Join": [
              "",
              [
                {
                  "Fn::GetAtt": [
                    "testlambdadynamodbstackDynamoTable8138E93B",
                    "Arn"
                  ]
                },
                "/stream/*"
              ]
            ]
          }
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
        }
      ],
      Version: "2012-10-17"
    },
    PolicyName: "testlambdadynamodbstackLambdaFunctionServiceRoleDefaultPolicy547FB7F4",
    Roles: [
      {
        Ref: "testlambdadynamodbstackLambdaFunctionServiceRole758347A1"
      }
    ]
  });
});

test('check dynamodb table stream override', () => {
  const stack = new cdk.Stack();
  const props: DynamoDBStreamToLambdaProps = {
    deployLambda: true,
    lambdaFunctionProps: {
      code: lambda.Code.asset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_12_X,
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

test('check getter methods', () => {
  const stack = new cdk.Stack();

  const construct: DynamoDBStreamToLambda = deployNewFunc(stack);

  expect(construct.lambdaFunction()).toBeInstanceOf(lambda.Function);
  expect(construct.dynamoTable()).toBeInstanceOf(dynamodb.Table);
});

test('check exception for Missing existingObj from props for deploy = false', () => {
  const stack = new cdk.Stack();

  const props: DynamoDBStreamToLambdaProps = {
    deployLambda: true
  };

  try {
    new DynamoDBStreamToLambda(stack, 'test-iot-lambda-integration', props);
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
  }
});