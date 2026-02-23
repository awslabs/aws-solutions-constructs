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
import { Stack, Duration, RemovalPolicy } from "aws-cdk-lib";
import { OpenApiGatewayToLambda } from "../lib";
import { ObtainApiDefinition, CheckOpenApiProps } from "../lib/openapi-helper";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import * as path from 'path';
import { Match, Template } from "aws-cdk-lib/assertions";
import { CreateScrapBucket } from "@aws-solutions-constructs/core";
import * as defaults from '@aws-solutions-constructs/core';
import * as inlineJsonApiDefinition from './openapi/apiDefinition.json';

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

test('API Definition can be specified from an apiDefinitionJson ', () => {
  const stack = new Stack();

  const construct = new OpenApiGatewayToLambda(stack, 'test-apigateway-lambda', {
    apiDefinitionJson: inlineJsonApiDefinition,
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

const incorrectDefinitionMessage =
  'Exactly one of apiDefinitionAsset, apiDefinitionJson or (apiDefinitionBucket/apiDefinitionKey) must be provided';

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
  expect(app).toThrow(incorrectDefinitionMessage);
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
  template.resourceCountIs("AWS::Lambda::Alias", 0);
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
  expect(app).toThrow(`ApiIntegration id:MessagesHandler must have exactly one of lambdaFunctionProps or existingLambdaObj\n`);
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

/*
 * openapi-helper.ts tests
*/
test('Throws error when no api definition is specified', () => {
  const app = () => {
    CheckOpenApiProps({
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
  expect(app).toThrow(incorrectDefinitionMessage);
});

test('Throws error when no api integration is specified', () => {
  const stack = new Stack();

  const apiDefinitionAsset = new Asset(stack, 'OpenApiAsset', {
    path: path.join(__dirname, 'openapi/apiDefinition.yaml')
  });

  const app = () => {
    CheckOpenApiProps({
      apiDefinitionAsset,
      apiIntegrations: []
    });
  };
  expect(app).toThrow('At least one ApiIntegration must be specified in the apiIntegrations property');
});

test('Throws error when api definition s3 bucket is specified but s3 object key is missing', () => {
  const stack = new Stack();

  const apiDefinitionBucket = CreateScrapBucket(stack, "scrapBucket");

  const app = () => {
    CheckOpenApiProps({
      apiDefinitionBucket,
      apiIntegrations: []
    });
  };
  expect(app).toThrow('apiDefinitionBucket and apiDefinitionKey must be specified together.');
});

test('Throws error when api definition s3 object key is specified but s3 bucket is missing', () => {
  const app = () => {
    CheckOpenApiProps({
      apiDefinitionKey: 'prefix/api-definition.yml',
      apiIntegrations: []
    });
  };
  expect(app).toThrow('apiDefinitionBucket and apiDefinitionKey must be specified together.');
});

test('Throws error when api is defined as asset and s3 bucket is specified', () => {
  const stack = new Stack();

  const apiDefinitionAsset = new Asset(stack, 'OpenApiAsset', {
    path: path.join(__dirname, 'openapi/apiDefinition.yaml')
  });
  const apiDefinitionBucket = CreateScrapBucket(stack, "scrapBucket");

  const app = () => {
    CheckOpenApiProps({
      apiDefinitionAsset,
      apiDefinitionBucket,
      apiDefinitionKey: 'prefix/api-definition.yml',
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
  expect(app).toThrow(incorrectDefinitionMessage);
});

test('Throws error when api is defined as asset and s3 key is specified', () => {
  const stack = new Stack();

  const apiDefinitionAsset = new Asset(stack, 'OpenApiAsset', {
    path: path.join(__dirname, 'openapi/apiDefinition.yaml')
  });
  const apiDefinitionBucket = CreateScrapBucket(stack, "scrapBucket");

  const app = () => {
    CheckOpenApiProps({
      apiDefinitionAsset,
      apiDefinitionBucket,
      apiDefinitionKey: 'prefix/api-definition.yml',
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
  expect(app).toThrow(incorrectDefinitionMessage);
});

test('Throws error when both api definition inline and api definition asset are specified', () => {
  const stack = new Stack();

  const apiDefinitionAsset = new Asset(stack, 'OpenApiAsset', {
    path: path.join(__dirname, 'openapi/apiDefinition.yaml')
  });

  const app = () => {
    CheckOpenApiProps({
      apiDefinitionAsset,
      apiDefinitionJson: inlineJsonApiDefinition,
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
  expect(app).toThrow(incorrectDefinitionMessage);
});

test('Throws error when both api definition inline and s3 object are specified', () => {
  const stack = new Stack();

  const app = () => {
    CheckOpenApiProps({
      apiDefinitionJson: inlineJsonApiDefinition,
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
  expect(app).toThrow(incorrectDefinitionMessage);
});

test('ObtainApiDefinition from local asset', () => {
  const stack = new Stack();

  const apiDefinitionAsset = new Asset(stack, 'OpenApiAsset', {
    path: path.join(__dirname, 'openapi/apiDefinition.yaml')
  });

  const testFunction = new lambda.Function(stack, 'test', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/messages-lambda`),
  });

  const apiLambdaFunctions = [
    {
      id: 'MessageHandler',
      lambdaFunction: testFunction
    }
  ];

  const api = ObtainApiDefinition(stack,
    {
      apiDefinitionAsset,
      tokenToFunctionMap: apiLambdaFunctions
    });

  expect(api).toBeDefined();
  expect((api as any).bucketName).toBeDefined();
  expect((api as any).key).toBeDefined();

  const template = Template.fromStack(stack);
  template.resourceCountIs("Custom::TemplateWriter", 1);
});

test('ObtainApiDefinition from inline JSON spec', () => {
  const stack = new Stack();

  const testFunction = new lambda.Function(stack, 'test', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/messages-lambda`),
  });

  const apiLambdaFunctions = [
    {
      id: 'MessageHandler',
      lambdaFunction: testFunction
    }
  ];

  const api = ObtainApiDefinition(stack,
    {
      apiJsonDefinition: inlineJsonApiDefinition,
      tokenToFunctionMap: apiLambdaFunctions
    });

  const template = Template.fromStack(stack);
  template.resourceCountIs("Custom::TemplateWriter", 0);

  expect(api).toBeDefined();
  expect((api as any).definition).toBeDefined();
  expect((api as any).definition.openapi).toEqual("3.0.1");
  expect((api as any).definition.info).toBeDefined();
  expect((api as any).definition.paths).toBeDefined();

});

test('ObtainApiDefinition from S3 bucket/key', () => {
  const stack = new Stack();

  const testFunction = new lambda.Function(stack, 'test', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/messages-lambda`),
  });

  const apiLambdaFunctions = [
    {
      id: 'MessageHandler',
      lambdaFunction: testFunction
    }
  ];

  const api = ObtainApiDefinition(stack,
    {
      apiDefinitionBucket: CreateScrapBucket(stack, "scrapBucket"),
      apiDefinitionKey: "api.yml",
      tokenToFunctionMap: apiLambdaFunctions
    });
  expect(api).toBeDefined();
  expect((api as any).bucketName).toBeDefined();
  expect((api as any).key).toBeDefined();

  const template = Template.fromStack(stack);
  template.resourceCountIs("Custom::TemplateWriter", 1);

});

test('ObtainApiDefinition uses custom properties', () => {
  const stack = new Stack();

  const apiDefinitionAsset = new Asset(stack, 'OpenApiAsset', {
    path: path.join(__dirname, 'openapi/apiDefinition.yaml')
  });

  const testFunction = new lambda.Function(stack, 'test', {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/messages-lambda`),
  });

  const apiLambdaFunctions = [
    {
      id: 'MessageHandler',
      lambdaFunction: testFunction
    }
  ];

  const api = ObtainApiDefinition(stack,
    {
      apiDefinitionAsset,
      tokenToFunctionMap: apiLambdaFunctions,
      internalTransformTimeout: Duration.seconds(385),
      internalTransformMemorySize: 3456
    });

  expect(api).toBeDefined();
  expect((api as any).bucketName).toBeDefined();
  expect((api as any).key).toBeDefined();

  const template = Template.fromStack(stack);
  template.resourceCountIs("Custom::TemplateWriter", 1);
  template.hasResource("AWS::Lambda::Function", {
    Properties: {
      Timeout: 385,
      MemorySize: 3456
    }
  });
});

test('Shared lambda function works', () => {
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

  const constructTwo = new OpenApiGatewayToLambda(stack, 'two-apigateway-lambda', {
    apiDefinitionAsset,
    apiIntegrations: [
      {
        id: 'MessagesHandler',
        existingLambdaObj: construct.apiLambdaFunctions[0].lambdaFunction
      }
    ]
  });

  expect(construct.apiGateway).toBeDefined();
  expect(construct.apiGatewayCloudWatchRole).toBeDefined();
  expect(construct.apiGatewayLogGroup).toBeDefined();
  expect(construct.apiLambdaFunctions.length).toEqual(1);
  expect(construct.apiLambdaFunctions[0].id).toEqual('MessagesHandler');
  expect(construct.apiLambdaFunctions[0].lambdaFunction).toBeDefined();
  expect(construct.apiLambdaFunctions[0].lambdaFunction!.functionArn).toEqual(constructTwo.apiLambdaFunctions[0].lambdaFunction!.functionArn);
});

test('Deploys API based on Alias correctly', () => {
  const stack = new Stack();

  const apiDefinitionAsset = new Asset(stack, 'ApiDefinitionAsset', {
    path: path.join(__dirname, 'openapi/apiDefinition.yaml')
  });

  const messagesLambda = defaults.buildLambdaFunction(stack, {
    lambdaFunctionProps: {
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/messages-lambda`),
      currentVersionOptions: {
        removalPolicy: RemovalPolicy.RETAIN,
      },
    }
  });

  const photosLambda = defaults.buildLambdaFunction(stack, {
    lambdaFunctionProps: {
      functionName: 'PhotosLambdaTestFromAsset',
      runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/photos-lambda`),
    }
  });

  const messagesAlias = new lambda.Alias(stack, 'messages-alias', {
    version: messagesLambda.currentVersion,
    aliasName: 'messagesAlias',
  });

  new OpenApiGatewayToLambda(stack, 'OpenApiGatewayToLambda', {
    apiDefinitionAsset,
    apiIntegrations: [
      {
        id: 'MessagesHandler',
        existingLambdaObj: messagesAlias
      },
      {
        id: 'PhotosHandler',
        existingLambdaObj: photosLambda
      }
    ]
  });

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::Lambda::Alias", 1);
  template.resourceCountIs("AWS::Lambda::Version", 1);
  template.hasResourceProperties("AWS::Lambda::Alias", {
    FunctionName: {
      Ref: Match.stringLikeRegexp("LambdaFunction.*")
    },
    FunctionVersion: {
      "Fn::GetAtt": [
        Match.stringLikeRegexp("LambdaFunctionCurrentVersion.*"),
        "Version"
      ]
    },
    Name: "messagesAlias"
  });
  // Confirm we've granted permission the the Alias and not the Lambda
  template.hasResourceProperties("AWS::Lambda::Permission", {
    Action: "lambda:InvokeFunction",
    FunctionName: {
      Ref: Match.stringLikeRegexp("messagesalias.*")
    },
    Principal: "apigateway.amazonaws.com",
  });
  template.resourcePropertiesCountIs("AWS::Lambda::Permission", {
    Action: "lambda:InvokeFunction",
    FunctionName: {
      Ref: Match.stringLikeRegexp("LambdaFunction.*")
    },
    Principal: "apigateway.amazonaws.com",
  }, 0);
});

test('confirm execute-api arn is generated correctly', () => {
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

  template.hasResourceProperties("AWS::Lambda::Permission", {
    Action: "lambda:InvokeFunction",
    Principal: "apigateway.amazonaws.com",
    FunctionName: {
      "Fn::GetAtt": [
        Match.stringLikeRegexp("testapigatewaylambdaMessagesHandlerApiFunction*"),
        "Arn"
      ]
    },
    SourceArn: {
      "Fn::Join": [
        "",
        [
          "arn:",
          {
            "Ref": "AWS::Partition"
          },
          ":execute-api:",
          {
            "Ref": "AWS::Region"
          },
          ":",
          {
            "Ref": "AWS::AccountId"
          },
          ":",
          {
            "Ref": Match.stringLikeRegexp("testapigatewaylambdaSpecRestApi*")
          },
          "/*/*"
        ]
      ]
    }
  });
});
