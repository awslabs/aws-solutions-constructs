# aws-openapigateway-lambda module
<!--BEGIN STABILITY BANNER-->

---

![Stability: Experimental](https://img.shields.io/badge/stability-Experimental-important.svg?style=for-the-badge)

---
<!--END STABILITY BANNER-->

| **Reference Documentation**:| <span style="font-weight: normal">https://docs.aws.amazon.com/solutions/latest/constructs/</span>|
|:-------------|:-------------|
<div style="height:8px"></div>

| **Language**     | **Package**        |
|:-------------|-----------------|
|![Python Logo](https://docs.aws.amazon.com/cdk/api/latest/img/python32.png) Python|`aws_solutions_constructs.aws_openapigateway_lambda`|
|![Typescript Logo](https://docs.aws.amazon.com/cdk/api/latest/img/typescript32.png) Typescript|`@aws-solutions-constructs/aws-openapigateway-lambda`|
|![Java Logo](https://docs.aws.amazon.com/cdk/api/latest/img/java32.png) Java|`software.amazon.awsconstructs.services.openapigatewaylambda`|

## Overview

This AWS Solutions Construct implements an Amazon API Gateway REST API defined by an OpenAPI specificiation file connected to an AWS Lambda function.

Here is a minimal deployable pattern definition:

Typescript
``` typescript
import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';
import { ApiGatewayToLambda } from '@aws-solutions-constructs/aws-openapigateway-lambda';
import * as lambda from 'aws-cdk-lib/aws-lambda';

new OpenApiGatewayToLambda(this, 'OpenApiGatewayToLambda', {
  openApiSpecInputBucket: 's3-bucket-that-holds-openapi-spec-file',
  openApiSpecInputKey: 's3-object-key-of-openapi-spec-file',
  lambdaFunctionProps: {
    runtime: lambda.Runtime.NODEJS_18_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`lambda`)
  }
});
```

Python
``` python
from aws_solutions_constructs.aws_openapigateway_lambda import ApiGatewayToLambda
from aws_cdk import (
    aws_lambda as _lambda,
    Stack
)
from constructs import Construct

ApiGatewayToLambda(self, 'ApiGatewayToLambdaPattern',
  open_api_spec_input_bucket='s3-bucket-that-holds-openapi-spec-file',
  open_api_spec_input_key='s3-object-key-of-openapi-spec-file',
  lambda_function_props=_lambda.FunctionProps(
      runtime=_lambda.Runtime.PYTHON_3_9,
      handler='index.handler',
      code=_lambda.Code.from_asset('lambda')
  )
)
```

Java
``` java
import software.constructs.Construct;

import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.lambda.*;
import software.amazon.awscdk.services.lambda.Runtime;
import software.amazon.awsconstructs.services.openapigatewaylambda.*;

new ApiGatewayToLambda(this, "ApiGatewayToLambdaPattern", new ApiGatewayToLambdaProps.Builder()
        .openApiSpecInputBucket("s3-bucket-that-holds-openapi-spec-file")
        .openApiSpecInputKey("s3-object-key-of-openapi-spec-file")
        .lambdaFunctionProps(new FunctionProps.Builder()
          .runtime(Runtime.NODEJS_18_X)
          .code(Code.fromAsset("lambda"))
          .handler("index.handler")
          .build())
        .build());
```

## Pattern Construct Props

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|existingLambdaObj?|[`lambda.Function`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Function.html)|Existing instance of Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.|
|lambdaFunctionProps?|[`lambda.FunctionProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.FunctionProps.html)|User provided props to override the default props for the Lambda function.|
|apiGatewayProps?|[`apigateway.RestApiBaseProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.RestApiBaseProps.html)|Optional user-provided props to override the default props for the API.|
|openApiSpecInputBucket|`string`|S3 Bucket that holds the input OpenAPI spec file.|
|openApiSpecInputKey|`string`|S3 Object Key of the input OpenAPI spec file.|
|openApiSpecOutputBucket?|`string`|Optional S3 Bucket that holds the output (transformed) OpenAPI spec file that will be the input to the SpecRestApi. Defaults to the bucket specified in the `openApiSpecInputBucket` required property.|
|openApiSpecOutputKey|`string`|Optional S3 object key of the output OpenAPI spec file. Defaults to `openapi.spec`.|
|openApiSpecUriPlaceholder|`string`|Optional placeholder string that will be overwritten with the actual uri at deploy time. Defaults to `URI_PLACEHOLDER`. For example, if the openapi spec uses the `URI_PLACEHOLDER` string, it will be automatically transformed to: `arn:${partition}:apigateway:${region}:lambda:path/2015-03-31/functions/${lambdaProxyArn}/invocations`.|
|logGroupProps?|[`logs.LogGroupProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_logs.LogGroupProps.html)|User provided props to override the default props for for the CloudWatchLogs LogGroup.|

## Pattern Properties

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|lambdaFunction|[`lambda.Function`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Function.html)|Returns an instance of the Lambda function created by the pattern.|
|apiGateway|[`api.LambdaRestApi`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_openapigateway.LambdaRestApi.html)|Returns an instance of the API Gateway REST API created by the pattern.|
|apiGatewayCloudWatchRole?|[`iam.Role`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_iam.Role.html)|Returns an instance of the iam.Role created by the construct for API Gateway for CloudWatch access.|
|apiGatewayLogGroup|[`logs.LogGroup`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_logs.LogGroup.html)|Returns an instance of the LogGroup created by the construct for API Gateway access logging to CloudWatch.|

## Default settings

Out of the box implementation of the Construct without any override will set the following defaults:

### Amazon API Gateway
* Deploy an edge-optimized API endpoint
* Enable CloudWatch logging for API Gateway
* Configure least privilege access IAM role for API Gateway
* Set the default authorizationType for all API methods to IAM
* Enable X-Ray Tracing

### AWS Lambda Function
* Configure limited privilege access IAM role for Lambda function
* Enable reusing connections with Keep-Alive for NodeJs Lambda function
* Enable X-Ray Tracing
* Set Environment Variables
  * AWS_NODEJS_CONNECTION_REUSE_ENABLED (for Node 10.x and higher functions)

## Architecture
![Architecture Diagram](architecture.png)

***
&copy; Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.