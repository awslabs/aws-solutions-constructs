# aws-cloudfront-apigateway-lambda module
<!--BEGIN STABILITY BANNER-->

---

![Stability: Experimental](https://img.shields.io/badge/stability-Experimental-important.svg?style=for-the-badge)

> **This is a _developer preview_ (public beta) module.**
>
> All classes are under active development and subject to non-backward compatible changes or removal in any
> future version. These are not subject to the [Semantic Versioning](https://semver.org/) model.
> This means that while you may use them, you may need to update your source code when upgrading to a newer version of this package.

---
<!--END STABILITY BANNER-->

| **API Reference**:| <span style="font-weight: normal">http://docs.awssolutionsbuilder.com/aws-solutions-konstruk/latest/api/aws-cloudfront-apigateway-lambda/</span>|
|:-------------|:-------------|
<div style="height:8px"></div>

| **Language**     | **Package**        |
|:-------------|-----------------|
|![Python Logo](https://docs.aws.amazon.com/cdk/api/latest/img/python32.png){: style="height:16px;width:16px"} Python|`aws_solutions_konstruk.aws_cloudfront_apigateway_lambda`|
|![Typescript Logo](https://docs.aws.amazon.com/cdk/api/latest/img/typescript32.png){: style="height:16px;width:16px"} Typescript|`@aws-solutions-konstruk/aws-cloudfront-apigateway-lambda`|

This AWS Solutions Konstruk implements an AWS Cloudfront fronting an Amazon API Gateway Lambda backed REST API.

Here is a minimal deployable pattern definition:

``` javascript
import * as defaults from '@aws-solutions-konstruk/core';
import { CloudFrontToApiGatewayToLambda } from '@aws-solutions-konstruk/aws-cloudfront-apigateway-lambda';

const stack = new Stack();

const lambdaProps: lambda.FunctionProps = {
    code: lambda.Code.asset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_12_X,
    handler: 'index.handler'
};

new CloudFrontToApiGatewayToLambda(stack, 'test-cloudfront-apigateway-lambda', {
    lambdaFunctionProps: lambdaProps,
    deployLambda: true
});
```

## Initializer

``` text
new CloudFrontToApiGatewayToLambda(scope: Construct, id: string, props: CloudFrontToApiGatewayToLambdaProps);
```

_Parameters_

* scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.Construct.html)
* id `string`
* props [`CloudFrontToApiGatewayToLambdaProps`](#pattern-construct-props)

## Pattern Construct Props

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|deployLambda|`boolean`|Whether to create a new Lambda function or use an existing Lambda function|
|existingLambdaObj?|[`lambda.Function`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.Function.html)|Existing instance of Lambda Function object|
|lambdaFunctionProps?|[`lambda.FunctionProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.FunctionProps.html)|Optional user provided props to override the default props for Lambda function|
|apiGatewayProps?|[`api.LambdaRestApiProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigateway.LambdaRestApiProps.html)|Optional user provided props to override the default props for API Gateway|
|cloudFrontDistributionProps?|[`cloudfront.CloudFrontWebDistributionProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cloudfront.CloudFrontWebDistributionProps.html)|Optional user provided props to override the default props for Cloudfront Distribution|

## Pattern Properties

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|cloudFrontWebDistribution()|[`cloudfront.CloudFrontWebDistribution`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cloudfront.CloudFrontWebDistribution.html)|Retruns an instance of cloudfront.CloudFrontWebDistribution created by the construct|
|lambdaFunction()|[`lambda.Function`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.Function.html)|Returns an instance of the Lambda function created by the pattern.|
|restApi()|[`api.RestApi`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigateway.RestApi.html)|Returns an instance of the API Gateway REST API created by the pattern.|

## Architecture
![Architecture Diagram](architecture.png)

***
&copy; Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.