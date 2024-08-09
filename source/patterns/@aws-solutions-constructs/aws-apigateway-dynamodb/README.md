# aws-apigateway-dynamodb module
<!--BEGIN STABILITY BANNER-->

---

![Stability: Experimental](https://img.shields.io/badge/stability-Experimental-important.svg?style=for-the-badge)

> All classes are under active development and subject to non-backward compatible changes or removal in any
> future version. These are not subject to the [Semantic Versioning](https://semver.org/) model.
> This means that while you may use them, you may need to update your source code when upgrading to a newer version of this package.

---
<!--END STABILITY BANNER-->

| **Reference Documentation**:| <span style="font-weight: normal">https://docs.aws.amazon.com/solutions/latest/constructs/</span>|
|:-------------|:-------------|
<div style="height:8px"></div>


| **Language**     | **Package**        |
|:-------------|-----------------|
|![Python Logo](https://docs.aws.amazon.com/cdk/api/latest/img/python32.png) Python|`aws_solutions_constructs.aws_apigateway_dynamodb`|
|![Typescript Logo](https://docs.aws.amazon.com/cdk/api/latest/img/typescript32.png) Typescript|`@aws-solutions-constructs/aws-apigateway-dynamodb`|
|![Java Logo](https://docs.aws.amazon.com/cdk/api/latest/img/java32.png) Java|`software.amazon.awsconstructs.services.apigatewaydynamodb`|

## Overview
This AWS Solutions Construct implements an Amazon API Gateway REST API connected to Amazon DynamoDB table.

Here is a minimal deployable pattern definition in:

Typescript
``` typescript
import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';
import { ApiGatewayToDynamoDBProps, ApiGatewayToDynamoDB } from "@aws-solutions-constructs/aws-apigateway-dynamodb";

new ApiGatewayToDynamoDB(this, 'test-api-gateway-dynamodb-default', {});
```

Python
``` python
from aws_solutions_constructs.aws_apigateway_dynamodb import ApiGatewayToDynamoDB
from aws_cdk import Stack
from constructs import Construct

ApiGatewayToDynamoDB(self, 'test-api-gateway-dynamodb-default')
```

Java
``` java
import software.constructs.Construct;

import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awsconstructs.services.apigatewaydynamodb.*;

new ApiGatewayToDynamoDB(this, "test-api-gateway-dynamodb-default", new ApiGatewayToDynamoDBProps.Builder()
        .build());
```

## Pattern Construct Props

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|dynamoTableProps?|[`dynamodb.TableProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.TableProps.html)|Optional user provided props to override the default props for DynamoDB Table.|
|existingTableObj?|[`dynamodb.Table`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.Table.html)|Existing instance of DynamoDB table object, providing both this and `dynamoTableProps` will cause an error.|
|apiGatewayProps?|[`api.RestApiProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.RestApiProps.html)|Optional user-provided props to override the default props for the API Gateway.|
|resourceName?|`string`|Optional name of the resource on the API Gateway. Defaults to the table's partitionKeyName|
|allowCreateOperation?|`boolean`|Whether to deploy an API Gateway Method for POST HTTP operations on the DynamoDB table (i.e. dynamodb:PutItem).|
|createRequestTemplate?|`string`|API Gateway Request Template for the create method for the default `application/json` content-type. This property is required if the `allowCreateOperation` property is set to true.|
|additionalCreateRequestTemplates?|`{ [contentType: string]: string; }`|Optional Create Request Templates for content-types other than `application/json`. Use the `createRequestTemplate` property to set the request template for the `application/json` content-type. This property can only be specified if the `allowCreateOperation` property is set to true.|
|createIntegrationResponses?|[`api.IntegrationResponses[]`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.IntegrationResponse.html)|Optional, custom API Gateway Integration Response for the create method. This property can only be specified if the `allowCreateOperation` property is set to true.|
|createMethodResponses?|[`api.MethodResponses[]`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.MethodResponse.html)| Optional, custom API Gateway Method Responses for the create action. default: [{  statusCode: "200",  responseParameters: {    "method.response.header.Content-Type": true  }},{  statusCode: "500",  responseParameters: {    "method.response.header.Content-Type": true  } } ]|
|allowReadOperation?|`boolean`|Whether to deploy an API Gateway Method for GET HTTP operations on DynamoDB table (i.e. dynamodb:Query).|
|readRequestTemplate?|`string`|API Gateway Request Template for the read method for the default `application/json` content-type. The default template only supports a partition key and not partition + sort keys.|
|additionalReadRequestTemplates?|`{ [contentType: string]: string; }`|Optional Read Request Templates for content-types other than `application/json`. Use the `readRequestTemplate` property to set the request template for the `application/json` content-type.|
|readIntegrationResponses?|[`api.IntegrationResponses[]`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.IntegrationResponse.html)|Optional, custom API Gateway Integration Response for the read method.|
|allowUpdateOperation?|`boolean`|Whether to deploy API Gateway Method for PUT HTTP operations on DynamoDB table (i.e. dynamodb:UpdateItem).|
|readMethodResponses?|[`api.MethodResponses[]`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.MethodResponse.html)| Optional, custom API Gateway Method Responses for the read action. default: [{  statusCode: "200",  responseParameters: {    "method.response.header.Content-Type": true  }},{  statusCode: "500",  responseParameters: {    "method.response.header.Content-Type": true  } } ]|
|updateRequestTemplate?|`string`|API Gateway Request Template for the update method. This property is required if the `allowUpdateOperation` property is set to true.|
|additionalUpdateRequestTemplates?|`{ [contentType: string]: string; }`|Optional Update Request Templates for content-types other than `application/json`. Use the `updateRequestTemplate` property to set the request template for the `application/json` content-type. This property can only be specified if the `allowUpdateOperation` property is set to true.|
|updateIntegrationResponses?|[`api.IntegrationResponses[]`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.IntegrationResponse.html)|Optional, custom API Gateway Integration Response for the update method. This property can only be specified if the `allowUpdateOperation` property is set to true.|
|updateMethodResponses?|[`api.MethodResponses[]`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.MethodResponse.html)| Optional, custom API Gateway Method Responses for the update action. default: [{  statusCode: "200",  responseParameters: {    "method.response.header.Content-Type": true  }},{  statusCode: "500",  responseParameters: {    "method.response.header.Content-Type": true  } } ]|
|allowDeleteOperation?|`boolean`|Whether to deploy API Gateway Method for DELETE HTTP operations on DynamoDB table (i.e. dynamodb:DeleteItem).|
|deleteRequestTemplate?|`string`|API Gateway Request Template for the delete method for the default `application/json` content-type. |
|additionalDeleteRequestTemplates?|`{ [contentType: string]: string; }`|Optional Delete request templates for content-types other than `application/json`. Use the `deleteRequestTemplate` property to set the request template for the `application/json` content-type. This property can only be specified if the `allowDeleteOperation` property is set to true.|
|deleteIntegrationResponses?|[`api.IntegrationResponses[]`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.IntegrationResponse.html)|Optional, custom API Gateway Integration Response for the delete method. This property can only be specified if the `allowDeleteOperation` property is set to true.|
|deleteMethodResponses?|[`api.MethodResponses[]`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.MethodResponse.html)| Optional, custom API Gateway Method Responses for the delete action. default: [{  statusCode: "200",  responseParameters: {    "method.response.header.Content-Type": true  }},{  statusCode: "500",  responseParameters: {    "method.response.header.Content-Type": true  } } ]|
|logGroupProps?|[`logs.LogGroupProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_logs.LogGroupProps.html)|User provided props to override the default props for for the CloudWatchLogs LogGroup.|

## Pattern Properties

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|apiGateway|[`api.RestApi`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.RestApi.html)|Returns an instance of the api.RestApi created by the construct.|
|apiGatewayRole|[`iam.Role`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_iam.Role.html)|Returns an instance of the iam.Role created by the construct for API Gateway.|
|dynamoTable|[`dynamodb.Table`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.Table.html)|Returns an instance of dynamodb.Table created by the construct.|
|apiGatewayCloudWatchRole?|[`iam.Role`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_iam.Role.html)|Returns an instance of the iam.Role created by the construct for API Gateway for CloudWatch access.|
|apiGatewayLogGroup|[`logs.LogGroup`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_logs.LogGroup.html)|Returns an instance of the LogGroup created by the construct for API Gateway access logging to CloudWatch.|

## API Gateway Request/Response Template Properties Overview
This construct allows you to implement four DynamoDB API operations, CREATE/READ/UPDATE/DELETE (corresponding the HTTP POST/GET/PUT/DELETE requests respectively). They are completely independent and each follows the same pattern:
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

### Amazon DynamoDB Table
* Set the billing mode for DynamoDB Table to On-Demand (Pay per request)
* Enable server-side encryption for DynamoDB Table using AWS managed KMS Key
* Creates a partition key called 'id' for DynamoDB Table
* Retain the Table when deleting the CloudFormation stack
* Enable continuous backups and point-in-time recovery

## Architecture
![Architecture Diagram](architecture.png)

***
&copy; Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
