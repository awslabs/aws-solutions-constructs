# AWS Serverless Image Handler

This use case construct implements an Amazon CloudFront distribution, an Amazon API Gateway REST API, an AWS Lambda
function, and necessary permissions/logic to provision a functional image handler API for serving image content from 
one or more Amazon S3 buckets within the deployment account.

> **Note:** This use case is designed to serve as a reference for creating and using use case constructs. This construct can be used with other AWS Solutions Constructs and AWS CDK construct to create a larger solution. Once your solution is ready, you will need the AWS CDK Toolkit (or CLI) to build and deploy it from your local environment. For information on the toolkit and how to install and configure it, please see the [guide](https://docs.aws.amazon.com/cdk/latest/guide/cli.html).

> **Note:** To ensure proper functionality, the AWS Solutions Constructs packages and AWS CDK packages in your project must be the same version. 

Here is a minimal deployable pattern definition in Typescript:

```javascript
const { ServerlessImageHandler } from '@aws-solutions-constructs/aws-serverless-image-handler';

new ServerlessImageHandler(this, 'ServerlessImageHandlerPattern', {
    lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_12_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    }
});

```

## Properties

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|existingLambdaObj?|[`lambda.Function`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.Function.html)|Existing instance of Lambda Function object, providing both this and lambdaFunctionProps will cause an error.|
|lambdaFunctionProps?|[`lambda.FunctionProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.FunctionProps.html)|User provided props to override the default props for the Lambda function.|
|apiGatewayProps?|`api.LambdaRestApiProps`|Optional user-provided props to override the default props for the API.|

## Architecture
![Architecture Diagram](architecture.png)

***
&copy; Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.