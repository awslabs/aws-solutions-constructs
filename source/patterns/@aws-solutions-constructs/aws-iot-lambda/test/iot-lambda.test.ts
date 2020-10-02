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
import { IotToLambda, IotToLambdaProps } from "../lib";
import * as lambda from '@aws-cdk/aws-lambda';
import * as cdk from "@aws-cdk/core";
import '@aws-cdk/assert/jest';

function deployNewFunc(stack: cdk.Stack) {
  const props: IotToLambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_10_X,
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

  return new IotToLambda(stack, 'test-iot-lambda-integration', props);
}

function useExistingFunc(stack: cdk.Stack) {

  const lambdaFunctionProps: lambda.FunctionProps = {
      runtime: lambda.Runtime.PYTHON_3_6,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda`)
  };

  const props: IotToLambdaProps = {
      existingLambdaObj: new lambda.Function(stack, 'MyExistingFunction', lambdaFunctionProps),
      iotTopicRuleProps: {
        topicRulePayload: {
            ruleDisabled: false,
            description: "Processing of DTC messages from the AWS Connected Vehicle Solution.",
            sql: "SELECT * FROM 'connectedcar/dtc/#'",
            actions: []
        }
      }
  };

  return new IotToLambda(stack, 'test-iot-lambda-integration', props);
}

test('snapshot test IotToLambda default params', () => {
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
          "testiotlambdaintegrationLambdaFunctionServiceRole27C3EE41",
          "Arn"
        ]
      },
      Runtime: "nodejs10.x"
  });
});

test('check lambda function permission for deploy: true', () => {
    const stack = new cdk.Stack();

    deployNewFunc(stack);

    expect(stack).toHaveResource('AWS::Lambda::Permission', {
        Action: "lambda:InvokeFunction",
        FunctionName: {
          "Fn::GetAtt": [
            "testiotlambdaintegrationLambdaFunctionC5329DBA",
            "Arn"
          ]
        },
        Principal: "iot.amazonaws.com",
        SourceArn: {
          "Fn::GetAtt": [
            "testiotlambdaintegrationIotTopic18B6A735",
            "Arn"
          ]
        }
    });
});

test('check iot lambda function role for deploy: true', () => {
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

test('check iot topic rule properties for deploy: true', () => {
    const stack = new cdk.Stack();

    deployNewFunc(stack);

    expect(stack).toHaveResource('AWS::IoT::TopicRule', {
        TopicRulePayload: {
          Actions: [
            {
              Lambda: {
                FunctionArn: {
                  "Fn::GetAtt": [
                    "testiotlambdaintegrationLambdaFunctionC5329DBA",
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

test('check lambda function permissions for deploy: false', () => {
  const stack = new cdk.Stack();

  useExistingFunc(stack);

  expect(stack).toHaveResource('AWS::Lambda::Permission', {
      Action: "lambda:InvokeFunction",
      FunctionName: {
        "Fn::GetAtt": [
          "MyExistingFunction4D772515",
          "Arn"
        ]
      },
      Principal: "iot.amazonaws.com",
      SourceArn: {
        "Fn::GetAtt": [
          "testiotlambdaintegrationIotTopic18B6A735",
          "Arn"
        ]
      }
    });
});

test('check iot lambda function role for deploy: false', () => {
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

    const construct: IotToLambda = deployNewFunc(stack);

    expect(construct.iotTopicRule !== null);
    expect(construct.lambdaFunction !== null);
});

test('check exception for Missing existingObj from props for deploy = false', () => {
  const stack = new cdk.Stack();

  const props: IotToLambdaProps = {
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
    new IotToLambda(stack, 'test-iot-lambda-integration', props);
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
  }
});

test('check deploy = true and no prop', () => {
  const stack = new cdk.Stack();

  const props: IotToLambdaProps = {
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
    new IotToLambda(stack, 'test-iot-lambda-integration', props);
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
  }
});