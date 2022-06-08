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
import * as sqs from "@aws-cdk/aws-sqs";

test('Test deployment w/o DLQ', () => {
  const stack = new Stack();

  new ApiGatewayToSqs(stack, 'api-gateway-sqs', {
    deployDeadLetterQueue: false
  });

  expect(stack).toHaveResourceLike("AWS::ApiGateway::Method", {
    HttpMethod: "GET",
    AuthorizationType: "AWS_IAM"
  });
});

test('Test deployment w/o allowReadOperation', () => {
  const stack = new Stack();

  new ApiGatewayToSqs(stack, 'api-gateway-sqs', {
    allowCreateOperation: true,
    allowReadOperation: false,
  });

  expect(stack).toHaveResourceLike("AWS::ApiGateway::Method", {
    HttpMethod: "POST",
    AuthorizationType: "AWS_IAM"
  });
});

test('Test deployment w/ allowReadOperation', () => {
  const stack = new Stack();

  new ApiGatewayToSqs(stack, 'api-gateway-sqs', {
    allowReadOperation: true,
  });

  expect(stack).toHaveResourceLike("AWS::ApiGateway::Method", {
    HttpMethod: "GET",
    AuthorizationType: "AWS_IAM"
  });
});

test('Test properties', () => {
  const stack = new Stack();

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

test('Test deployment ApiGateway AuthorizationType override', () => {
  const stack = new Stack();

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

test('Test deployment for override ApiGateway createRequestTemplate', () => {
  const stack = new Stack();

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

test('Test deployment for override ApiGateway getRequestTemplate', () => {
  const stack = new Stack();

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

test('Test deployment for override ApiGateway deleteRequestTemplate', () => {
  const stack = new Stack();

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

test('Test deployment with existing queue object', () => {
  const stack = new Stack();

  const existingQueueObj = new sqs.Queue(stack, 'existing-queue', {
    fifo: true
  });

  new ApiGatewayToSqs(stack, 'api-gateway-sqs', {
    existingQueueObj
  });

  expect(stack).toHaveResourceLike("AWS::SQS::Queue", {
    FifoQueue: true
  });

  expect(stack).toCountResources("AWS::SQS::Queue", 1);
});