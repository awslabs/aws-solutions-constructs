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
import { WebSocketMockIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as defaults from "../";
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { WebSocketIamAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";

test("Test default VTL transformation config", () => {
  const config = defaults.DEFAULT_ROUTE_QUEUE_VTL_CONFIG;
  expect(config).toMatch(
    "Action=SendMessage&MessageGroupId=$input.path('$.MessageGroupId')&MessageDeduplicationId=$context.requestId&MessageAttribute.1.Name=connectionId&MessageAttribute.1.Value.StringValue=$context.connectionId&MessageAttribute.1.Value.DataType=String&MessageAttribute.2.Name=requestId&MessageAttribute.2.Value.StringValue=$context.requestId&MessageAttribute.2.Value.DataType=String&MessageBody=$util.urlEncode($input.json($util.escapeJavaScript('$').replaceAll(\"\\\\'\",\"'\")))"
  );
});

test('Test connect route options', () => {
  expect(defaults.connectRouteOptions).toStrictEqual({
    integration: new WebSocketMockIntegration('connect'),
    authorizer: new WebSocketIamAuthorizer()
  } as apigwv2.WebSocketRouteOptions);
});