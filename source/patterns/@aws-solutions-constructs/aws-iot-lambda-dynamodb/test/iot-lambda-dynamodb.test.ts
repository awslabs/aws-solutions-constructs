/**
 *  CopyrightAmazon.com, Inc. or its affiliates. All Rights Reserved.
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

import { IotToLambdaToDynamoDB, IotToLambdaToDynamoDBProps } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from "aws-cdk-lib";
import '@aws-cdk/assert/jest';

function deployStack(stack: cdk.Stack) {
  const props: IotToLambdaToDynamoDBProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "Processing of DTC messages from the AWS Connected Vehicle Solution.",
        sql: "SELECT * FROM 'connectedcar/dtc/#'",
        actions: []
      }
    }
  };

  return new IotToLambdaToDynamoDB(stack, 'test-iot-lambda-dynamodb-stack', props);
}

test('check lambda function properties', () => {
  const stack = new cdk.Stack();

  deployStack(stack);

  expect(stack).toHaveResource('AWS::Lambda::Function', {
    Handler: "index.handler",
    Role: {
      "Fn::GetAtt": [
        "testiotlambdadynamodbstackIotToLambdaLambdaFunctionServiceRoleC57F7FDA",
        "Arn"
      ]
    },
    Runtime: "nodejs14.x",
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        DDB_TABLE_NAME: {
          Ref: "testiotlambdadynamodbstackLambdaToDynamoDBDynamoTableE17E5733"
        }
      }
    }
  });
});

test('check lambda function permission', () => {
  const stack = new cdk.Stack();

  deployStack(stack);

  expect(stack).toHaveResource('AWS::Lambda::Permission', {
    Action: "lambda:InvokeFunction",
    FunctionName: {
      "Fn::GetAtt": [
        "testiotlambdadynamodbstackIotToLambdaLambdaFunctionDFEAF894",
        "Arn"
      ]
    },
    Principal: "iot.amazonaws.com",
    SourceArn: {
      "Fn::GetAtt": [
        "testiotlambdadynamodbstackIotToLambdaIotTopic74F5E3BB",
        "Arn"
      ]
    }
  });
});

test('check iot lambda function role', () => {
  const stack = new cdk.Stack();

  deployStack(stack);

  expect(stack).toHaveResource('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: "sts:AssumeRole",
          Effect: "Allow",
          Principal: {
            Service: "lambda.amazonaws.com"
          }
        }
      ],
      Version: "2012-10-17"
    },
    Policies: [
      {
        PolicyDocument: {
          Statement: [
            {
              Action: [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
              ],
              Effect: "Allow",
              Resource: {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      Ref: "AWS::Partition"
                    },
                    ":logs:",
                    {
                      Ref: "AWS::Region"
                    },
                    ":",
                    {
                      Ref: "AWS::AccountId"
                    },
                    ":log-group:/aws/lambda/*"
                  ]
                ]
              }
            }
          ],
          Version: "2012-10-17"
        },
        PolicyName: "LambdaFunctionServiceRolePolicy"
      }
    ]
  });
});

test('check iot topic rule properties', () => {
  const stack = new cdk.Stack();

  deployStack(stack);

  expect(stack).toHaveResource('AWS::IoT::TopicRule', {
    TopicRulePayload: {
      Actions: [
        {
          Lambda: {
            FunctionArn: {
              "Fn::GetAtt": [
                "testiotlambdadynamodbstackIotToLambdaLambdaFunctionDFEAF894",
                "Arn"
              ]
            }
          }
        }
      ],
      Description: "Processing of DTC messages from the AWS Connected Vehicle Solution.",
      RuleDisabled: false,
      Sql: "SELECT * FROM 'connectedcar/dtc/#'"
    }
  });

});

test('check dynamo table properties', () => {
  const stack = new cdk.Stack();

  deployStack(stack);

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
    }
  });
});

test('check lambda function policy ', () => {
  const stack = new cdk.Stack();

  deployStack(stack);

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
          Action: [
            "dynamodb:BatchGetItem",
            "dynamodb:GetRecords",
            "dynamodb:GetShardIterator",
            "dynamodb:Query",
            "dynamodb:GetItem",
            "dynamodb:Scan",
            "dynamodb:ConditionCheckItem",
            "dynamodb:BatchWriteItem",
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem",
            "dynamodb:DescribeTable"
          ],
          Effect: "Allow",
          Resource: [
            {
              "Fn::GetAtt": [
                "testiotlambdadynamodbstackLambdaToDynamoDBDynamoTableE17E5733",
                "Arn"
              ]
            },
            {
              Ref: "AWS::NoValue"
            }
          ]
        }
      ],
      Version: "2012-10-17"
    }
  });

});

test('check properties', () => {
  const stack = new cdk.Stack();

  const construct: IotToLambdaToDynamoDB = deployStack(stack);

  expect(construct.lambdaFunction !== null);
  expect(construct.dynamoTable !== null);
  expect(construct.iotTopicRule !== null);
});

test('check exception for Missing existingObj from props for deploy = false', () => {
  const stack = new cdk.Stack();

  const props: IotToLambdaToDynamoDBProps = {
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "Processing of DTC messages from the AWS Connected Vehicle Solution.",
        sql: "SELECT * FROM 'connectedcar/dtc/#'",
        actions: []
      }
    }
  };

  try {
    new IotToLambdaToDynamoDB(stack, 'test-iot-lambda-integration', props);
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
  }
});

test('Check incorrect table permission', () => {
  const stack = new cdk.Stack();

  const props: IotToLambdaToDynamoDBProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler'
    },
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "Processing of DTC messages from the AWS Connected Vehicle Solution.",
        sql: "SELECT * FROM 'connectedcar/dtc/#'",
        actions: []
      }
    },
    tablePermissions: 'Reed'
  };

  const app = () => {
    new IotToLambdaToDynamoDB(stack, 'test-iot-lambda-dynamodb-stack', props);
  };

  // Assertion
  expect(app).toThrowError(/Invalid table permission submitted - Reed/);
});