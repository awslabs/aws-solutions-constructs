# aws-apigateway-sqs module
<!--BEGIN STABILITY BANNER-->

---

![Stability: Stable](https://img.shields.io/badge/cfn--resources-stable-success.svg?style=for-the-badge)

---
<!--END STABILITY BANNER-->

| **Reference Documentation**:| <span style="font-weight: normal">https://docs.aws.amazon.com/solutions/latest/constructs/</span>|
|:-------------|:-------------|
<div style="height:8px"></div>

| **Language**     | **Package**        |
|:-------------|-----------------|
|![Python Logo](https://docs.aws.amazon.com/cdk/api/latest/img/python32.png) Python|`aws_solutions_constructs.aws_apigateway_sqs`|
|![Typescript Logo](https://docs.aws.amazon.com/cdk/api/latest/img/typescript32.png) Typescript|`@aws-solutions-constructs/aws-apigateway-sqs`|
|![Java Logo](https://docs.aws.amazon.com/cdk/api/latest/img/java32.png) Java|`software.amazon.awsconstructs.services.apigatewaysqs`|

## Overview

This AWS Solutions Construct implements an Amazon API Gateway connected to an Amazon SQS queue pattern.

Here is a minimal deployable pattern definition:

Typescript
``` typescript
import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';
import { ApiGatewayToSqs, ApiGatewayToSqsProps } from "@aws-solutions-constructs/aws-apigateway-sqs";

new ApiGatewayToSqs(this, 'ApiGatewayToSqsPattern', {});
```

Python
``` python
from aws_solutions_constructs.aws_apigateway_sqs import ApiGatewayToSqs
from aws_cdk import Stack
from constructs import Construct

ApiGatewayToSqs(self, 'ApiGatewayToSqsPattern')
```

Java
``` java
import software.constructs.Construct;

import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awsconstructs.services.apigatewaysqs.*;

new ApiGatewayToSqs(this, "ApiGatewayToSqsPattern", new ApiGatewayToSqsProps.Builder()
        .build());
```

## Pattern Construct Props

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|apiGatewayProps?|[`api.RestApiProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.RestApiProps.html)|Optional user-provided props to override the default props for the API Gateway.|
|queueProps?|[`sqs.QueueProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sqs.QueueProps.html)|Optional user-provided props to override the default props for the queue.|
|deployDeadLetterQueue?|`boolean`|Whether to deploy a secondary queue to be used as a dead letter queue. Defaults to `true`.|
|maxReceiveCount|`number`|The number of times a message can be unsuccessfully dequeued before being moved to the dead-letter queue.|
|allowCreateOperation?|`boolean`|Whether to deploy an API Gateway Method for POST HTTP operations on the queue (i.e. sqs:SendMessage).|
|createRequestTemplate?|`string`|API Gateway Request Template for the create method for the default `application/json` content-type. This property is required if the `allowCreateOperation` property is set to true.|
|additionalCreateRequestTemplates?|`{ [contentType: string]: string; }`|Optional Create Request Templates for content-types other than `application/json`. Use the `createRequestTemplate` property to set the request template for the `application/json` content-type. This property can only be specified if the `allowCreateOperation` property is set to true.|
|createIntegrationResponses?|[`api.IntegrationResponses[]`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.IntegrationResponse.html)|Optional, custom API Gateway Integration Response for the create method. This property can only be specified if the `allowCreateOperation` property is set to true.|
|createMethodResponses?|[`api.MethodResponses[]`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.MethodResponse.html)| Optional, custom API Gateway Method Responses for the create action. default: [{  statusCode: "200",  responseParameters: {    "method.response.header.Content-Type": true  }},{  statusCode: "500",  responseParameters: {    "method.response.header.Content-Type": true  } } ]|
|allowReadOperation?|`boolean`|Whether to deploy an API Gateway Method for GET HTTP operations on the queue (i.e. sqs:ReceiveMessage).|
|readRequestTemplate?|`string`|API Gateway Request Template for the read method for the default `application/json` content-type.|
|additionalReadRequestTemplates?|`{ [contentType: string]: string; }`|Optional Read Request Templates for content-types other than `application/json`. Use the `readRequestTemplate` property to set the request template for the `application/json` content-type.|
|readIntegrationResponses?|[`api.IntegrationResponses[]`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.IntegrationResponse.html)|Optional, custom API Gateway Integration Response for the read method.|
|readMethodResponses?|[`api.MethodResponses[]`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.MethodResponse.html)| Optional, custom API Gateway Method Responses for the read action. default: [{  statusCode: "200",  responseParameters: {    "method.response.header.Content-Type": true  }},{  statusCode: "500",  responseParameters: {    "method.response.header.Content-Type": true  } } ]|
|allowDeleteOperation?|`boolean`|Whether to deploy an API Gateway Method for HTTP DELETE operations on the queue (i.e. sqs:DeleteMessage).|
|deleteRequestTemplate?|`string`|API Gateway Request Template for THE delete method for the default `application/json` content-type. This property can only be specified if the `allowDeleteOperation` property is set to true.|
|additionalDeleteRequestTemplates?|`{ [contentType: string]: string; }`|Optional Delete request templates for content-types other than `application/json`. Use the `deleteRequestTemplate` property to set the request template for the `application/json` content-type. This property can only be specified if the `allowDeleteOperation` property is set to true.|
|deleteIntegrationResponses?|[`api.IntegrationResponses[]`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.IntegrationResponse.html)|Optional, custom API Gateway Integration Response for the delete method. This property can only be specified if the `allowDeleteOperation` property is set to true.|
|deleteMethodResponses?|[`api.MethodResponses[]`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.MethodResponse.html)| Optional, custom API Gateway Method Responses for the delete action. default: [{  statusCode: "200",  responseParameters: {    "method.response.header.Content-Type": true  }},{  statusCode: "500",  responseParameters: {    "method.response.header.Content-Type": true  } } ]|
|logGroupProps?|[`logs.LogGroupProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_logs.LogGroupProps.html)|User provided props to override the default props for for the CloudWatchLogs LogGroup.|
|enableEncryptionWithCustomerManagedKey?|`boolean`|If no key is provided, this flag determines whether the queue is encrypted with a new CMK or an AWS managed key. This flag is ignored if any of the following are defined: queueProps.encryptionMasterKey, encryptionKey or encryptionKeyProps.|
|encryptionKey?|[`kms.Key`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_kms.Key.html)|An optional, imported encryption key to encrypt the SQS Queue with.|
|encryptionKeyProps?|[`kms.KeyProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_kms.Key.html#construct-props)|Optional user provided properties to override the default properties for the KMS encryption key used to encrypt the SQS queue with.|

## Pattern Properties

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|apiGateway|[`api.RestApi`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.RestApi.html)|Returns an instance of the API Gateway REST API created by the pattern.|
|apiGatewayRole|[`iam.Role`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_iam.Role.html)|Returns an instance of the iam.Role created by the construct for API Gateway.|
|apiGatewayCloudWatchRole?|[`iam.Role`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_iam.Role.html)|Returns an instance of the iam.Role created by the construct for API Gateway for CloudWatch access.|
|apiGatewayLogGroup|[`logs.LogGroup`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_logs.LogGroup.html)|Returns an instance of the LogGroup created by the construct for API Gateway access logging to CloudWatch.|
|sqsQueue|[`sqs.Queue`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sqs.Queue.html)|Returns an instance of the SQS queue created by the pattern.|
|deadLetterQueue?|[`sqs.DeadLetterQueue`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sqs.DeadLetterQueue.html)|Returns an instance of the DeadLetterQueue created by the pattern.|

## Sample API Usage

| **Method** | **Request Path** | **Request Body** | **Queue Action** | **Description** |
|:-------------|:----------------|-----------------|-----------------|-----------------|
|GET|`/`| |`sqs::ReceiveMessage`|Retrieves a message from the queue.|
|POST|`/`| `{ "data": "Hello World!" }` |`sqs::SendMessage`|Delivers a message to the queue.|
|DELETE|`/message?receiptHandle=[value]`||`sqs::DeleteMessage`|Deletes a specified message from the queue|

## API Gateway Request/Response Template Properties Overview
This construct allows you to implement four DynamoDB API operations, CREATE/READ/DELETE (corresponding the HTTP POST/GET/DELETE requests respectively). They are completely independent and each follows the same pattern:
* Setting `allowCreateOperation` to true will implement the `application/json` content-type with default request and response templates
* The request template for `application/json` requests can be customized using the `createRequestTemplate` prop value
* *Additional* request templates can be specified using the `additionalCreateRequestTemplates` prop value. Note - these DO NOT replace the `application/json` content-type
* Customized integration responses can be specified for any content type in the `createIntegrationResponses` prop value.

Supplying any of these values without setting allowCreateOperation to true will result in an error. This pattern is the same for all four API operations.

## Default settings

Out of the box implementation of the Construct without any override will set the following defaults:

### Amazon API Gateway
* Deploy an edge-optimized API endpoint
* Enable CloudWatch logging for API Gateway
* Configure least privilege access IAM role for API Gateway
* Set the default authorizationType for all API methods to IAM
* Enable X-Ray Tracing

### Amazon SQS Queue
* Deploy SQS dead-letter queue for the source SQS Queue
* Enable server-side encryption for source SQS Queue using AWS Managed KMS Key
* Enforce encryption of data in transit

## Architecture
![Architecture Diagram](architecture.png)

***
&copy; Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
