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

import * as cdk from 'aws-cdk-lib';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sqs from 'aws-cdk-lib/aws-sqs';

import { WebSocketIamAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { WebSocketAwsIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function DefaultWebSocketApiProps(
  // TODO: role and sqsQueue are only used if createDefaultRoute is true, why are they required arguments?
  role: iam.Role,
  sqsQueue: sqs.Queue,
  requestTemplate?: { [contentType: string]: string },
  createDefaultRoute?: boolean
) {
  // TODO: Notes on this -
  // The Defaults functions in constructs always return a props
  // object sufficient to send to a constructor. Sometimes to to this they need
  // to accept some properfy values as arguments. In this case, we can't use partial because
  // the missing property is not at the top level, but connectorRouteOptions.integration.
  //
  // We need to change this to return a sufficiently populated  WebSocketApiProps object, which probably
  // means examining whatever the client sent in for for integration (which goes along with examining
  // the inputs and flagging insufficient info at the beginning of the construct constructor)

  // prettier-ignore
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // Sonar exception reason: - typescript:S6571 - required because we are not passing all values. Using partial may cause @jsii to not work.
  const websocketApiProps: any = { // NOSONAR
    defaultRouteOptions: createDefaultRoute ? DefaultWebSocketRouteOptions(role, sqsQueue, requestTemplate) : undefined,
    connectRouteOptions: {
      authorizer: DefaultWebSocketAuthorizer()
    }
  };

  return websocketApiProps;
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
function DefaultWebSocketAuthorizer(): WebSocketIamAuthorizer {
  const _websocketAthorizer = new WebSocketIamAuthorizer();
  return _websocketAthorizer;
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function DefaultWebSocketRouteOptions(
  role: iam.Role,
  sqsQueue: sqs.Queue,
  requestTemplate?: { [contentType: string]: string }
): apigwv2.WebSocketRouteOptions {
  return {
    integration: new WebSocketAwsIntegration('$default', {
      integrationMethod: apigwv2.HttpMethod.POST,
      integrationUri: `arn:${cdk.Aws.PARTITION}:apigateway:${cdk.Aws.REGION}:sqs:path/${cdk.Aws.ACCOUNT_ID}/${sqsQueue.queueName}`,
      requestTemplates: requestTemplate ?? {
        $default: // TODO: Pull this constant out
          "Action=SendMessage&MessageGroupId=$input.path('$.MessageGroupId')&MessageDeduplicationId=$context.requestId&MessageAttribute.1.Name=connectionId&MessageAttribute.1.Value.StringValue=$context.connectionId&MessageAttribute.1.Value.DataType=String&MessageAttribute.2.Name=requestId&MessageAttribute.2.Value.StringValue=$context.requestId&MessageAttribute.2.Value.DataType=String&MessageBody=$util.urlEncode($input.json($util.escapeJavaScript('$').replaceAll(\"\\\\'\",\"'\")))"
      },
      templateSelectionExpression: '\\$default',
      passthroughBehavior: apigwv2.PassthroughBehavior.NEVER,
      credentialsRole: role,
      requestParameters: {
        'integration.request.header.Content-Type': "'application/x-www-form-urlencoded'"
      }
    })
  };
}
