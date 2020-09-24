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
import { CognitoToApiGatewayToLambda, CognitoToApiGatewayToLambdaProps } from "../lib";
import * as cdk from "@aws-cdk/core";
import * as cognito from '@aws-cdk/aws-cognito';
import * as lambda from '@aws-cdk/aws-lambda';
import '@aws-cdk/assert/jest';

function deployNewFunc(stack: cdk.Stack) {
  const lambdaFunctionProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_10_X,
    handler: 'index.handler'
  };

  return   new CognitoToApiGatewayToLambda(stack, 'test-cognito-apigateway-lambda', {
    lambdaFunctionProps
  });
}

test('snapshot test CognitoToApiGatewayToLambda default params', () => {
  const stack = new cdk.Stack();
  deployNewFunc(stack);
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('override cognito properties', () => {
  const stack = new cdk.Stack();

  const lambdaFunctionProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_12_X,
    handler: 'index.handler'
  };

  const cognitoUserPoolProps: cognito.UserPoolProps = {
    userPoolName: 'test',
    userVerification: {}
  };

  new CognitoToApiGatewayToLambda(stack, 'test-cognito-apigateway-lambda', {
    lambdaFunctionProps,
    cognitoUserPoolProps
  });

  expect(stack).toHaveResource('AWS::Cognito::UserPool',
  {
    AdminCreateUserConfig: {
      AllowAdminCreateUserOnly: true
    },
    EmailVerificationMessage: "The verification code to your new account is {####}",
    EmailVerificationSubject: "Verify your new account",
    SmsVerificationMessage: "The verification code to your new account is {####}",
    UserPoolAddOns: {
      AdvancedSecurityMode: "ENFORCED"
    },
    UserPoolName: "test",
    VerificationMessageTemplate: {
      DefaultEmailOption: "CONFIRM_WITH_CODE",
      EmailMessage: "The verification code to your new account is {####}",
      EmailSubject: "Verify your new account",
      SmsMessage: "The verification code to your new account is {####}"
    }
  });
});

test('check exception for Missing existingObj from props', () => {
  const stack = new cdk.Stack();

  const props: CognitoToApiGatewayToLambdaProps = {
  };

  try {
    new CognitoToApiGatewayToLambda(stack, 'test-cognito-apigateway-lambda', props);
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
  }
});

test('check properties', () => {
  const stack = new cdk.Stack();

  const construct: CognitoToApiGatewayToLambda = deployNewFunc(stack);

  expect(construct.userPool !== null);
  expect(construct.userPoolClient !== null);
  expect(construct.apiGateway !== null);
  expect(construct.lambdaFunction !== null);
  expect(construct.apiGatewayCloudWatchRole !== null);
  expect(construct.apiGatewayLogGroup !== null);
  expect(construct.apiGatewayAuthorizer !== null);
});

test('override cognito cognitoUserPoolClientProps', () => {
  const stack = new cdk.Stack();

  const lambdaFunctionProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_12_X,
    handler: 'index.handler'
  };

  const cognitoUserPoolClientProps = {
    authFlows: {
      userSrp: true
    }
  };

  new CognitoToApiGatewayToLambda(stack, 'test-cognito-apigateway-lambda', {
    lambdaFunctionProps,
    cognitoUserPoolClientProps
  });

  expect(stack).toHaveResource('AWS::Cognito::UserPoolClient', {
    ExplicitAuthFlows: [
      "ALLOW_USER_SRP_AUTH"
    ],
  });
});