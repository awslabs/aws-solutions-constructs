# aws-cloudfront-apigateway module
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
|![Python Logo](https://docs.aws.amazon.com/cdk/api/latest/img/python32.png) Python|`aws_solutions_constructs.aws_cloudfront_apigateway`|
|![Typescript Logo](https://docs.aws.amazon.com/cdk/api/latest/img/typescript32.png) Typescript|`@aws-solutions-constructs/aws-cloudfront-apigateway`|
|![Java Logo](https://docs.aws.amazon.com/cdk/api/latest/img/java32.png) Java|`software.amazon.awsconstructs.services.cloudfrontapigateway`|

This AWS Solutions Construct implements an AWS CloudFront fronting an Amazon API Gateway REST API.

Here is a minimal deployable pattern definition:

``` javascript
const api = require('@aws-cdk/aws-apigateway');
const lambda = require("@aws-cdk/aws-lambda");
const { CloudFrontToApiGateway } = require('@aws-solutions-constructs/aws-cloudfront-apigateway');

const stack = new Stack();

const lambdaProps: lambda.FunctionProps = {
    code: lambda.Code.asset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_12_X,
    handler: 'index.handler'
};

const lambdafunction = new lambda.Function(stack, 'LambdaFunction', lambdaProps);

const apiGatewayProps: api.LambdaRestApiProps = {
        handler: lambdafunction,
        endpointConfiguration: {
            types: [api.EndpointType.REGIONAL]
        },
        defaultMethodOptions: {
            authorizationType: api.AuthorizationType.NONE
        }
};

const apiGateway = new api.LambdaRestApi(scope, 'LambdaRestApi', apiGatewayProps);

new CloudFrontToApiGateway(stack, 'test-cloudfront-apigateway', {
    existingApiGatewayObj: apiGateway
});

```

## Initializer

``` text
new CloudFrontToApiGateway(scope: Construct, id: string, props: CloudFrontToApiGatewayProps);
```

_Parameters_

* scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.Construct.html)
* id `string`
* props [`CloudFrontToApiGatewayProps`](#pattern-construct-props)

## Pattern Construct Props

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|existingApiGatewayObj|[`api.RestApi`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigateway.RestApi.html)|The regional API Gateway that will be fronted with the CloudFront|
|cloudFrontDistributionProps?|[`cloudfront.CloudFrontWebDistributionProps | any`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cloudfront.CloudFrontWebDistributionProps.html)|Optional user provided props to override the default props for CloudFront Distribution|
|insertHttpSecurityHeaders?|`boolean`|Optional user provided props to turn on/off the automatic injection of best practice HTTP security headers in all responses from CloudFront|
## Pattern Properties

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|cloudFrontWebDistribution|[`cloudfront.CloudFrontWebDistribution`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cloudfront.CloudFrontWebDistribution.html)|Returns an instance of cloudfront.CloudFrontWebDistribution created by the construct|
|apiGateway|[`api.RestApi`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigateway.RestApi.html)|Returns an instance of the API Gateway REST API created by the pattern.|
|edgeLambdaFunctionVersion|[`lambda.Version`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.Version.html)|Returns an instance of the edge Lambda function version created by the pattern.|
|cloudFrontLoggingBucket|[`s3.Bucket`](https://docs.aws.amazon.com/cdk/api/latest/docs/aws-s3-readme.html)|Returns an instance of the logging bucket for CloudFront WebDistribution.|
## Default settings

Out of the box implementation of the Construct without any override will set the following defaults:

### Amazon CloudFront
* Configure Access logging for CloudFront WebDistribution
* Enable automatic injection of best practice HTTP security headers in all responses from CloudFront WebDistribution

### Amazon API Gateway
* User provided API Gateway object is used as-is

## Architecture
![Architecture Diagram](architecture.png)

***
&copy; Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.