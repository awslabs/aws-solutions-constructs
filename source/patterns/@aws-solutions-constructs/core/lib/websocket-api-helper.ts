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
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import { WebSocketAwsIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { buildLogGroup } from "./cloudwatch-log-group-helper";
import { addCfnGuardSuppressRules, addCfnSuppressRules, consolidateProps, printWarning } from "./utils";
import { connectRouteOptions, DEFAULT_ROUTE_QUEUE_VTL_CONFIG } from "./websocket-api-defaults";

export interface BuildWebSocketQueueApiResponse {
  readonly webSocketApi: apigwv2.WebSocketApi;
  readonly webSocketStage: apigwv2.WebSocketStage;
  readonly apiGatewayRole: iam.Role;
  readonly apiGatewayLogGroup: logs.LogGroup;
}

export interface BuildWebSocketApiProps {
  /**
   * Existing instance of ApiGateway v2 WebSocket
   */
  readonly existingWebSocketApi?: apigwv2.WebSocketApi;

  /**
   * User provided properties of Apigateway v2 WebSocket
   */
  readonly webSocketApiProps?: apigwv2.WebSocketApiProps;
}

export interface BuildWebSocketQueueApiRequest {
  readonly queue: sqs.IQueue;
  readonly defaultRouteRequestTemplate?: { [contentType: string]: string };
  readonly createDefaultRoute?: boolean;
  readonly webSocketApiProps?: apigwv2.WebSocketApiProps;
  readonly existingWebSocketApi?: apigwv2.WebSocketApi;
  readonly logGroupProps?: logs.LogGroupProps;
  readonly defaultIamAuthorization?: boolean;
  readonly customRouteName?: string;
}
/**
 * Builds an AWS API Gateway WebSocket API integrated with an Amazon SQS queue.
 *
 * @param scope The construct scope where the resources will be created.
 * @param id The unique ID for the resources.
 * @param props The configuration properties for the WebSocket API and SQS queue integration.
 * @returns
 */
export function buildWebSocketQueueApi(
  scope: Construct,
  id: string,
  props: BuildWebSocketQueueApiRequest
): BuildWebSocketQueueApiResponse {
  // Setup the API Gateway role
  const apiGatewayRole = new iam.Role(scope, "LambdaRestApiCloudWatchRole", {
    assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
  });
  props.queue.grantSendMessages(apiGatewayRole);
  const finalProps = consolidateProps(
    buildWebSocketApiProps(
      apiGatewayRole,
      props.queue,
      props.createDefaultRoute,
      props.defaultRouteRequestTemplate,
      props.defaultIamAuthorization
    ),
    props.webSocketApiProps
  ) as apigwv2.WebSocketApiProps;
  const webSocketApi = buildApiGatewayV2WebSocket(scope, id, {
    webSocketApiProps: finalProps,
    existingWebSocketApi: props.existingWebSocketApi,
  });

  if (props.customRouteName) {
    webSocketApi.addRoute(
      props.customRouteName,
      buildWebSocketQueueRouteOptions(apiGatewayRole, props.queue, props.customRouteName)
    );
  }

  if (
    props.existingWebSocketApi === undefined &&
    props.defaultIamAuthorization === false &&
    finalProps.connectRouteOptions?.authorizer === undefined
  ) {
    printWarning(
      "This construct will create a WebSocket with NO Authorizer (defaultIamAuthorization is set to false)."
    );
  }

  const webSocketStage = new apigwv2.WebSocketStage(scope, "Stage", {
    stageName: "prod",
    webSocketApi,
    autoDeploy: true,
  });

  addCfnGuardSuppressRules(webSocketStage, ["API_GW_CACHE_ENABLED_AND_ENCRYPTED"]);

  const apiGatewayLogGroup = buildLogGroup(scope, "LogGroup", props.logGroupProps);
  apiGatewayLogGroup.grant(
    apiGatewayRole,
    "logs:CreateLogGroup",
    "logs:CreateLogStream",
    "logs:DescribeLogGroups",
    "logs:DescribeLogStreams",
    "logs:PutLogEvents",
    "logs:GetLogEvents",
    "logs:FilterLogEvents"
  );

  const cfnStage: apigwv2.CfnStage = webSocketStage.node.defaultChild as apigwv2.CfnStage;
  cfnStage.addPropertyOverride("AccessLogSettings", {
    DestinationArn: apiGatewayLogGroup.logGroupArn,
    Format: apigateway.AccessLogFormat.clf().toString(),
  });
  cfnStage.addPropertyOverride("DefaultRouteSettings", {
    DataTraceEnabled: false,
    DetailedMetricsEnabled: true,
    LoggingLevel: "ERROR",
  });

  addCfnSuppressRules(webSocketStage, [
    {
      id: "AwsSolutions-APIG1",
      reason: "Access logging configuration has been provided as per ApiGateway v2 requirements",
    },
  ]);

  addCfnSuppressRules(
    apiGatewayRole.node.tryFindChild("DefaultPolicy")?.node.tryFindChild("Resource") as cdk.CfnResource,
    [
      {
        id: "AwsSolutions-IAM5",
        reason: "The APIGateway requires permissions to KMS so that it can write to an encrypted SQS queue",
      },
    ]
  );

  return {
    webSocketApi,
    webSocketStage,
    apiGatewayRole,
    apiGatewayLogGroup,
  };
}

/**
 * build ApiGateway v2 WebSocket L2 construct. If existing WebSocketApi instance is provided, it returns that instance,
 * if not, it creates a new WebSocketApi using the user provided props.
 *
 * @param scope
 * @param props
 * @returns
 */
function buildApiGatewayV2WebSocket(scope: Construct, id: string, props: BuildWebSocketApiProps): apigwv2.WebSocketApi {
  if (props.existingWebSocketApi) {
    return props.existingWebSocketApi;
  } else {
    return new apigwv2.WebSocketApi(scope, `WebSocketApi${id}`, props.webSocketApiProps);
  }
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function buildWebSocketApiProps(
  role?: iam.Role,
  sqsQueue?: sqs.IQueue,
  createDefaultRoute?: boolean,
  requestTemplate?: { [contentType: string]: string },
  defaultIamAuthorization?: boolean
): apigwv2.WebSocketApiProps {
  if (createDefaultRoute) {
    if (!role || !sqsQueue) {
      throw new Error("role and sqs must be provided to create a default route");
    }
  }

  // prettier-ignore
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // Sonar exception reason: - typescript:S6571 - required because we are not passing all values. Using partial may cause @jsii to not work.
  const websocketApiProps: apigwv2.WebSocketApiProps = { // NOSONAR
    defaultRouteOptions: createDefaultRoute ? buildWebSocketQueueRouteOptions(role!, sqsQueue!, '$default', requestTemplate) : undefined,
    connectRouteOptions: (defaultIamAuthorization === undefined || defaultIamAuthorization === true) ? connectRouteOptions : undefined
  };
  return websocketApiProps;
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function buildWebSocketQueueRouteOptions(
  role: iam.Role,
  sqsQueue: sqs.IQueue,
  routeName: string,
  requestTemplate?: { [contentType: string]: string }
): apigwv2.WebSocketRouteOptions {
  return {
    integration: new WebSocketAwsIntegration(routeName, {
      integrationMethod: apigwv2.HttpMethod.POST,
      integrationUri: `arn:${cdk.Aws.PARTITION}:apigateway:${cdk.Aws.REGION}:sqs:path/${cdk.Aws.ACCOUNT_ID}/${sqsQueue.queueName}`,
      requestTemplates: requestTemplate ?? {
        [routeName === "$default" ? "$default" : routeName]: DEFAULT_ROUTE_QUEUE_VTL_CONFIG,
      },
      templateSelectionExpression: routeName === "$default" ? "\\$default" : routeName,
      passthroughBehavior: apigwv2.PassthroughBehavior.NEVER,
      credentialsRole: role,
      requestParameters: {
        "integration.request.header.Content-Type": "'application/x-www-form-urlencoded'",
      },
    }),
  };
}
