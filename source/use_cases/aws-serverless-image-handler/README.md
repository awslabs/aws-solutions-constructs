# AWS Serverless Image Handler

This use case construct implements an Amazon CloudFront distribution, an Amazon API Gateway REST API, an AWS Lambda
function, and necessary permissions/logic to provision a functional image handler API for serving image content from
one or more Amazon S3 buckets within the deployment account.

This use case is designed to serve as a reference for creating and using custom use case constructs. This
construct can be imported and used in a CDK project alongside other AWS Solutions Constructs and AWS CDK constructs.
You'll need to create a CDK project in your local development environment first in order to import and use this construct.
For information on setting up a CDK project, please see the [guide](https://docs.aws.amazon.com/cdk/latest/guide/hello_world.html) here.
Once your project is ready, you will need the AWS CDK Toolkit (or CLI) to build and deploy it from your local environment. For information on the toolkit and how to install and configure it, please see the [guide](https://docs.aws.amazon.com/cdk/latest/guide/cli.html) here.

## Setup
Before you can import and use this pattern in a CDK project, you'll need to set the proper Solutions Constructs and CDK dependency versions and then install them. Follow these steps to prepare the pattern for use:

```
# Set the proper version numbers in the package.json file
../../../deployment/v2/align-version.sh

# Install dependencies
npm install
```

Once you've aligned the version numbers and installed the dependencies, you can add the pattern to your CDK project using an import statement:
```typescript
import { ServerlessImageHandler } from '../aws-serverless-image-handler/lib/index';
```

You can then use the pattern in your CDK project code as shown below in the minimal deployable pattern definition (using TypeScript, in this example):
```typescript
new ServerlessImageHandler(this, 'ServerlessImageHandlerPattern', {
    lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_14_X,
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
&copy; Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.