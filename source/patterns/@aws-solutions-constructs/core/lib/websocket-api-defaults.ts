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
import { WebSocketIamAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { WebSocketMockIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';

/**
 * Velocity template transformation string that maps incoming request on the websocket to Amazon SQS Queue `sendMessage`
 * API call.
 */
export const DEFAULT_ROUTE_QUEUE_VTL_CONFIG =
  "Action=SendMessage&MessageGroupId=$input.path('$.MessageGroupId')&"
  + "MessageDeduplicationId=$context.requestId&"
  + "MessageAttribute.1.Name=connectionId&"
  + "MessageAttribute.1.Value.StringValue=$context.connectionId&"
  + "MessageAttribute.1.Value.DataType=String&MessageAttribute.2.Name=requestId&"
  + "MessageAttribute.2.Value.StringValue=$context.requestId&MessageAttribute.2.Value.DataType=String&"
  + "MessageBody=$util.urlEncode($input.json($util.escapeJavaScript('$').replaceAll(\"\\\\'\",\"'\")))";

/**
 * default property for `$connect` route options for a websocket
 */
export const connectRouteOptions: apigwv2.WebSocketRouteOptions = {
  integration: new WebSocketMockIntegration('connect'),
  authorizer: new WebSocketIamAuthorizer()
};
