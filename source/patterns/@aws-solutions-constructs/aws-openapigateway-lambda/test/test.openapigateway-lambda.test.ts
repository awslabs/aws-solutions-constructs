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

// Imports
import { Stack } from "aws-cdk-lib";
import { OpenApiGatewayToLambda } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import * as path from 'path';
import { Template } from "aws-cdk-lib/assertions";
import { CreateScrapBucket } from "@aws-solutions-constructs/core";
import * as defaults from '@aws-solutions-constructs/core';

test('Simple deployment works', () => {
  const stack = new Stack();

  const apiDefinitionAsset = new Asset(stack, 'OpenApiAsset', {
    path: path.join(__dirname, 'openapi/apiDefinition.yaml')
  });

  const construct = new OpenApiGatewayToLambda(stack, 'test-apigateway-lambda', {
    apiDefinitionAsset,
    apiIntegrations: [
      {
        id: 'MessagesHandler',
        lambdaFunctionProps: {
          runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
          handler: 'index.handler',
          code: lambda.Code.fromAsset(`${__dirname}/messages-lambda`),
        }
      }
    ]
  });

  expect(construct.apiGateway).toBeDefined();
  expect(construct.apiGatewayCloudWatchRole).toBeDefined();
  expect(construct.apiGatewayLogGroup).toBeDefined();
  expect(construct.apiLambdaFunctions.length).toEqual(1);
  expect(construct.apiLambdaFunctions[0].id).toEqual('MessagesHandler');
  expect(construct.apiLambdaFunctions[0].lambdaFunction).toBeDefined();
});

test('API Definition can be specified from Asset', () => {
  const stack = new Stack();

  const apiDefinitionAsset = new Asset(stack, 'OpenApiAsset', {
    path: path.join(__dirname, 'openapi/apiDefinition.yaml')
  });

  const construct = new OpenApiGatewayToLambda(stack, 'test-apigateway-lambda', {
    apiDefinitionAsset,
    apiIntegrations: [
      {
        id: 'MessagesHandler',
        lambdaFunctionProps: {
          runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
          handler: 'index.handler',
          code: lambda.Code.fromAsset(`${__dirname}/messages-lambda`),
        }
      }
    ]
  });

  expect(construct.apiLambdaFunctions[0].id).toEqual('MessagesHandler');
  expect(construct.apiLambdaFunctions[0].lambdaFunction).toBeDefined();
});

test('API Definition can be specified from S3 Bucket and Key', () => {
  const stack = new Stack();

  const apiDefinitionBucket = CreateScrapBucket(stack, "scrapBucket");
  const apiDefinitionKey = 'api.yaml';

  const construct = new OpenApiGatewayToLambda(stack, 'test-apigateway-lambda', {
    apiDefinitionBucket,
    apiDefinitionKey,
    apiIntegrations: [
      {
        id: 'MessagesHandler',
        lambdaFunctionProps: {
          runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
          handler: 'index.handler',
          code: lambda.Code.fromAsset(`${__dirname}/messages-lambda`),
        }
      }
    ]
  });

  expect(construct.apiLambdaFunctions[0].id).toEqual('MessagesHandler');
  expect(construct.apiLambdaFunctions[0].lambdaFunction).toBeDefined();
});

test('Throws error when both api definition asset and s3 object are specified', () => {
  const stack = new Stack();

  const apiDefinitionAsset = new Asset(stack, 'OpenApiAsset', {
    path: path.join(__dirname, 'openapi/apiDefinition.yaml')
  });

  const app = () => {
    new OpenApiGatewayToLambda(stack, 'test-apigateway-lambda', {
      apiDefinitionAsset,
      apiDefinitionBucket: new s3.Bucket(stack, 'ApiDefinitionBucket'),
      apiDefinitionKey: 'key',
      apiIntegrations: [
        {
          id: 'MessagesHandler',
          lambdaFunctionProps: {
            runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(`${__dirname}/messages-lambda`),
          }
        }
      ]
    });
  };
  expect(app).toThrowError('Either apiDefinitionBucket/apiDefinitionKey or apiDefinitionAsset must be specified, but not both');
});

test('Multiple Lambda Functions can be specified', () => {
  const stack = new Stack();

  const apiDefinitionAsset = new Asset(stack, 'OpenApiAsset', {
    path: path.join(__dirname, 'openapi/apiDefinition.yaml')
  });

  new OpenApiGatewayToLambda(stack, 'test-apigateway-lambda', {
    apiDefinitionAsset,
    apiIntegrations: [
      {
        id: 'MessagesHandler',
        lambdaFunctionProps: {
          runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
          handler: 'index.handler',
          code: lambda.Code.fromAsset(`${__dirname}/messages-lambda`),
        }
      }, {
        id: 'PhotosHandler',
        lambdaFunctionProps: {
          runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
          handler: 'index.handler',
          code: lambda.Code.fromAsset(`${__dirname}/photos-lambda`),
        }
      }
    ]
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Lambda::Function', 4);
});

test('Existing lambda function can be specified', () => {
  const stack = new Stack();

  const apiDefinitionAsset = new Asset(stack, 'OpenApiAsset', {
    path: path.join(__dirname, 'openapi/apiDefinition.yaml')
  });

  const existingLambdaObj = new lambda.Function(stack, 'ExistingLambda', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    functionName: 'ExistingLambdaFunction',
    code: lambda.Code.fromAsset(`${__dirname}/messages-lambda`),
  });

  new OpenApiGatewayToLambda(stack, 'test-apigateway-lambda', {
    apiDefinitionAsset,
    apiIntegrations: [
      {
        id: 'MessagesHandler',
        existingLambdaObj
      }, {
        id: 'PhotosHandler',
        lambdaFunctionProps: {
          runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
          handler: 'index.handler',
          functionName: 'NewLambdaFunction',
          code: lambda.Code.fromAsset(`${__dirname}/photos-lambda`),
        }
      }
    ]
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Lambda::Function', 4);

  template.hasResourceProperties("AWS::Lambda::Function", {
    FunctionName: 'ExistingLambdaFunction'
  });

  template.hasResourceProperties("AWS::Lambda::Function", {
    FunctionName: 'NewLambdaFunction'
  });
});

test('Throws error when neither existingLambdaObj or lambdaFunctionProps is specified', () => {
  const stack = new Stack();

  const apiDefinitionAsset = new Asset(stack, 'OpenApiAsset', {
    path: path.join(__dirname, 'openapi/apiDefinition.yaml')
  });

  const app = () => {
    new OpenApiGatewayToLambda(stack, 'test-apigateway-lambda', {
      apiDefinitionAsset,
      apiIntegrations: [
        {
          id: 'MessagesHandler'
        }
      ]
    });
  };
  expect(app).toThrowError('One of existingLambdaObj or lambdaFunctionProps must be specified for the api integration with id: MessagesHandler');
});

test('Throws error when no api definition is specified', () => {
  const stack = new Stack();

  const app = () => {
    new OpenApiGatewayToLambda(stack, 'test-apigateway-lambda', {
      apiIntegrations: [
        {
          id: 'MessagesHandler',
          lambdaFunctionProps: {
            runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(`${__dirname}/messages-lambda`),
          }
        }
      ]
    });
  };
  expect(app).toThrowError('Either apiDefinitionBucket/apiDefinitionKey or apiDefinitionAsset must be specified');
});

test('Throws error when no api integration is specified', () => {
  const stack = new Stack();

  const apiDefinitionAsset = new Asset(stack, 'OpenApiAsset', {
    path: path.join(__dirname, 'openapi/apiDefinition.yaml')
  });

  const app = () => {
    new OpenApiGatewayToLambda(stack, 'test-apigateway-lambda', {
      apiDefinitionAsset,
      apiIntegrations: []
    });
  };
  expect(app).toThrowError('At least one ApiIntegration must be specified in the apiIntegrations property');
});

test('Throws error when api definition s3 bucket is specified but s3 object key is missing', () => {
  const stack = new Stack();

  const apiDefinitionBucket = CreateScrapBucket(stack, "scrapBucket");

  const app = () => {
    new OpenApiGatewayToLambda(stack, 'test-apigateway-lambda', {
      apiDefinitionBucket,
      apiIntegrations: []
    });
  };
  expect(app).toThrowError('Either apiDefinitionBucket/apiDefinitionKey or apiDefinitionAsset must be specified');
});

test('Throws error when api definition s3 object key is specified but s3 bucket is missing', () => {
  const stack = new Stack();

  const app = () => {
    new OpenApiGatewayToLambda(stack, 'test-apigateway-lambda', {
      apiDefinitionKey: 'prefix/api-definition.yml',
      apiIntegrations: []
    });
  };
  expect(app).toThrowError('Either apiDefinitionBucket/apiDefinitionKey or apiDefinitionAsset must be specified');
});

test('Throws error when api is defined as asset and s3 bucket is specified', () => {
  const stack = new Stack();

  const apiDefinitionAsset = new Asset(stack, 'OpenApiAsset', {
    path: path.join(__dirname, 'openapi/apiDefinition.yaml')
  });
  const apiDefinitionBucket = CreateScrapBucket(stack, "scrapBucket");

  const app = () => {
    new OpenApiGatewayToLambda(stack, 'test-apigateway-lambda', {
      apiDefinitionAsset,
      apiDefinitionBucket,
      apiIntegrations: []
    });
  };
  expect(app).toThrowError('Either apiDefinitionBucket/apiDefinitionKey or apiDefinitionAsset must be specified');
});

test('Throws error when api is defined as asset and s3 key is specified', () => {
  const stack = new Stack();

  const apiDefinitionAsset = new Asset(stack, 'OpenApiAsset', {
    path: path.join(__dirname, 'openapi/apiDefinition.yaml')
  });

  const app = () => {
    new OpenApiGatewayToLambda(stack, 'test-apigateway-lambda', {
      apiDefinitionAsset,
      apiDefinitionKey: 'prefix/api-definition.yml',
      apiIntegrations: []
    });
  };
  expect(app).toThrowError('Either apiDefinitionBucket/apiDefinitionKey or apiDefinitionAsset must be specified');
});

test('Two Constructs create APIs with different names', () => {
  const stack = new Stack();

  const apiDefinitionAsset = new Asset(stack, 'OpenApiAsset', {
    path: path.join(__dirname, 'openapi/apiDefinition.yaml')
  });

  new OpenApiGatewayToLambda(stack, 'test-apigateway-lambda', {
    apiDefinitionAsset,
    apiIntegrations: [
      {
        id: 'MessagesHandler',
        lambdaFunctionProps: {
          runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
          handler: 'index.handler',
          code: lambda.Code.fromAsset(`${__dirname}/messages-lambda`),
        }
      }
    ]
  });

  const secondApiDefinitionAsset = new Asset(stack, 'SecondOpenApiAsset', {
    path: path.join(__dirname, 'openapi/apiDefinition-withCognitoAuth.yaml')
  });

  new OpenApiGatewayToLambda(stack, 'second-test', {
    apiDefinitionAsset: secondApiDefinitionAsset,
    apiIntegrations: [
      {
        id: 'MessagesHandler',
        lambdaFunctionProps: {
          runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
          handler: 'index.handler',
          code: lambda.Code.fromAsset(`${__dirname}/messages-lambda`),
        }
      }
    ]
  });

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::ApiGateway::RestApi", 2);
  template.hasResourceProperties("AWS::ApiGateway::RestApi", {
    Name: {
      "Fn::Join": [
        "",
        [
          "test-apigateway-lambda-",
          {
            "Fn::Select": [
              2,
              {
                "Fn::Split": [
                  "/",
                  {
                    Ref: "AWS::StackId"
                  }
                ]
              }
            ]
          }
        ]
      ]
    }
  });
  template.hasResourceProperties("AWS::ApiGateway::RestApi", {
    Name: {
      "Fn::Join": [
        "",
        [
          "second-test-",
          {
            "Fn::Select": [
              2,
              {
                "Fn::Split": [
                  "/",
                  {
                    Ref: "AWS::StackId"
                  }
                ]
              }
            ]
          }
        ]
      ]
    }
  });
});

test('Confirm API definition uri is added to function name', () => {
  const stack = new Stack();

  const apiDefinitionAsset = new Asset(stack, 'OpenApiAsset', {
    path: path.join(__dirname, 'openapi/apiDefinition.yaml')
  });

  new OpenApiGatewayToLambda(stack, 'test-apigateway-lambda', {
    apiDefinitionAsset,
    apiIntegrations: [
      {
        id: 'MessagesHandler',
        lambdaFunctionProps: {
          runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
          handler: 'index.handler',
          code: lambda.Code.fromAsset(`${__dirname}/messages-lambda`),
        }
      }
    ]
  });
  const template = Template.fromStack(stack);
  const resources = JSON.parse(JSON.stringify(template)).Resources;

  expect(Object.keys(resources).find((element) => {
    return element.includes("MessagesHandler");
  })).toBeTruthy();

});

test('Confirm  that providing both lambdaFunction and functionProps is an error', () => {
  const stack = new Stack();
  const existingLambdaObj = new lambda.Function(stack, 'ExistingLambda', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    functionName: 'ExistingLambdaFunction',
    code: lambda.Code.fromAsset(`${__dirname}/messages-lambda`),
  });

  const apiDefinitionAsset = new Asset(stack, 'OpenApiAsset', {
    path: path.join(__dirname, 'openapi/apiDefinition.yaml')
  });

  const props = {
    apiDefinitionAsset,
    apiIntegrations: [
      {
        id: 'MessagesHandler',
        lambdaFunctionProps: {
          runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
          handler: 'index.handler',
          code: lambda.Code.fromAsset(`${__dirname}/messages-lambda`),
        },
        existingLambdaObj
      }
    ]
  };

  const app = () => {
    new OpenApiGatewayToLambda(stack, 'test-apigateway-lambda', props);
  };
  expect(app).toThrowError(`Error - Cannot provide both lambdaFunctionProps and existingLambdaObj in an ApiIntegrationfor the api integration with id: MessagesHandler`);
});
