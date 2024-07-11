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
import { Capture, Match, Template } from "aws-cdk-lib/assertions";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import { WebSocketIamAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { WebSocketMockIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as iam from 'aws-cdk-lib/aws-iam';
import { buildWebSocketApiProps, buildWebSocketQueueApi, buildWebSocketQueueRouteOptions, DEFAULT_ROUTE_QUEUE_VTL_CONFIG } from "..";

test("creates API Gateway role and grants permissions and apigateway stage setup", () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, "TestStack");
  const queue = new sqs.Queue(stack, "TestQueue");

  buildWebSocketQueueApi(stack, "TestApi", {
    queue,
    createDefaultRoute: true,
  });

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::IAM::Role", 1);
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

  template.resourceCountIs("AWS::SQS::Queue", 1);
  const sqsQueueCapture = new Capture();

  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: ["sqs:SendMessage", "sqs:GetQueueAttributes", "sqs:GetQueueUrl"],
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": [sqsQueueCapture, "Arn"],
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
            "Fn::GetAtt": [Match.stringLikeRegexp("LogGroup*"), "Arn"],
          },
        },
      ],
    },
  });

  template.resourceCountIs("AWS::ApiGatewayV2::Api", 1);
  template.resourceCountIs("AWS::ApiGatewayV2::Stage", 1);
  template.hasResourceProperties("AWS::ApiGatewayV2::Stage", {
    StageName: "prod",
    AutoDeploy: true,
  });

  const apigwv2Catpure = new Capture();
  template.resourceCountIs("AWS::ApiGatewayV2::Route", 1);
  template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
    ApiId: {
      Ref: apigwv2Catpure,
    },
    AuthorizationType: "NONE",
    RouteKey: "$default",
    Target: {
      "Fn::Join": [
        "",
        [
          "integrations/",
          {
            Ref: Match.stringLikeRegexp("WebSocketApiTestApidefaultRoutedefault"),
          },
        ],
      ],
    },
  });

  template.hasResourceProperties("AWS::ApiGatewayV2::Integration", {
    ApiId: {
      Ref: apigwv2Catpure.asString(),
    },
    CredentialsArn: {
      "Fn::GetAtt": [Match.anyValue(), "Arn"],
    },
    IntegrationMethod: "POST",
    IntegrationType: "AWS",
    IntegrationUri: {
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
          ":sqs:path/",
          {
            Ref: "AWS::AccountId",
          },
          "/",
          {
            "Fn::GetAtt": [sqsQueueCapture.asString(), "QueueName"],
          },
        ],
      ],
    },
    PassthroughBehavior: "NEVER",
    RequestParameters: {
      "integration.request.header.Content-Type": "'application/x-www-form-urlencoded'",
    },
    RequestTemplates: {
      $default: DEFAULT_ROUTE_QUEUE_VTL_CONFIG,
    },
    TemplateSelectionExpression: "\\$default",
  });
});

test("creates API Gateway role and grants permissions and apigateway stage setup", () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, "TestStack");

  new apigwv2.WebSocketApi(stack, `WebSocketApi`, {
    apiName: "TestApi",
    connectRouteOptions: {
      integration: new WebSocketMockIntegration("connect-mock"),
      authorizer: new WebSocketIamAuthorizer(),
    },
    disconnectRouteOptions: {
      integration: new WebSocketMockIntegration("disconnect-mock"),
    },
    defaultRouteOptions: {
      integration: new WebSocketMockIntegration("default-mock"),
    },
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::ApiGatewayV2::Api", 1);
  template.resourceCountIs("AWS::ApiGatewayV2::Stage", 0);
  template.resourceCountIs('AWS::ApiGatewayV2::Integration', 3);
  template.allResourcesProperties('AWS::ApiGatewayV2::Integration', {
    IntegrationType: "MOCK"
  });
  template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
    ApiId: Match.anyValue(),
    AuthorizationType: "AWS_IAM",
    RouteKey: "$connect",
    Target: {
      "Fn::Join": ["", ["integrations/", { Ref: Match.stringLikeRegexp("WebSocketApiconnectRouteconnectmock") }]],
    },
  });

  template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
    ApiId: Match.anyValue(),
    RouteKey: "$disconnect",
    Target: {
      "Fn::Join": ["", ["integrations/", { Ref: Match.stringLikeRegexp("WebSocketApidisconnectRoutedisconnectmock") }]],
    },
  });

  template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
    ApiId: Match.anyValue(),
    RouteKey: "$default",
    Target: {
      "Fn::Join": ["", ["integrations/", { Ref: Match.stringLikeRegexp("WebSocketApidefaultRoutedefaultmock") }]],
    },
  });
});

test('buildWebSocketApiProps creates correct WebSocket API props', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack');
  const role = new iam.Role(stack, 'TestRole', {
    assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
  });
  const queue = new sqs.Queue(stack, 'TestQueue');

  const propsWithDefaultRoute = buildWebSocketApiProps(role, queue, true);
  expect(propsWithDefaultRoute.defaultRouteOptions).toBeDefined();
  expect(propsWithDefaultRoute.defaultRouteOptions).toEqual(
    buildWebSocketQueueRouteOptions(role, queue, { $default: DEFAULT_ROUTE_QUEUE_VTL_CONFIG })
  );

  const propsWithoutDefaultRoute = buildWebSocketApiProps(role, queue, false);
  expect(propsWithoutDefaultRoute.defaultRouteOptions).toBeUndefined();

  expect(() => buildWebSocketApiProps(role, undefined as any, true)).toThrowError(
    'role and sqs must be provided to create a default route'
  );
  expect(() => buildWebSocketApiProps(undefined as any, queue, true)).toThrowError(
    'role and sqs must be provided to create a default route'
  );
});