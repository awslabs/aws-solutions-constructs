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

import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { consolidateProps, addCfnSuppressRules } from './utils';
import { DefaultWebSocketApiProps } from './websocket-api-defaults';
import * as cdk from 'aws-cdk-lib';
import { buildLogGroup } from './cloudwatch-log-group-helper';

export interface BuildWebSocketQueueApiResponse {
  readonly webSocketApi: apigwv2.WebSocketApi,
  readonly webSocketStage: apigwv2.WebSocketStage,
  readonly apiGatewayRole: iam.Role,
  readonly apiGatewayLogGroup: logs.LogGroup
}

// TODO: consider whether existing queue prop can be IQueue instead of Queue
export interface BuildWebSocketQueueApiRequest {
  readonly queue: sqs.Queue,
  // TODO: Should we create an interface representing { [contentType: string]: string; }? It would be in code documentation
  readonly defaultRouteRequestTemplate?: { [contentType: string]: string; },
  readonly createDefaultRoute?: boolean,
  readonly webSocketApiProps?: apigwv2.WebSocketApiProps,
  readonly existingWebSocketApi?: apigwv2.WebSocketApi,
  readonly logGroupProps?: logs.LogGroupProps
}

export function buildWebSocketQueueApi(scope: Construct, id: string, props: BuildWebSocketQueueApiRequest): BuildWebSocketQueueApiResponse {
  // Setup the API Gateway role
  const apiGatewayRole = new iam.Role(scope, 'LambdaRestApiCloudWatchRole', {
    assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com')
  });
  props.queue.grantSendMessages(apiGatewayRole);
  // TODO: Dropped this to pass cfn-nag after discussion with Nihit, does everything still work?
  // const kmsKeyPolicyToAccessQueue = new iam.PolicyStatement({
  //   actions: ['kms:GenerateDataKey', 'kms:Decrypt'],
  //   resources: ['*']
  // });
  // apiGatewayRole.addToPolicy(kmsKeyPolicyToAccessQueue);

  const webSocketApi = buildApiGatewayV2WebSocket(scope, id, {
    webSocketApiProps: consolidateProps(
      DefaultWebSocketApiProps(
        apiGatewayRole,
        props.queue,
        props.defaultRouteRequestTemplate,
        props.createDefaultRoute
      ),
      props.webSocketApiProps
    ),
    existingWebSocketApi: props.existingWebSocketApi
  });

  const webSocketStage = new apigwv2.WebSocketStage(scope, 'Stage', {
    stageName: 'prod',
    webSocketApi,
    autoDeploy: true
  });

  const apiGatewayLogGroup = buildLogGroup(scope, 'LogGroup', props.logGroupProps);
  apiGatewayLogGroup.grant(
    apiGatewayRole,
    ...[
      'logs:CreateLogGroup',
      'logs:CreateLogStream',
      'logs:DescribeLogGroups',
      'logs:DescribeLogStreams',
      'logs:PutLogEvents',
      'logs:GetLogEvents',
      'logs:FilterLogEvents'
    ]
  );

  const _cfnStage: apigwv2.CfnStage = webSocketStage.node.defaultChild as apigwv2.CfnStage;
  _cfnStage.addPropertyOverride('AccessLogSettings', {
    DestinationArn: apiGatewayLogGroup.logGroupArn,
    Format: apigateway.AccessLogFormat.clf().toString()
  });
  _cfnStage.addPropertyOverride('DefaultRouteSettings', {
    DataTraceEnabled: false,
    DetailedMetricsEnabled: true,
    LoggingLevel: 'ERROR'
  });

  addCfnSuppressRules(webSocketStage, [
    {
      id: 'AwsSolutions-APIG1',
      reason: 'Access logging configuration has been provided as per ApiGateway v2 requirements'
    }
  ]);

  addCfnSuppressRules(
    apiGatewayRole.node.tryFindChild('DefaultPolicy')?.node.tryFindChild('Resource') as cdk.CfnResource,
    [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'The APIGateway requires permissions to KMS so that it can write to an encrypted SQS queue'
      }
    ]
  );

  return {
    webSocketApi,
    webSocketStage,
    apiGatewayRole,
    apiGatewayLogGroup
  };

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
