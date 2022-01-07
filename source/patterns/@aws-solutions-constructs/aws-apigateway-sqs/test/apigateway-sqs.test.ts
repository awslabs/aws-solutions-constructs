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
import { Stack } from "@aws-cdk/core";
import { ApiGatewayToSqs } from '../lib';
import '@aws-cdk/assert/jest';
import * as api from "@aws-cdk/aws-apigateway";

// --------------------------------------------------------------
// Test deployment w/o DLQ
// --------------------------------------------------------------
test('Test deployment w/o DLQ', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new ApiGatewayToSqs(stack, 'api-gateway-sqs', {
    deployDeadLetterQueue: false
  });

  expect(stack).toHaveResourceLike("AWS::ApiGateway::Method", {
    HttpMethod: "GET",
    AuthorizationType: "AWS_IAM"
  });
});

// --------------------------------------------------------------
// Test deployment w/o allowReadOperation
// --------------------------------------------------------------
test('Test deployment w/o allowReadOperation', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new ApiGatewayToSqs(stack, 'api-gateway-sqs', {
    allowCreateOperation: true,
    allowReadOperation: false,
  });

  expect(stack).toHaveResourceLike("AWS::ApiGateway::Method", {
    HttpMethod: "POST",
    AuthorizationType: "AWS_IAM"
  });
});

// --------------------------------------------------------------
// Test deployment w/ allowReadOperation
// --------------------------------------------------------------
test('Test deployment w/ allowReadOperation', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new ApiGatewayToSqs(stack, 'api-gateway-sqs', {
    allowReadOperation: true,
  });

  expect(stack).toHaveResourceLike("AWS::ApiGateway::Method", {
    HttpMethod: "GET",
    AuthorizationType: "AWS_IAM"
  });
});

// --------------------------------------------------------------
// Test the getter methods
// --------------------------------------------------------------
test('Test properties', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const pattern = new ApiGatewayToSqs(stack, 'api-gateway-sqs', {
    deployDeadLetterQueue: true,
    maxReceiveCount: 3
  });
    // Assertion 1
  expect(pattern.apiGateway !== null);
  // Assertion 2
  expect(pattern.sqsQueue !== null);
  // Assertion 3
  expect(pattern.apiGatewayRole !== null);
  expect(pattern.apiGatewayCloudWatchRole !== null);
  expect(pattern.apiGatewayLogGroup !== null);
  expect(pattern.deadLetterQueue !== null);
});

// -----------------------------------------------------------------
// Test deployment for override ApiGateway AuthorizationType to NONE
// -----------------------------------------------------------------
test('Test deployment ApiGateway AuthorizationType override', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new ApiGatewayToSqs(stack, 'api-gateway-sqs', {
    apiGatewayProps: {
      defaultMethodOptions: {
        authorizationType: api.AuthorizationType.NONE
      }
    },
    queueProps: {},
    createRequestTemplate: "{}",
    allowCreateOperation: true,
    allowReadOperation: false,
    allowDeleteOperation: true,
    deployDeadLetterQueue: false
  });
  // Assertion 1
  expect(stack).toHaveResourceLike("AWS::ApiGateway::Method", {
    HttpMethod: "POST",
    AuthorizationType: "NONE"
  });
  // Assertion 2
  expect(stack).toHaveResourceLike("AWS::ApiGateway::Method", {
    HttpMethod: "DELETE",
    AuthorizationType: "NONE"
  });
});

// -----------------------------------------------------------------
// Test deployment for override ApiGateway createRequestTemplate
// -----------------------------------------------------------------
test('Test deployment for override ApiGateway createRequestTemplate', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new ApiGatewayToSqs(stack, 'api-gateway-sqs', {
    createRequestTemplate:  "Action=SendMessage&MessageBody=$util.urlEncode(\"HelloWorld\")",
    allowCreateOperation: true
  });
  expect(stack).toHaveResourceLike("AWS::ApiGateway::Method", {
    HttpMethod: "POST",
    Integration: {
      RequestTemplates: {
        "application/json": "Action=SendMessage&MessageBody=$util.urlEncode(\"HelloWorld\")"
      }
    }
  });
});

// -----------------------------------------------------------------
// Test deployment for override ApiGateway getRequestTemplate
// -----------------------------------------------------------------
test('Test deployment for override ApiGateway getRequestTemplate', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new ApiGatewayToSqs(stack, 'api-gateway-sqs', {
    readRequestTemplate:  "Action=HelloWorld",
    allowReadOperation: true
  });
  expect(stack).toHaveResourceLike("AWS::ApiGateway::Method", {
    HttpMethod: "GET",
    Integration: {
      RequestTemplates: {
        "application/json": "Action=HelloWorld"
      }
    }
  });
});

// -----------------------------------------------------------------
// Test deployment for override ApiGateway deleteRequestTemplate
// -----------------------------------------------------------------
test('Test deployment for override ApiGateway deleteRequestTemplate', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new ApiGatewayToSqs(stack, 'api-gateway-sqs', {
    deleteRequestTemplate:  "Action=HelloWorld",
    allowDeleteOperation: true
  });
  expect(stack).toHaveResourceLike("AWS::ApiGateway::Method", {
    HttpMethod: "DELETE",
    Integration: {
      RequestTemplates: {
        "application/json": "Action=HelloWorld"
      }
    }
  });
});