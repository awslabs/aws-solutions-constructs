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

import { SynthUtils, ResourcePart } from '@aws-cdk/assert';
import { Stack } from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as defaults from '../index';
import '@aws-cdk/assert/jest';
import { Duration } from '@aws-cdk/core';

test('snapshot test LambdaFunction default params', () => {
    const stack = new Stack();

    const lambdaFunctionProps: lambda.FunctionProps = {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: lambda.Code.asset(`${__dirname}/lambda`)
    };

    defaults.deployLambdaFunction(stack, lambdaFunctionProps);

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('test FunctionProps override code and runtime', () => {
    const stack = new Stack();

    const inProps: lambda.FunctionProps = {
        code: lambda.Code.asset(`${__dirname}/lambda-test`),
        runtime: lambda.Runtime.PYTHON_3_6,
        handler: 'index.handler'
    };

    defaults.deployLambdaFunction(stack, inProps);

    expect(stack).toHaveResource('AWS::Lambda::Function', {
        Handler: "index.handler",
        Role: {
          "Fn::GetAtt": [
            "LambdaFunctionServiceRole0C4CDE0B",
            "Arn"
          ]
        },
        Runtime: "python3.6"
    });
});

test('test FunctionProps override timeout', () => {
    const stack = new Stack();

    const inProps: lambda.FunctionProps = {
        code: lambda.Code.asset(`${__dirname}/lambda`),
        runtime: lambda.Runtime.NODEJS_12_X,
        handler: 'index.handler',
        timeout: Duration.seconds(5),
    };

    defaults.deployLambdaFunction(stack, inProps);

    expect(stack).toHaveResource('AWS::Lambda::Function', {
        Handler: "index.handler",
        Role: {
          "Fn::GetAtt": [
            "LambdaFunctionServiceRole0C4CDE0B",
            "Arn"
          ]
        },
        Runtime: "nodejs12.x",
        Timeout: 5
    });
});

test('test FunctionProps for envrionment variable when runtime = NODEJS', () => {
  const stack = new Stack();

  const inProps: lambda.FunctionProps = {
      code: lambda.Code.asset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler'
  };

  defaults.deployLambdaFunction(stack, inProps);

  expect(stack).toHaveResource('AWS::Lambda::Function', {
    Handler: "index.handler",
    Role: {
      "Fn::GetAtt": [
        "LambdaFunctionServiceRole0C4CDE0B",
        "Arn"
      ]
    },
    Runtime: "nodejs10.x",
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1'
      }
    }
  });

});

test('test FunctionProps for no envrionment variable when runtime = PYTHON', () => {
  const stack = new Stack();

  const inProps: lambda.FunctionProps = {
    code: lambda.Code.asset(`${__dirname}/lambda-test`),
    runtime: lambda.Runtime.PYTHON_3_6,
    handler: 'index.handler'
  };

  defaults.deployLambdaFunction(stack, inProps);

  expect(stack).toHaveResource('AWS::Lambda::Function', {
    Type: "AWS::Lambda::Function",
    Properties: {
      Code: {
        S3Bucket: {
          Ref: "AssetParametersb472c1cea6f4795d84eb1b97e37bfa1f79f1c744caebeb372f30dbf716299895S3Bucket0A3514D6"
        },
        S3Key: {
          "Fn::Join": [
            "",
            [
              {
                "Fn::Select": [
                  0,
                  {
                    "Fn::Split": [
                      "||",
                      {
                        Ref: "AssetParametersb472c1cea6f4795d84eb1b97e37bfa1f79f1c744caebeb372f30dbf716299895S3VersionKey0DB6BEDE"
                      }
                    ]
                  }
                ]
              },
              {
                "Fn::Select": [
                  1,
                  {
                    "Fn::Split": [
                      "||",
                      {
                        Ref: "AssetParametersb472c1cea6f4795d84eb1b97e37bfa1f79f1c744caebeb372f30dbf716299895S3VersionKey0DB6BEDE"
                      }
                    ]
                  }
                ]
              }
            ]
          ]
        }
      },
      Handler: "index.handler",
      Role: {
        "Fn::GetAtt": [
          "LambdaFunctionServiceRole0C4CDE0B",
          "Arn"
        ]
      },
      Runtime: "python3.6",
      TracingConfig: {
        Mode: "Active"
      }
    },
    DependsOn: [
      "LambdaFunctionServiceRoleDefaultPolicy126C8897",
      "LambdaFunctionServiceRole0C4CDE0B"
    ]
  }, ResourcePart.CompleteDefinition);

});

test('test buildLambdaFunction with deploy = true', () => {
  const stack = new Stack();

  const inProps: lambda.FunctionProps = {
    code: lambda.Code.asset(`${__dirname}/lambda-test`),
    runtime: lambda.Runtime.NODEJS_12_X,
    handler: 'index.handler'
  };

  defaults.buildLambdaFunction(stack, {
    lambdaFunctionProps: inProps
  });

  expect(stack).toHaveResource('AWS::Lambda::Function', {
    Handler: "index.handler",
    Role: {
      "Fn::GetAtt": [
        "LambdaFunctionServiceRole0C4CDE0B",
        "Arn"
      ]
    },
    Runtime: "nodejs12.x"
  });
});

test('test buildLambdaFunction with FunctionProps', () => {
  const stack = new Stack();

  const inProps: lambda.FunctionProps = {
    code: lambda.Code.asset(`${__dirname}/lambda-test`),
    runtime: lambda.Runtime.PYTHON_3_6,
    handler: 'index.handler'
  };

  defaults.deployLambdaFunction(stack, inProps);

  expect(stack).toHaveResource('AWS::Lambda::Function', {
    Handler: "index.handler",
    Role: {
      "Fn::GetAtt": [
        "LambdaFunctionServiceRole0C4CDE0B",
        "Arn"
      ]
    },
    Runtime: "python3.6"
  });
});

test('test exception', () => {
  const stack = new Stack();

  try {
    defaults.buildLambdaFunction(stack, {});
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
  }
});
