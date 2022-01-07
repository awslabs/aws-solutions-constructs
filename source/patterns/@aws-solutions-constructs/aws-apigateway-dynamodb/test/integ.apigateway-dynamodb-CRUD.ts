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

// Imports
import { App, Stack } from "@aws-cdk/core";
import { ApiGatewayToDynamoDBProps, ApiGatewayToDynamoDB } from "../lib";
import { generateIntegStackName } from '@aws-solutions-constructs/core';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-apigateway-dynamodb';

// Definitions
const props: ApiGatewayToDynamoDBProps = {
  allowReadOperation: true,
  allowCreateOperation: true,
  allowDeleteOperation: true,
  allowUpdateOperation: true,
  createRequestTemplate: "{\r\n  \"TableName\": \"${Table}\",\r\n  \"Item\": {\r\n    \"id\": {\r\n      \"S\": \"$input.path('$.id')\"\r\n    },\r\n    \"EventCount\": {\r\n      \"N\": \"$input.path('$.EventCount')\"\r\n    },\r\n    \"Message\": {\r\n      \"S\": \"$input.path('$.Message')\"\r\n    }\r\n  }\r\n}",
  updateRequestTemplate: "{\r\n  \"TableName\": \"${Table}\",\r\n  \"Key\": {\r\n    \"id\": {\r\n      \"S\": \"$input.path('$.id')\"\r\n    }\r\n  },\r\n  \"ExpressionAttributeValues\": {\r\n    \":event_count\": {\r\n      \"N\": \"$input.path('$.EventCount')\"\r\n    },\r\n    \":message\": {\r\n      \"S\": \"$input.path('$.Message')\"\r\n    }\r\n  },\r\n  \"UpdateExpression\": \"ADD EventCount :event_count SET Message = :message\",\r\n  \"ReturnValues\": \"ALL_NEW\"\r\n}"
};

new ApiGatewayToDynamoDB(stack, 'test-api-gateway-dynamodb', props);

// Synth
app.synth();