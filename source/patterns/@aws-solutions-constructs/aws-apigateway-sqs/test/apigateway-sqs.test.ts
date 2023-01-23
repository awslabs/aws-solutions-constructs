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
import { Stack } from "aws-cdk-lib";
import { ApiGatewayToSqs } from '../lib';
import '@aws-cdk/assert/jest';
import * as api from "aws-cdk-lib/aws-apigateway";
import * as kms from 'aws-cdk-lib/aws-kms';
import * as sqs from "aws-cdk-lib/aws-sqs";

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

test('Queue is encrypted with imported CMK when set on encryptionKey prop', () => {
  const stack = new Stack();
  const cmk = new kms.Key(stack, 'cmk');
  new ApiGatewayToSqs(stack, 'api-gateway-sqs', {
    encryptionKey: cmk
  });

  expect(stack).toHaveResource("AWS::SQS::Queue", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "cmk01DE03DA",
        "Arn"
      ]
    }
  });
});

test('Queue is encrypted with imported CMK when set on queueProps.encryptionKeyProps prop', () => {
  const stack = new Stack();
  const cmk = new kms.Key(stack, 'cmk');
  new ApiGatewayToSqs(stack, 'api-gateway-sqs', {
    queueProps: {
      encryptionMasterKey: cmk
    }
  });

  expect(stack).toHaveResource("AWS::SQS::Queue", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "cmk01DE03DA",
        "Arn"
      ]
    }
  });
});

test('Queue is encrypted with provided encrytionKeyProps', () => {
  const stack = new Stack();
  new ApiGatewayToSqs(stack, 'api-gateway-sqs', {
    encryptionKeyProps: {
      alias: 'new-key-alias-from-props'
    }
  });

  expect(stack).toHaveResource("AWS::SQS::Queue", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "apigatewaysqsEncryptionKey4A698F7C",
        "Arn"
      ]
    }
  });

  expect(stack).toHaveResource('AWS::KMS::Alias', {
    AliasName: 'alias/new-key-alias-from-props',
    TargetKeyId: {
      'Fn::GetAtt': [
        'apigatewaysqsEncryptionKey4A698F7C',
        'Arn'
      ]
    }
  });
});

test('Queue is encrypted by default with AWS-managed KMS key when no other encryption properties are set', () => {
  const stack = new Stack();
  new ApiGatewayToSqs(stack, 'api-gateway-sqs', {});

  expect(stack).toHaveResource('AWS::SQS::Queue', {
    KmsMasterKeyId: "alias/aws/sqs"
  });
});

test('Queue is encrypted with customer managed KMS Key when enable encryption flag is true', () => {
  const stack = new Stack();
  new ApiGatewayToSqs(stack, 'api-gateway-sqs', {
    enableEncryptionWithCustomerManagedKey: true
  });

  expect(stack).toHaveResource("AWS::SQS::Queue", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "apigatewaysqsEncryptionKey4A698F7C",
        "Arn"
      ]
    }
  });
});

test('Construct accepts additional read request templates', () => {
  const stack = new Stack();
  new ApiGatewayToSqs(stack, 'api-gateway-sqs', {
    enableEncryptionWithCustomerManagedKey: true,
    additionalReadRequestTemplates: {
      'text/plain': 'Hello'
    }
  });

  expect(stack).toHaveResourceLike('AWS::ApiGateway::Method', {
    HttpMethod: 'GET',
    Integration: {
      RequestTemplates: {
        'application/json': 'Action=ReceiveMessage',
        'text/plain': 'Hello'
      }
    }
  });
});

test('Construct accepts additional create request templates', () => {
  const stack = new Stack();
  new ApiGatewayToSqs(stack, 'api-gateway-sqs', {
    enableEncryptionWithCustomerManagedKey: true,
    allowCreateOperation: true,
    additionalCreateRequestTemplates: {
      'text/plain': 'Hello'
    }
  });

  expect(stack).toHaveResourceLike('AWS::ApiGateway::Method', {
    HttpMethod: 'POST',
    Integration: {
      RequestTemplates: {
        'application/json': 'Action=SendMessage&MessageBody=$util.urlEncode(\"$input.body\")',
        'text/plain': 'Hello'
      }
    }
  });
});

test('Construct can override default create request template type', () => {
  const stack = new Stack();
  new ApiGatewayToSqs(stack, 'api-gateway-sqs', {
    enableEncryptionWithCustomerManagedKey: true,
    allowCreateOperation: true,
    createRequestTemplate: 'Hello',
    additionalCreateRequestTemplates: {
      'text/plain': 'Goodbye'
    }
  });

  expect(stack).toHaveResourceLike('AWS::ApiGateway::Method', {
    HttpMethod: 'POST',
    Integration: {
      RequestTemplates: {
        'application/json': 'Hello',
        'text/plain': 'Goodbye'
      }
    }
  });
});