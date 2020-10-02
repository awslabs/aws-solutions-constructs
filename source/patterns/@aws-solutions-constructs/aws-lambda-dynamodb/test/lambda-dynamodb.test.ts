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

import { SynthUtils, expect as expectCDK, haveResource } from '@aws-cdk/assert';
import { LambdaToDynamoDB, LambdaToDynamoDBProps } from "../lib";
import * as lambda from '@aws-cdk/aws-lambda';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as cdk from "@aws-cdk/core";
import '@aws-cdk/assert/jest';

function deployNewFunc(stack: cdk.Stack) {
  const props: LambdaToDynamoDBProps = {
    lambdaFunctionProps: {
          code: lambda.Code.fromAsset(`${__dirname}/lambda`),
          runtime: lambda.Runtime.NODEJS_10_X,
          handler: 'index.handler'
    },
  };

  return new LambdaToDynamoDB(stack, 'test-lambda-dynamodb-stack', props);
}

function useExistingFunc(stack: cdk.Stack) {
  const lambdaFunctionProps: lambda.FunctionProps = {
    runtime: lambda.Runtime.PYTHON_3_6,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`)
  };

  const props: LambdaToDynamoDBProps = {
    existingLambdaObj: new lambda.Function(stack, 'MyExistingFunction', lambdaFunctionProps),
    dynamoTableProps: {
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 3,
      writeCapacity: 3,
      partitionKey: {
          name: 'id',
          type: dynamodb.AttributeType.STRING
      }
    },
  };

  return new LambdaToDynamoDB(stack, 'test-lambda-dynamodb-stack', props);
}

test('snapshot test LambdaToDynamoDB default params', () => {
  const stack = new cdk.Stack();
  deployNewFunc(stack);
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('check lambda function properties for deploy: true', () => {
  const stack = new cdk.Stack();

  deployNewFunc(stack);

  expect(stack).toHaveResource('AWS::Lambda::Function', {
    Handler: "index.handler",
    Role: {
      "Fn::GetAtt": [
        "testlambdadynamodbstackLambdaFunctionServiceRole758347A1",
        "Arn"
      ]
    },
    Runtime: "nodejs10.x",
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        DDB_TABLE_NAME: {
        Ref: "testlambdadynamodbstackDynamoTable8138E93B"
        }
      }
    }
  });
});

test('check dynamo table properties for deploy: true', () => {
  const stack = new cdk.Stack();

  deployNewFunc(stack);

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

test('check lambda function role for deploy: true', () => {
  const stack = new cdk.Stack();

  deployNewFunc(stack);

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

test('check lambda function policy default table permissions', () => {
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
          Action: [
            "dynamodb:BatchGetItem",
            "dynamodb:GetRecords",
            "dynamodb:GetShardIterator",
            "dynamodb:Query",
            "dynamodb:GetItem",
            "dynamodb:Scan",
            "dynamodb:BatchWriteItem",
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem"
          ],
          Effect: "Allow",
          Resource: [
            {
              "Fn::GetAtt": [
                "testlambdadynamodbstackDynamoTable8138E93B",
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

test('check lambda function properties for deploy: false', () => {
  const stack = new cdk.Stack();

  useExistingFunc(stack);

  expect(stack).toHaveResource('AWS::Lambda::Function', {
      Handler: "index.handler",
      Role: {
        "Fn::GetAtt": [
          "MyExistingFunctionServiceRoleF9E14BFD",
          "Arn"
        ]
      },
      Runtime: "python3.6"
  });
});

test('check lambda function role for existing function', () => {
  const stack = new cdk.Stack();

  useExistingFunc(stack);

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
    ManagedPolicyArns: [
      {
        "Fn::Join": [
          "",
          [
            "arn:",
            {
              Ref: "AWS::Partition"
            },
            ":iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
          ]
        ]
      }
    ]
  });
});

test('check properties', () => {
  const stack = new cdk.Stack();

  const construct: LambdaToDynamoDB = deployNewFunc(stack);

  expect(construct.lambdaFunction !== null);
  expect(construct.dynamoTable !== null);
});

test('check exception for Missing existingObj from props', () => {
  const stack = new cdk.Stack();

  const props: LambdaToDynamoDBProps = {
  };

  try {
    new LambdaToDynamoDB(stack, 'test-iot-lambda-integration', props);
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
  }
});

test('check for no prop', () => {
  const stack = new cdk.Stack();

  const props: LambdaToDynamoDBProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler'
    }
  };
  new LambdaToDynamoDB(stack, 'test-iot-lambda-stack', props);

  expect(stack).toHaveResource('AWS::Lambda::Function', {
    Handler: "index.handler",
    Role: {
      "Fn::GetAtt": [
        "testiotlambdastackLambdaFunctionServiceRoleF72A85A9",
        "Arn"
      ]
    },
    Runtime: "nodejs10.x",
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        DDB_TABLE_NAME: {
          Ref: "testiotlambdastackDynamoTable76858356"
        }
      }
    }
  });
});

test('check lambda function policy ReadOnly table permissions', () => {
  const stack = new cdk.Stack();

  const props: LambdaToDynamoDBProps = {
    lambdaFunctionProps: {
          code: lambda.Code.fromAsset(`${__dirname}/lambda`),
          runtime: lambda.Runtime.NODEJS_10_X,
          handler: 'index.handler'
    },
    tablePermissions: 'Read'
  };

  new LambdaToDynamoDB(stack, 'test-lambda-dynamodb-stack', props);

  expectCDK(stack).to(haveResource('AWS::IAM::Policy', {
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
            "dynamodb:Scan"
          ],
          Effect: "Allow",
          Resource: [
            {
              "Fn::GetAtt": [
                "testlambdadynamodbstackDynamoTable8138E93B",
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
  }));

});

test('check lambda function policy WriteOnly table permissions', () => {
  const stack = new cdk.Stack();

  const props: LambdaToDynamoDBProps = {
    lambdaFunctionProps: {
          code: lambda.Code.fromAsset(`${__dirname}/lambda`),
          runtime: lambda.Runtime.NODEJS_10_X,
          handler: 'index.handler'
    },
    tablePermissions: 'Write'
  };

  new LambdaToDynamoDB(stack, 'test-lambda-dynamodb-stack', props);

  expectCDK(stack).to(haveResource('AWS::IAM::Policy', {
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
            "dynamodb:BatchWriteItem",
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem"
          ],
          Effect: "Allow",
          Resource: [
            {
              "Fn::GetAtt": [
                "testlambdadynamodbstackDynamoTable8138E93B",
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
  }));

});

test('check lambda function policy ReadWrite table permissions', () => {
  const stack = new cdk.Stack();

  const props: LambdaToDynamoDBProps = {
    lambdaFunctionProps: {
          code: lambda.Code.fromAsset(`${__dirname}/lambda`),
          runtime: lambda.Runtime.NODEJS_10_X,
          handler: 'index.handler'
    },
    tablePermissions: 'ReadWrite'
  };

  new LambdaToDynamoDB(stack, 'test-lambda-dynamodb-stack', props);

  expectCDK(stack).to(haveResource('AWS::IAM::Policy', {
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
            "dynamodb:BatchWriteItem",
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem"
          ],
          Effect: "Allow",
          Resource: [
            {
              "Fn::GetAtt": [
                "testlambdadynamodbstackDynamoTable8138E93B",
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
  }));

});

test('check lambda function policy All table permissions', () => {
  const stack = new cdk.Stack();

  const props: LambdaToDynamoDBProps = {
    lambdaFunctionProps: {
          code: lambda.Code.fromAsset(`${__dirname}/lambda`),
          runtime: lambda.Runtime.NODEJS_10_X,
          handler: 'index.handler'
    },
    tablePermissions: 'All'
  };

  new LambdaToDynamoDB(stack, 'test-lambda-dynamodb-stack', props);

  expectCDK(stack).to(haveResource('AWS::IAM::Policy', {
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
          Action: "dynamodb:*",
          Effect: "Allow",
          Resource: [
            {
              "Fn::GetAtt": [
                "testlambdadynamodbstackDynamoTable8138E93B",
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
  }));

});
