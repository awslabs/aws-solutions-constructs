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

import * as cdk from "aws-cdk-lib";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as lambda from "aws-cdk-lib/aws-lambda";

import { COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME, DEFAULT_ROUTE_QUEUE_VTL_CONFIG } from "@aws-solutions-constructs/core";
import { Capture, Match, Template } from "aws-cdk-lib/assertions";
import { WebSocketIamAuthorizer, WebSocketLambdaAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { WebSocketLambdaIntegration, WebSocketMockIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { ApiGatewayV2WebSocketToSqs } from "../lib";

describe("When instantiating the ApiGatewayV2WebSocketToSqs construct with WebSocketApiProps", () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    const mockConnectLambda = new lambda.Function(stack, "mockConnectFunction", {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "connect.handler",
    });

    const mockDisconnectLambda = new lambda.Function(stack, "mockDisconnectFunction", {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "disconnect.handler",
    });

    new ApiGatewayV2WebSocketToSqs(stack, "ApiGatewayV2WebSocketToSqs", {
      webSocketApiProps: {
        connectRouteOptions: {
          integration: new WebSocketLambdaIntegration("ConnectIntegration", mockConnectLambda),
          authorizer: new WebSocketIamAuthorizer(),
        },
        disconnectRouteOptions: {
          integration: new WebSocketLambdaIntegration("DisconnectIntegration", mockDisconnectLambda),
        },
      },
      createDefaultRoute: true,
    });
    template = Template.fromStack(stack);
  });

  it("should have a FIFO queue and a DLQ", () => {
    template.resourceCountIs("AWS::SQS::Queue", 2);
    template.hasResourceProperties("AWS::SQS::Queue", {
      DeduplicationScope: "messageGroup",
      FifoQueue: true,
      FifoThroughputLimit: "perMessageGroupId",
      RedriveAllowPolicy: {
        redrivePermission: "denyAll",
      },
    });

    template.hasResourceProperties("AWS::SQS::Queue", {
      KmsMasterKeyId: "alias/aws/sqs",
      FifoQueue: true,
      DeduplicationScope: "messageGroup",
      FifoThroughputLimit: "perMessageGroupId",
      RedriveAllowPolicy: Match.absent(),
    });
  });

  it("should create an instance of the WebSocket", () => {
    template.hasResourceProperties("AWS::ApiGatewayV2::Api", {
      Name: "WebSocketApiApiGatewayV2WebSocketToSqs",
      ProtocolType: "WEBSOCKET",
      RouteSelectionExpression: "$request.body.action",
    });
  });

  it("should have a websocket api with different route options", () => {
    template.resourceCountIs("AWS::ApiGatewayV2::Route", 3);

    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "$disconnect",
      AuthorizationType: "NONE",
      Target: {
        "Fn::Join": ["", ["integrations/", Match.anyValue()]],
      },
    });

    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "$connect",
      AuthorizationType: "AWS_IAM",
      Target: {
        "Fn::Join": ["", ["integrations/", Match.anyValue()]],
      },
    });
  });

  it("should have role with policy for cloudwatch, sqs, and KMS", () => {
    template.hasResourceProperties("AWS::IAM::Role", {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: {
              Service: "apigateway.amazonaws.com",
            },
          },
        ],
        Version: "2012-10-17",
      },
    });

    const apigatewayRoleCapture = new Capture();
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          {
            Action: ["sqs:SendMessage", "sqs:GetQueueAttributes", "sqs:GetQueueUrl"],
            Effect: "Allow",
            Resource: {
              "Fn::GetAtt": [Match.anyValue(), "Arn"],
            },
          },
          {
            Action: [
              "logs:CreateLogGroup",
              "logs:CreateLogStream",
              "logs:DescribeLogGroups",
              "logs:DescribeLogStreams",
              "logs:PutLogEvents",
              "logs:GetLogEvents",
              "logs:FilterLogEvents",
            ],
            Effect: "Allow",
            Resource: {
              "Fn::GetAtt": [Match.anyValue(), "Arn"],
            },
          },
        ],
        Version: "2012-10-17",
      },
      PolicyName: Match.anyValue(),
      Roles: [
        {
          Ref: apigatewayRoleCapture,
        },
      ],
    });

    template.hasResourceProperties("AWS::IAM::Role", {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: {
              Service: "apigateway.amazonaws.com",
            },
          },
        ],
      },
    });
  });

  it("should define following types of integration", () => {
    template.hasResourceProperties("AWS::ApiGatewayV2::Integration", {
      IntegrationType: "AWS_PROXY",
      IntegrationUri: Match.anyValue(),
    });
  });
});

describe("When the option of creating default route and custom route is provided", () => {
  let template: Template;
  const routeName = "fakeroutename";

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");

    const mockConnectLambda = new lambda.Function(stack, "mockConnectFunction", {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "connect.handler",
    });

    const mockDisconnectLambda = new lambda.Function(stack, "mockDisconnectFunction", {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "disconnect.handler",
    });

    new ApiGatewayV2WebSocketToSqs(stack, "ApiGatewayV2WebSocketToSqs", {
      webSocketApiProps: {
        connectRouteOptions: {
          integration: new WebSocketLambdaIntegration("ConnectIntegration", mockConnectLambda),
        },
        disconnectRouteOptions: {
          integration: new WebSocketLambdaIntegration("DisconnectIntegration", mockDisconnectLambda),
        },
      },
      createDefaultRoute: true,
      customRouteName : routeName
    });
    template = Template.fromStack(stack);
  });

  it("should have the $default and custom rpute routing option", () => {
    template.hasResourceProperties("AWS::ApiGatewayV2::Integration", {
      ApiId: { Ref: "ApiGatewayV2WebSocketToSqsWebSocketApiApiGatewayV2WebSocketToSqs92E2576D" },
      CredentialsArn: { "Fn::GetAtt": [Match.anyValue(), "Arn"] },
      IntegrationMethod: "POST",
      IntegrationType: "AWS",
      IntegrationUri: { "Fn::Join": Match.anyValue() },
      PassthroughBehavior: "NEVER",
      RequestParameters: { "integration.request.header.Content-Type": "'application/x-www-form-urlencoded'" },
      RequestTemplates: {
        $default: DEFAULT_ROUTE_QUEUE_VTL_CONFIG,
      },
      TemplateSelectionExpression: "\\$default",
    });

    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "$default",
      AuthorizationType: "NONE",
      Target: {
        "Fn::Join": ["", ["integrations/", Match.anyValue()]],
      },
    });

    template.hasResourceProperties("AWS::ApiGatewayV2::Integration", {
      ApiId: { Ref: "ApiGatewayV2WebSocketToSqsWebSocketApiApiGatewayV2WebSocketToSqs92E2576D" },
      CredentialsArn: { "Fn::GetAtt": [Match.anyValue(), "Arn"] },
      IntegrationMethod: "POST",
      IntegrationType: "AWS",
      IntegrationUri: Match.anyValue(),
      PassthroughBehavior: "NEVER",
      RequestParameters: {
        "integration.request.header.Content-Type": "'application/x-www-form-urlencoded'",
      },
      RequestTemplates: {
        [routeName]: DEFAULT_ROUTE_QUEUE_VTL_CONFIG,
      },
      TemplateSelectionExpression: routeName,
    });

    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      ApiId: {
        Ref: Match.anyValue(),
      },
      RouteKey: routeName,
      Target: {
        "Fn::Join": [
          "",
          [
            "integrations/",
            {
              Ref: Match.stringLikeRegexp("ApiGatewayV2WebSocketToSqsWebSocketApiApiGatewayV2WebSocketToSqsfakeroutenameRoutefakeroutename"),
            },
          ],
        ],
      },
    });
  });
});

describe("When instantiating the construct with existing WebSocketApi", () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    const mockConnectLambda = new lambda.Function(stack, "mockConnectFunction", {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "connect.handler",
    });

    const mockDisconnectLambda = new lambda.Function(stack, "mockDisconnectFunction", {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "disconnect.handler",
    });

    new ApiGatewayV2WebSocketToSqs(stack, "ApiGatewayV2WebSocketToSqs", {
      existingWebSocketApi: new apigwv2.WebSocketApi(stack, "TestWebSocket", {
        apiName: "TestWebSocket",
        description: "Test WebSocket",
        connectRouteOptions: {
          integration: new WebSocketLambdaIntegration("ConnectIntegration", mockConnectLambda),
          authorizer: new WebSocketIamAuthorizer(),
        },
        disconnectRouteOptions: {
          integration: new WebSocketLambdaIntegration("DisconnectIntegration", mockDisconnectLambda),
        },
      }),
    });
    template = Template.fromStack(stack);
  });

  it("should not create a new websocket but use existing one", () => {
    template.resourceCountIs("AWS::ApiGatewayV2::Api", 1);
    template.hasResourceProperties("AWS::ApiGatewayV2::Api", {
      Name: "TestWebSocket",
      Description: "Test WebSocket",
    });
  });

  it("should have 2 routes configured", () => {
    template.resourceCountIs("AWS::ApiGatewayV2::Route", 2);

    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "$disconnect",
      AuthorizationType: "NONE",
      Target: {
        "Fn::Join": ["", ["integrations/", Match.anyValue()]],
      },
    });

    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "$connect",
      AuthorizationType: "AWS_IAM",
      Target: {
        "Fn::Join": ["", ["integrations/", Match.anyValue()]],
      },
    });
  });
});

describe("When an existing instance of WebSocketApi and WebSocketApiProps both are provided", () => {
  it("should throw an error", () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    const mockConnectLambda = new lambda.Function(stack, "mockConnectFunction", {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "connect.handler",
    });

    const mockDisconnectLambda = new lambda.Function(stack, "mockDisconnectFunction", {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "disconnect.handler",
    });

    try {
      new ApiGatewayV2WebSocketToSqs(stack, "ApiGatewayV2WebSocketToSqs", {
        existingWebSocketApi: new apigwv2.WebSocketApi(stack, "TestWebSocket", {
          apiName: "TestWebSocket",
          description: "Test WebSocket",
          connectRouteOptions: {
            integration: new WebSocketLambdaIntegration("ConnectIntegration", mockConnectLambda),
            authorizer: new WebSocketIamAuthorizer(),
          },
          disconnectRouteOptions: {
            integration: new WebSocketLambdaIntegration("DisconnectIntegration", mockDisconnectLambda),
          },
        }),
        webSocketApiProps: {
          connectRouteOptions: {
            integration: new WebSocketLambdaIntegration("ConnectIntegration", mockConnectLambda),
          },
          disconnectRouteOptions: {
            integration: new WebSocketLambdaIntegration("DisconnectIntegration", mockDisconnectLambda),
          },
        },
      });
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toEqual(
        "Provide either an existing WebSocketApi instance or WebSocketApiProps, not both"
      );
    }
  });
});

describe("When instantiating the ApiGatewayV2WebSocketToSqs construct when not setting defaultIamAuthorizer", () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");

    const mockDisconnectLambda = new lambda.Function(stack, "mockDisconnectFunction", {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "disconnect.handler",
    });

    new ApiGatewayV2WebSocketToSqs(stack, "ApiGatewayV2WebSocketToSqs", {
      webSocketApiProps: {
        disconnectRouteOptions: {
          integration: new WebSocketLambdaIntegration("DisconnectIntegration", mockDisconnectLambda),
        },
      },
      createDefaultRoute: true
    });
    template = Template.fromStack(stack);
  });

  it("should contain a websocket endpoint with a default implementation of $connect", () => {
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "$connect",
      AuthorizationType: "AWS_IAM",
      Target: {
        "Fn::Join": [
          "",
          [
            "integrations/",
            {
              Ref: Match.stringLikeRegexp(
                "ApiGatewayV2WebSocketToSqsWebSocketApiApiGatewayV2WebSocketToSqsconnectRouteconnect"
              ),
            },
          ],
        ],
      },
    });
  });
});

describe("When instantiating the ApiGatewayV2WebSocketToSqs construct when not setting defaultIamAuthorizer", () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");

    const mockConnectLambda = new lambda.Function(stack, "mockConnectFunction", {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
      handler: "connect.handler",
    });

    new ApiGatewayV2WebSocketToSqs(stack, "ApiGatewayV2WebSocketToSqs", {
      webSocketApiProps: {
        connectRouteOptions: {
          integration: new WebSocketMockIntegration("connect"),
          authorizer: new WebSocketLambdaAuthorizer("custom-authorizer", mockConnectLambda, {
            identitySource: ["route.request.querystring.Authorization"],
          }),
        },
      },
      createDefaultRoute: true
    });
    template = Template.fromStack(stack);
  });

  it("should contain a websocket endpoint with a default implementation of $connect", () => {
    template.hasResourceProperties("AWS::ApiGatewayV2::Authorizer", {
      ApiId: {
        Ref: Match.stringLikeRegexp("ApiGatewayV2WebSocketToSqsWebSocketApiApiGatewayV2WebSocketToSqs"),
      },
      AuthorizerType: "REQUEST",
      AuthorizerUri: {
        "Fn::Join": [
          "",
          [
            "arn:",
            {
              Ref: "AWS::Partition",
            },
            ":apigateway:",
            {
              Ref: "AWS::Region",
            },
            ":lambda:path/2015-03-31/functions/",
            {
              "Fn::GetAtt": [Match.stringLikeRegexp("mockConnectFunction"), "Arn"],
            },
            "/invocations",
          ],
        ],
      },
      IdentitySource: ["route.request.querystring.Authorization"],
      Name: "custom-authorizer",
    });

    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "$connect",
      AuthorizationType: "CUSTOM",
      Target: {
        "Fn::Join": [
          "",
          [
            "integrations/",
            {
              Ref: Match.stringLikeRegexp(
                "ApiGatewayV2WebSocketToSqsWebSocketApiApiGatewayV2WebSocketToSqsconnectRouteconnect"
              ),
            },
          ],
        ],
      },
    });
  });
});

describe("When instantiating the ApiGatewayV2WebSocketToSqs construct when setting defaultIamAuthorizer as false", () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");

    new ApiGatewayV2WebSocketToSqs(stack, "ApiGatewayV2WebSocketToSqs", {
      defaultIamAuthorization: false,
      createDefaultRoute: true,
    });
    template = Template.fromStack(stack);
  });

  it("should contain a websocket endpoint with a default implementation of $connect", () => {
    template.resourceCountIs("AWS::ApiGatewayV2::Authorizer", 0);
    template.resourceCountIs("AWS::ApiGatewayV2::Route", 1);
    template.resourceCountIs("AWS::ApiGatewayV2::Integration", 1);
    template.resourceCountIs("AWS::ApiGatewayV2::Api", 1);
  });
});

describe("When neither existingWebSocketApi nor webSocketApiProps are provided", () => {
  it("should throw an error", () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");

    try {
      new ApiGatewayV2WebSocketToSqs(stack, "ApiGatewayV2WebSocketToSqs", {
        createDefaultRoute: true
      });
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toEqual(
        "Provide either an existing WebSocketApi instance or WebSocketApiProps, but not both"
      );
    }
  });

  describe("When neither customRouteName is provided nor createDefaultRoute is set to true", () => {
    it("should throw an error", () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, "TestStack");

      try {
        new ApiGatewayV2WebSocketToSqs(stack, "ApiGatewayV2WebSocketToSqs", {});
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toEqual(
          "Either createDefaultRoute or customRouteName must be specified when creating a WebSocketApi"
        );
      }
    });
  });
});
