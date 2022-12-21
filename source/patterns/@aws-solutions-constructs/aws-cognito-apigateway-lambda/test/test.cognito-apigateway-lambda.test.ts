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

import { CognitoToApiGatewayToLambda, CognitoToApiGatewayToLambdaProps } from "../lib";
import * as cdk from "aws-cdk-lib";
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as api from 'aws-cdk-lib/aws-apigateway';
import '@aws-cdk/assert/jest';

function deployNewFunc(stack: cdk.Stack) {
  const lambdaFunctionProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: 'index.handler'
  };

  return   new CognitoToApiGatewayToLambda(stack, 'test-cognito-apigateway-lambda', {
    lambdaFunctionProps
  });
}

test('override cognito properties', () => {
  const stack = new cdk.Stack();

  const lambdaFunctionProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_14_X,
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
    runtime: lambda.Runtime.NODEJS_14_X,
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
      "ALLOW_USER_SRP_AUTH",
      "ALLOW_REFRESH_TOKEN_AUTH"
    ],
  });
});

test('Check for default Cognito Auth Type', () => {
  const stack = new cdk.Stack();

  const lambdaFunctionProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: 'index.handler'
  };

  new CognitoToApiGatewayToLambda(stack, 'test-cognito-apigateway-lambda', {
    lambdaFunctionProps
  });

  expect(stack).toHaveResource('AWS::ApiGateway::Method', {
    ResourceId: {
      "Fn::GetAtt": [
        "testcognitoapigatewaylambdaLambdaRestApi2E272431",
        "RootResourceId"
      ]
    },
    AuthorizationType: "COGNITO_USER_POOLS",
    AuthorizerId: {
      Ref: "testcognitoapigatewaylambdaCognitoAuthorizer170CACC9"
    },
  });

  expect(stack).toHaveResource('AWS::ApiGateway::Method', {
    ResourceId: {
      Ref: "testcognitoapigatewaylambdaLambdaRestApiproxy23E1DA20"
    },
    AuthorizationType: "COGNITO_USER_POOLS",
    AuthorizerId: {
      Ref: "testcognitoapigatewaylambdaCognitoAuthorizer170CACC9"
    },
  });

});

test('override Auth Type to COGNITO', () => {
  const stack = new cdk.Stack();

  const lambdaFunctionProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: 'index.handler'
  };

  new CognitoToApiGatewayToLambda(stack, 'test-cognito-apigateway-lambda', {
    lambdaFunctionProps,
    apiGatewayProps: {
      defaultMethodOptions: {
        authorizationType: api.AuthorizationType.COGNITO
      }
    }
  });

  expect(stack).toHaveResource('AWS::ApiGateway::Method', {
    ResourceId: {
      "Fn::GetAtt": [
        "testcognitoapigatewaylambdaLambdaRestApi2E272431",
        "RootResourceId"
      ]
    },
    AuthorizationType: "COGNITO_USER_POOLS",
    AuthorizerId: {
      Ref: "testcognitoapigatewaylambdaCognitoAuthorizer170CACC9"
    },
  });

  expect(stack).toHaveResource('AWS::ApiGateway::Method', {
    ResourceId: {
      Ref: "testcognitoapigatewaylambdaLambdaRestApiproxy23E1DA20"
    },
    AuthorizationType: "COGNITO_USER_POOLS",
    AuthorizerId: {
      Ref: "testcognitoapigatewaylambdaCognitoAuthorizer170CACC9"
    },
  });

});

test('Try to override Auth Type to NONE', () => {
  const stack = new cdk.Stack();

  const lambdaFunctionProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: 'index.handler'
  };

  new CognitoToApiGatewayToLambda(stack, 'test-cognito-apigateway-lambda', {
    lambdaFunctionProps,
    apiGatewayProps: {
      defaultMethodOptions: {
        authorizationType: api.AuthorizationType.NONE
      }
    }
  });

  expect(stack).toHaveResource('AWS::ApiGateway::Method', {
    ResourceId: {
      "Fn::GetAtt": [
        "testcognitoapigatewaylambdaLambdaRestApi2E272431",
        "RootResourceId"
      ]
    },
    AuthorizationType: "COGNITO_USER_POOLS",
    AuthorizerId: {
      Ref: "testcognitoapigatewaylambdaCognitoAuthorizer170CACC9"
    },
  });

  expect(stack).toHaveResource('AWS::ApiGateway::Method', {
    ResourceId: {
      Ref: "testcognitoapigatewaylambdaLambdaRestApiproxy23E1DA20"
    },
    AuthorizationType: "COGNITO_USER_POOLS",
    AuthorizerId: {
      Ref: "testcognitoapigatewaylambdaCognitoAuthorizer170CACC9"
    },
  });

});

test('Override apiGatewayProps', () => {
  const stack = new cdk.Stack();

  const lambdaFunctionProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: 'index.handler'
  };

  new CognitoToApiGatewayToLambda(stack, 'test-cognito-apigateway-lambda', {
    lambdaFunctionProps,
    apiGatewayProps: {
      defaultMethodOptions: {
        operationName: 'foo-bar'
      }
    }
  });

  expect(stack).toHaveResource('AWS::ApiGateway::Method', {
    OperationName: "foo-bar",
    ResourceId: {
      "Fn::GetAtt": [
        "testcognitoapigatewaylambdaLambdaRestApi2E272431",
        "RootResourceId"
      ]
    },
    AuthorizationType: "COGNITO_USER_POOLS",
    AuthorizerId: {
      Ref: "testcognitoapigatewaylambdaCognitoAuthorizer170CACC9"
    },
  });

  expect(stack).toHaveResource('AWS::ApiGateway::Method', {
    OperationName: "foo-bar",
    ResourceId: {
      Ref: "testcognitoapigatewaylambdaLambdaRestApiproxy23E1DA20"
    },
    AuthorizationType: "COGNITO_USER_POOLS",
    AuthorizerId: {
      Ref: "testcognitoapigatewaylambdaCognitoAuthorizer170CACC9"
    },
  });

});

test('Override apiGatewayProps to support CORS', () => {
  const stack = new cdk.Stack();

  const lambdaFunctionProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: 'index.handler'
  };

  new CognitoToApiGatewayToLambda(stack, 'test-cognito-apigateway-lambda', {
    lambdaFunctionProps,
    apiGatewayProps: {
      defaultCorsPreflightOptions: {
        allowOrigins: api.Cors.ALL_ORIGINS,
        allowMethods: api.Cors.ALL_METHODS
      }
    }
  });

  expect(stack).toHaveResource('AWS::ApiGateway::Method', {
    HttpMethod: "ANY",
    ResourceId: {
      "Fn::GetAtt": [
        "testcognitoapigatewaylambdaLambdaRestApi2E272431",
        "RootResourceId"
      ]
    },
    AuthorizationType: "COGNITO_USER_POOLS",
    AuthorizerId: {
      Ref: "testcognitoapigatewaylambdaCognitoAuthorizer170CACC9"
    },
  });

  expect(stack).toHaveResource('AWS::ApiGateway::Method', {
    HttpMethod: "ANY",
    ResourceId: {
      Ref: "testcognitoapigatewaylambdaLambdaRestApiproxy23E1DA20"
    },
    AuthorizationType: "COGNITO_USER_POOLS",
    AuthorizerId: {
      Ref: "testcognitoapigatewaylambdaCognitoAuthorizer170CACC9"
    },
  });

  expect(stack).toHaveResource('AWS::ApiGateway::Method', {
    HttpMethod: "OPTIONS",
    ResourceId: {
      "Fn::GetAtt": [
        "testcognitoapigatewaylambdaLambdaRestApi2E272431",
        "RootResourceId"
      ]
    },
    AuthorizationType: "NONE"
  });

  expect(stack).toHaveResource('AWS::ApiGateway::Method', {
    HttpMethod: "OPTIONS",
    ResourceId: {
      Ref: "testcognitoapigatewaylambdaLambdaRestApiproxy23E1DA20"
    },
    AuthorizationType: "NONE"
  });

});

test('Override apiGatewayProps with proxy = false and add POST method', () => {
  const stack = new cdk.Stack();

  const lambdaFunctionProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: 'index.handler'
  };

  const c = new CognitoToApiGatewayToLambda(stack, 'test-cognito-apigateway-lambda', {
    lambdaFunctionProps,
    apiGatewayProps: {
      proxy: false
    }
  });

  const r = c.apiGateway.root.addResource('foo');
  r.addMethod('POST');

  // Super imporant to call this method to Apply the Cognito Authorizers
  c.addAuthorizers();

  expect(stack).toHaveResource('AWS::ApiGateway::Method', {
    HttpMethod: "POST",
    ResourceId: {
      Ref: "testcognitoapigatewaylambdaLambdaRestApifoo89ACA437"
    },
    AuthorizationType: "COGNITO_USER_POOLS",
    AuthorizerId: {
      Ref: "testcognitoapigatewaylambdaCognitoAuthorizer170CACC9"
    },
  });

  expect(stack).toHaveResource('AWS::ApiGateway::Resource', {
    PathPart: "foo",
  });
});

test('Override apiGatewayProps with proxy = false and add OPTIONS method', () => {
  const stack = new cdk.Stack();

  const lambdaFunctionProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: 'index.handler'
  };

  const c = new CognitoToApiGatewayToLambda(stack, 'test-cognito-apigateway-lambda', {
    lambdaFunctionProps,
    apiGatewayProps: {
      proxy: false
    }
  });

  const r = c.apiGateway.root.addResource('foo');
  r.addMethod('OPTIONS');

  // Mandatory to call this method to Apply the Cognito Authorizers
  c.addAuthorizers();

  expect(stack).toHaveResource('AWS::ApiGateway::Method', {
    HttpMethod: "OPTIONS",
    ResourceId: {
      Ref: "testcognitoapigatewaylambdaLambdaRestApifoo89ACA437"
    },
    AuthorizationType: "NONE",
  });

  expect(stack).toHaveResource('AWS::ApiGateway::Resource', {
    PathPart: "foo",
  });
});