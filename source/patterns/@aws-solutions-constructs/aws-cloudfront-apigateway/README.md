# aws-cloudfront-apigateway module
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
|![Python Logo](https://docs.aws.amazon.com/cdk/api/latest/img/python32.png) Python|`aws_solutions_constructs.aws_cloudfront_apigateway`|
|![Typescript Logo](https://docs.aws.amazon.com/cdk/api/latest/img/typescript32.png) Typescript|`@aws-solutions-constructs/aws-cloudfront-apigateway`|
|![Java Logo](https://docs.aws.amazon.com/cdk/api/latest/img/java32.png) Java|`software.amazon.awsconstructs.services.cloudfrontapigateway`|

This AWS Solutions Construct implements an AWS CloudFront fronting an Amazon API Gateway REST API.

Here is a minimal deployable pattern definition:

Typescript
``` typescript
import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';
import { CloudFrontToApiGateway } from '@aws-solutions-constructs/aws-cloudfront-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as api from 'aws-cdk-lib/aws-apigateway';

const lambdaProps: lambda.FunctionProps = {
  code: lambda.Code.fromAsset(`lambda`),
  runtime: lambda.Runtime.NODEJS_14_X,
  handler: 'index.handler'
};

const lambdafunction = new lambda.Function(this, 'LambdaFunction', lambdaProps);

const apiGatewayProps: api.LambdaRestApiProps = {
  handler: lambdafunction,
  endpointConfiguration: {
    types: [api.EndpointType.REGIONAL]
  },
  defaultMethodOptions: {
    authorizationType: api.AuthorizationType.NONE
  }
};

const apiGateway = new api.LambdaRestApi(this, 'LambdaRestApi', apiGatewayProps);

new CloudFrontToApiGateway(this, 'test-cloudfront-apigateway', {
  existingApiGatewayObj: apiGateway
});
```

Python
``` python
from aws_solutions_constructs.aws_cloudfront_apigateway import CloudFrontToApiGateway
from aws_cdk import (
    aws_lambda as _lambda,
    aws_apigateway as api,
    Stack
)
from constructs import Construct

lambda_function = _lambda.Function(self, 'LambdaFunction',
                                    code=_lambda.Code.from_asset(
                                        'lambda'),
                                    runtime=_lambda.Runtime.PYTHON_3_9,
                                    handler='index.handler')

api_gateway = api.LambdaRestApi(self, 'LambdaRestApi',
                                handler=lambda_function,
                                endpoint_configuration=api.EndpointConfiguration(
                                    types=[api.EndpointType.REGIONAL]
                                ),
                                default_method_options=api.MethodOptions(
                                    authorization_type=api.AuthorizationType.NONE
                                ))

CloudFrontToApiGateway(self, 'test-cloudfront-apigateway',
                        existing_api_gateway_obj=api_gateway
                        )
```

Java
``` java
import software.constructs.Construct;
import java.util.List;

import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.lambda.*;
import software.amazon.awscdk.services.lambda.Runtime;
import software.amazon.awscdk.services.apigateway.*;
import software.amazon.awsconstructs.services.cloudfrontapigateway.*;

final Function lambdaFunction = Function.Builder.create(this, "IndexHandler")
        .runtime(Runtime.NODEJS_14_X)
        .code(Code.fromAsset("lambda"))
        .handler("index.handler")
        .build();

final LambdaRestApi apiGateway = LambdaRestApi.Builder.create(this, "myapi")
        .handler(lambdaFunction)
        .endpointConfiguration(new EndpointConfiguration.Builder()
                .types(List.of(EndpointType.REGIONAL))
                .build())
        .build();

new CloudFrontToApiGateway(this, "test-cloudfront-apigateway", new CloudFrontToApiGatewayProps.Builder()
        .existingApiGatewayObj(apiGateway)
        .build());
```

## Pattern Construct Props

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|existingApiGatewayObj|[`api.RestApi`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigateway.RestApi.html)|The regional API Gateway that will be fronted with the CloudFront|
|cloudFrontDistributionProps?|[`cloudfront.DistributionProps \| any`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cloudfront.DistributionProps.html)|Optional user provided props to override the default props for CloudFront Distribution|
|insertHttpSecurityHeaders?|`boolean`|Optional user provided props to turn on/off the automatic injection of best practice HTTP security headers in all responses from CloudFront|
|cloudFrontLoggingBucketProps?|[`s3.BucketProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.BucketProps.html)|Optional user provided props to override the default props for the CloudFront Logging Bucket.|

## Pattern Properties

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|cloudFrontWebDistribution|[`cloudfront.CloudFrontWebDistribution`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cloudfront.CloudFrontWebDistribution.html)|Returns an instance of cloudfront.CloudFrontWebDistribution created by the construct|
|apiGateway|[`api.RestApi`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigateway.RestApi.html)|Returns an instance of the API Gateway REST API created by the pattern.|
|cloudFrontFunction?|[`cloudfront.Function`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cloudfront.Function.html)|Returns an instance of the Cloudfront function created by the pattern.|
|cloudFrontLoggingBucket|[`s3.Bucket`](https://docs.aws.amazon.com/cdk/api/latest/docs/aws-s3-readme.html)|Returns an instance of the logging bucket for CloudFront WebDistribution.|
## Default settings

Out of the box implementation of the Construct without any override will set the following defaults:

### Amazon CloudFront
* Configure Access logging for CloudFront WebDistribution
* Enable automatic injection of best practice HTTP security headers in all responses from CloudFront WebDistribution

### Amazon API Gateway
* User provided API Gateway object is used as-is
* Enable X-Ray Tracing

## Architecture
![Architecture Diagram](architecture.png)

***
&copy; Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
