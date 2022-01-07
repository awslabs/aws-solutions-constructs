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

import { ResourcePart } from '@aws-cdk/assert';
import { Stack } from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as api from '@aws-cdk/aws-apigateway';
import * as iam from '@aws-cdk/aws-iam';
import * as defaults from '../index';
import '@aws-cdk/assert/jest';

function deployRegionalApiGateway(stack: Stack) {
  const lambdaFunctionProps: lambda.FunctionProps = {
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`)
  };

  const fn = defaults.deployLambdaFunction(stack, lambdaFunctionProps);

  return defaults.RegionalLambdaRestApi(stack, fn);
}

function setupRestApi(stack: Stack, apiProps?: any): void {
  const [restApi] = defaults.GlobalRestApi(stack, apiProps);
  // Setup the API Gateway resource
  const apiGatewayResource = restApi.root.addResource('api-gateway-resource');
  // Setup the API Gateway Integration
  const apiGatewayIntegration = new api.AwsIntegration({
    service: "sqs",
    integrationHttpMethod: "POST",
    options: {
      passthroughBehavior: api.PassthroughBehavior.NEVER,
      requestParameters: {
        "integration.request.header.Content-Type": "'application/x-www-form-urlencoded'"
      },
      requestTemplates: {
        "application/x-www-form-urlencoded": "Action=SendMessage&MessageBody=$util.urlEncode(\"$input.body\")&MessageAttribute.1.Name=queryParam1&MessageAttribute.1.Value.StringValue=$input.params(\"query_param_1\")&MessageAttribute.1.Value.DataType=String"
      },
      integrationResponses: [
        {
          statusCode: "200",
          responseTemplates: {
            "text/html": "Success"
          }
        },
        {
          statusCode: "500",
          responseTemplates: {
            "text/html": "Error"
          },
          selectionPattern: "500"
        }
      ]
    },
    path: '11112222' + "/" + 'thisqueuequeueName'
  });
  // Setup the API Gateway method(s)
  apiGatewayResource.addMethod('POST', apiGatewayIntegration, {
    requestParameters: {
      "method.request.querystring.query_param_1": true
    },
    methodResponses: [
      {
        statusCode: "200",
        responseParameters: {
          "method.response.header.Content-Type": true
        }
      },
      {
        statusCode: "500",
        responseParameters: {
          "method.response.header.Content-Type": true
        },
      }
    ]
  });
}

test('Test override for RegionalApiGateway', () => {
  const stack = new Stack();

  const lambdaFunctionProps: lambda.FunctionProps = {
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`)
  };

  const fn = defaults.deployLambdaFunction(stack, lambdaFunctionProps);

  defaults.RegionalLambdaRestApi(stack, fn, {
    handler: fn,
    description: 'Hello World'
  });

  expect(stack).toHaveResource('AWS::ApiGateway::RestApi', {
    Type: "AWS::ApiGateway::RestApi",
    Properties: {
      Description: "Hello World",
      EndpointConfiguration: {
        Types: [
          "REGIONAL"
        ]
      },
      Name: "LambdaRestApi"
    }
  }, ResourcePart.CompleteDefinition);
});

test('Test override for GlobalApiGateway', () => {
  const stack = new Stack();

  const lambdaFunctionProps: lambda.FunctionProps = {
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`)
  };

  const fn = defaults.deployLambdaFunction(stack, lambdaFunctionProps);

  defaults.GlobalLambdaRestApi(stack, fn, {
    handler: fn,
    restApiName: "HelloWorld"
  });

  expect(stack).toHaveResource('AWS::ApiGateway::RestApi', {
    Type: "AWS::ApiGateway::RestApi",
    Properties: {
      EndpointConfiguration: {
        Types: [
          "EDGE"
        ]
      },
      Name: "HelloWorld"
    }
  }, ResourcePart.CompleteDefinition);
});

test('Test ApiGateway::Account resource for RegionalApiGateway', () => {
  const stack = new Stack();
  const lambdaFunctionProps: lambda.FunctionProps = {
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`)
  };

  const fn = defaults.deployLambdaFunction(stack, lambdaFunctionProps);

  defaults.RegionalLambdaRestApi(stack, fn);

  expect(stack).toHaveResource('AWS::ApiGateway::Account', {
    CloudWatchRoleArn: {
      "Fn::GetAtt": [
        "LambdaRestApiCloudWatchRoleF339D4E6",
        "Arn"
      ]
    }
  });
});

test('Test ApiGateway::Account resource for GlobalApiGateway', () => {
  const stack = new Stack();
  const lambdaFunctionProps: lambda.FunctionProps = {
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`)
  };

  const fn = defaults.deployLambdaFunction(stack, lambdaFunctionProps);

  defaults.GlobalLambdaRestApi(stack, fn);

  expect(stack).toHaveResource('AWS::ApiGateway::Account', {
    CloudWatchRoleArn: {
      "Fn::GetAtt": [
        "LambdaRestApiCloudWatchRoleF339D4E6",
        "Arn"
      ]
    }
  });
});

test('Test default RestApi deployment w/ ApiGatewayProps', () => {
  const stack = new Stack();
  setupRestApi(stack, {
    restApiName: "customRestApi"
  });

  expect(stack).toHaveResource('AWS::ApiGateway::RestApi', {
    Name: "customRestApi"
  });
});

test('Test default RestApi deployment w/ cloudWatchRole set to false', () => {
  const stack = new Stack();
  setupRestApi(stack, {
    cloudWatchRole: false
  });

  expect(stack).not.toHaveResourceLike("AWS::ApiGateway::Account", {});
});

test('Test default RestApi deployment for Cloudwatch loggroup', () => {
  const stack = new Stack();
  deployRegionalApiGateway(stack);

  expect(stack).toHaveResource('AWS::Logs::LogGroup', {
    UpdateReplacePolicy: "Retain",
    DeletionPolicy: "Retain"
  }, ResourcePart.CompleteDefinition);

  expect(stack).toHaveResource('AWS::ApiGateway::Stage', {
    AccessLogSetting: {
      DestinationArn: {
        "Fn::GetAtt": [
          "ApiAccessLogGroupCEA70788",
          "Arn"
        ]
      },
      Format: "{\"requestId\":\"$context.requestId\",\"ip\":\"$context.identity.sourceIp\",\"user\":\"$context.identity.user\",\"caller\":\"$context.identity.caller\",\"requestTime\":\"$context.requestTime\",\"httpMethod\":\"$context.httpMethod\",\"resourcePath\":\"$context.resourcePath\",\"status\":\"$context.status\",\"protocol\":\"$context.protocol\",\"responseLength\":\"$context.responseLength\"}",
    },
  });
});

test('Test addMethodToApiResource with action', () => {
  const stack = new Stack();
  const [restApi] = defaults.GlobalRestApi(stack);

  // Setup the API Gateway role
  const apiGatewayRole = new iam.Role(stack, 'api-gateway-role', {
    assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com')
  });

  // Setup the API Gateway resource
  const apiGatewayResource = restApi.root.addResource('api-gateway-resource');
  const getRequestTemplate = "{}";

  // Add Method
  defaults.addProxyMethodToApiResource({
    action: "Query",
    service: "dynamodb",
    apiResource: apiGatewayResource,
    apiGatewayRole,
    apiMethod: "GET",
    requestTemplate: getRequestTemplate
  });

  // Add Method
  defaults.addProxyMethodToApiResource({
    path: '11112222' + "/" + 'thisqueuequeueName',
    service: "sqs",
    apiResource: apiGatewayResource,
    apiGatewayRole,
    apiMethod: "PUT",
    requestTemplate: getRequestTemplate
  });

  // Error scenario: missing action and path
  try {
    defaults.addProxyMethodToApiResource({
      service: "sqs",
      apiResource: apiGatewayResource,
      apiGatewayRole,
      apiMethod: "DELETE",
      requestTemplate: getRequestTemplate
    });
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
  }
});

test('Test default RestApi w/ request model and validator', () => {
  const stack = new Stack();
  const [restApi] = defaults.GlobalRestApi(stack);

  // Setup the API Gateway role
  const apiGatewayRole = new iam.Role(stack, 'api-gateway-role', {
    assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com')
  });

  // Setup the API Gateway resource
  const apiGatewayResource = restApi.root.addResource('api-gateway-resource');

  const validator = restApi.addRequestValidator('default-validator', {
    requestValidatorName: 'default-validator',
    validateRequestBody: true
  });

  defaults.addProxyMethodToApiResource({
    service: "kinesis",
    action: "PutRecord",
    apiGatewayRole,
    apiMethod: 'POST',
    apiResource: apiGatewayResource,
    requestTemplate: "{}",
    contentType: "'x-amz-json-1.1'",
    requestValidator: validator,
    requestModel: { "application/json": api.Model.EMPTY_MODEL }
  });

  expect(stack).toHaveResource('AWS::ApiGateway::RequestValidator', {
    Name: "default-validator",
    ValidateRequestBody: true
  });

  expect(stack).toHaveResourceLike('AWS::ApiGateway::Method', {
    RequestModels: { "application/json": "Empty" }
  });
});

// -----------------------------------------------------------------------
// Test for Regional ApiGateway Creation
// -----------------------------------------------------------------------
test('Test for RegionalRestApiGateway', () => {
  const stack = new Stack();

  const [regionalApi] = defaults.RegionalRestApi(stack, {
    restApiName: "HelloWorld-RegionalApi"
  });
  // Setup the API Gateway role
  const apiGatewayRole = new iam.Role(stack, 'api-gateway-role', {
    assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com')
  });

  // Setup the API Gateway resource
  const apiGatewayResource = regionalApi.root.addResource('hello');

  defaults.addProxyMethodToApiResource(
    {
      service: 'iotdata',
      path: 'hello',
      apiGatewayRole,
      apiMethod: 'POST',
      apiResource: apiGatewayResource,
      requestTemplate: "$input.json('$')"
    });

  expect(stack).toHaveResource('AWS::ApiGateway::RestApi', {
    Type: "AWS::ApiGateway::RestApi",
    Properties: {
      EndpointConfiguration: {
        Types: [
          "REGIONAL"
        ]
      },
      Name: "HelloWorld-RegionalApi"
    }
  }, ResourcePart.CompleteDefinition);
});

// -----------------------------------------------------------------------
// Tests for exception while overriding restApiProps using endPointTypes
// -----------------------------------------------------------------------
test('Test for Exception while overriding restApiProps using endPointTypes', () => {
  const stack = new Stack();
  try {
    defaults.RegionalRestApi(stack, {
      endpointTypes: [api.EndpointType.REGIONAL]
    });
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
  }
});

// -----------------------------------------------------------------------
// Tests for exception while overriding LambdaRestApiProps using endPointTypes
// -----------------------------------------------------------------------
test('Test for Exception while overriding LambdaRestApiProps using endPointTypes', () => {
  const stack = new Stack();
  const lambdaFunctionProps: lambda.FunctionProps = {
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`)
  };

  const fn = defaults.deployLambdaFunction(stack, lambdaFunctionProps);

  try {
    defaults.GlobalLambdaRestApi(stack, fn, {
      handler: fn,
      endpointTypes: [api.EndpointType.REGIONAL]
    });
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
  }
});

// -----------------------------------------------------------------------
// Test for Integration Request Props Override
// -----------------------------------------------------------------------
test('Test for Integration Request Props Override', () => {
  const stack = new Stack();

  const [regionalApi] = defaults.RegionalRestApi(stack);

  // Setup the API Gateway role
  const apiGatewayRole = new iam.Role(stack, 'api-gateway-role', {
    assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com')
  });

  // Setup the API Gateway resource
  const apiGatewayResource = regionalApi.root.addResource('hello');
  const integReqParams = {'integration.request.path.topic-level-1': "'method.request.path.topic-level-1'"};
  const integResp: api.IntegrationResponse[] = [
    {
      statusCode: "200",
      selectionPattern: "2\\d{2}",
      responseTemplates : {
        "application/json": "$input.json('$')"
      }
    }];
  // Override the default Integration Request Props
  const integrationReqProps = {
    subdomain: 'abcdefgh12345',
    options: {
      requestParameters: integReqParams,
      integrationResponses: integResp,
      passthroughBehavior: api.PassthroughBehavior.WHEN_NO_MATCH
    }
  };
  defaults.addProxyMethodToApiResource(
    {
      service: 'iotdata',
      path: 'hello',
      apiGatewayRole,
      apiMethod: 'POST',
      apiResource: apiGatewayResource,
      requestTemplate: "$input.json('$')",
      awsIntegrationProps: integrationReqProps
    });

  expect(stack).toHaveResourceLike("AWS::ApiGateway::Method", {
    HttpMethod: "POST",
    AuthorizationType: "AWS_IAM",
    Integration: {
      IntegrationHttpMethod: "POST",
      IntegrationResponses: [
        {
          ResponseTemplates: {
            "application/json": "$input.json('$')"
          },
          SelectionPattern: "2\\d{2}",
          StatusCode: "200"
        }
      ],
      PassthroughBehavior: "WHEN_NO_MATCH",
      RequestParameters: {
        "integration.request.header.Content-Type": "'application/json'",
        "integration.request.path.topic-level-1": "'method.request.path.topic-level-1'",
      },
      RequestTemplates: {
        "application/json": "$input.json('$')"
      },
      Type: "AWS",
      Uri: {
        "Fn::Join": [
          "",
          [
            "arn:",
            {
              Ref: "AWS::Partition"
            },
            ":apigateway:",
            {
              Ref: "AWS::Region"
            },
            `:abcdefgh12345.iotdata:path/hello`
          ]
        ]
      }
    },
    MethodResponses: [
      {
        StatusCode: "200",
        ResponseParameters: {
          "method.response.header.Content-Type": true
        }
      }
    ]
  });
});

// -----------------------------------------------------------------------
// Test for Method Options Override
// -----------------------------------------------------------------------
test('Test for Method Request Props Override', () => {
  const stack = new Stack();

  const [globalApi] = defaults.GlobalRestApi(stack);

  // Setup the API Gateway role
  const apiGatewayRole = new iam.Role(stack, 'api-gateway-role', {
    assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com')
  });

  // Setup the API Gateway resource
  const apiGatewayResource = globalApi.root.addResource('hello');
  const methodReqParams = {'method.request.path.topic-level-1': true};
  const methodResp: api.MethodResponse[] = [
    {
      statusCode: "403"
    }
  ];
  const resourceMethodOptions = {
    requestParameters: methodReqParams,
    methodResponses: methodResp,
  };
  defaults.addProxyMethodToApiResource(
    {
      service: 'iotdata',
      path: 'hello',
      apiGatewayRole,
      apiMethod: 'POST',
      apiResource: apiGatewayResource,
      requestTemplate: "$input.json('$')",
      methodOptions: resourceMethodOptions
    });

  expect(stack).toHaveResourceLike("AWS::ApiGateway::Method", {
    HttpMethod: "POST",
    AuthorizationType: "AWS_IAM",
    Integration: {
      IntegrationHttpMethod: "POST",
      IntegrationResponses: [
        {
          StatusCode: "200"
        },
        {
          StatusCode: "500",
          ResponseTemplates: {
            "text/html": "Error"
          },
          SelectionPattern: "500"
        }
      ],
      PassthroughBehavior: "NEVER",
      RequestParameters: {
        "integration.request.header.Content-Type": "'application/json'",
      },
      RequestTemplates: {
        "application/json": "$input.json('$')"
      },
      Type: "AWS",
      Uri: {
        "Fn::Join": [
          "",
          [
            "arn:",
            {
              Ref: "AWS::Partition"
            },
            ":apigateway:",
            {
              Ref: "AWS::Region"
            },
            `:iotdata:path/hello`
          ]
        ]
      }
    },
    MethodResponses: [
      {
        StatusCode: "403"
      }
    ],
    RequestParameters: {
      "method.request.path.topic-level-1": true
    }
  });
});

// -----------------------------------------------------------------------
// Test for ApiKey Creation of RestApi
// -----------------------------------------------------------------------
test('Test for ApiKey creation using restApiProps', () => {
  const stack = new Stack();
  const [globalRestApi] = defaults.GlobalRestApi(stack, {
    defaultMethodOptions: {
      apiKeyRequired: true
    }
  });

  // Setup the API Gateway role
  const apiGatewayRole = new iam.Role(stack, 'api-gateway-role', {
    assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com')
  });

  // Setup the API Gateway resource
  const apiGatewayResource = globalRestApi.root.addResource('hello');

  defaults.addProxyMethodToApiResource(
    {
      service: 'iotdata',
      path: 'hello',
      apiGatewayRole,
      apiMethod: 'POST',
      apiResource: apiGatewayResource,
      requestTemplate: "$input.json('$')"
    });
  // Assertion to check for ApiKey
  expect(stack).toHaveResourceLike("AWS::ApiGateway::Method", {
    ApiKeyRequired: true
  });
  expect(stack).toHaveResourceLike("AWS::ApiGateway::ApiKey", {
    Enabled: true
  });
  // Assertion to check for UsagePlan Api Key Mapping
  expect(stack).toHaveResourceLike("AWS::ApiGateway::UsagePlanKey", {
    KeyType: "API_KEY"
  });
});

// -----------------------------------------------------------------------
// Test for ApiKey Creation of LambdaRestApi
// -----------------------------------------------------------------------
test('Test for ApiKey creation using lambdaApiProps', () => {
  const stack = new Stack();
  const lambdaFunctionProps: lambda.FunctionProps = {
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`)
  };

  const fn = defaults.deployLambdaFunction(stack, lambdaFunctionProps);
  defaults.RegionalLambdaRestApi(stack, fn, {
    handler: fn,
    defaultMethodOptions: {
      apiKeyRequired: true
    }
  });

  // Assertion to check for ApiKey
  expect(stack).toHaveResourceLike("AWS::ApiGateway::Method", {
    ApiKeyRequired: true
  });
  expect(stack).toHaveResourceLike("AWS::ApiGateway::ApiKey", {
    Enabled: true
  });
  // Assertion to check for UsagePlan Api Key Mapping
  expect(stack).toHaveResourceLike("AWS::ApiGateway::UsagePlanKey", {
    KeyType: "API_KEY"
  });
});