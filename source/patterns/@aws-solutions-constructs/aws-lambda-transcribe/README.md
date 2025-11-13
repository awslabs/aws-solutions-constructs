# aws-lambda-transcribe module

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
|![Python Logo](https://docs.aws.amazon.com/cdk/api/latest/img/python32.png) Python|`aws_solutions_constructs.aws_lambda_transcribe`|
|![Typescript Logo](https://docs.aws.amazon.com/cdk/api/latest/img/typescript32.png) Typescript|`@aws-solutions-constructs/aws-lambda-transcribe`|
|![Java Logo](https://docs.aws.amazon.com/cdk/api/latest/img/java32.png) Java|`software.amazon.awsconstructs.services.lambdatranscribe`|

## Overview
This AWS Solutions Construct implements an AWS Lambda function connected to Amazon S3 buckets for use with Amazon Transcribe.

Here is a minimal deployable pattern definition:

Typescript
``` typescript
import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';
import { LambdaToTranscribe } from '@aws-solutions-constructs/aws-lambda-transcribe';
import * as lambda from 'aws-cdk-lib/aws-lambda';

new LambdaToTranscribe(this, 'LambdaToTranscribePattern', {
    lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(`lambda`)
    }
});
```

Python
``` python
from aws_solutions_constructs.aws_lambda_transcribe import LambdaToTranscribe
from aws_cdk import (
    aws_lambda as _lambda,
    Stack
)
from constructs import Construct

LambdaToTranscribe(self, 'LambdaToTranscribePattern',
        lambda_function_props=_lambda.FunctionProps(
            code=_lambda.Code.from_asset('lambda'),
            runtime=_lambda.Runtime.PYTHON_3_11,
            handler='index.handler'
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
import software.amazon.awsconstructs.services.lambdatranscribe.*;

new LambdaToTranscribe(this, "LambdaToTranscribePattern", new LambdaToTranscribeProps.Builder()
        .lambdaFunctionProps(new FunctionProps.Builder()
                .runtime(Runtime.NODEJS_20_X)
                .code(Code.fromAsset("lambda"))
                .handler("index.handler")
                .build())
        .build());
```

## Pattern Construct Props

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|existingLambdaObj?|[`lambda.Function`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Function.html)|Existing instance of Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.|
|lambdaFunctionProps?|[`lambda.FunctionProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.FunctionProps.html)|Optional user provided props to override the default props for the Lambda function.|
|existingSourceBucketObj?|[`s3.IBucket`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.IBucket.html)|Existing instance of S3 Bucket object for source audio files.|
|sourceBucketProps?|[`s3.BucketProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.BucketProps.html)|Optional user provided props to override the default props for the source S3 Bucket.|
|existingDestinationBucketObj?|[`s3.IBucket`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.IBucket.html)|Existing instance of S3 Bucket object for transcription results.|
|destinationBucketProps?|[`s3.BucketProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.BucketProps.html)|Optional user provided props to override the default props for the destination S3 Bucket.|
|useSameBucket?|`boolean`|Whether to use the same S3 bucket for both source and destination files. Default: false|

## Pattern Properties

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|lambdaFunction|[`lambda.Function`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Function.html)|Returns an instance of the Lambda function created by the pattern.|
|sourceBucket?|[`s3.Bucket`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.Bucket.html)|Returns an instance of the source S3 bucket created by the pattern.|
|destinationBucket?|[`s3.Bucket`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.Bucket.html)|Returns an instance of the destination S3 bucket created by the pattern.|

## Default settings

Out of the box implementation of the Construct without any override will set the following defaults:

### AWS Lambda Function
* Configure limited privilege access IAM role for Lambda function
* Enable reusing connections with Keep-Alive for NodeJs Lambda function
* Enable X-Ray Tracing
* Set Environment Variables
  * SOURCE_BUCKET_NAME
  * DESTINATION_BUCKET_NAME
  * AWS_NODEJS_CONNECTION_REUSE_ENABLED (for Node 10.x and higher functions)
* Grant permissions to use Amazon Transcribe service, write to source bucket, and read from destination bucket

### Amazon S3 Buckets
* Configure Access logging for both S3 Buckets
* Enable server-side encryption for both S3 Buckets using AWS managed KMS Key
* Enforce encryption of data in transit
* Turn on the versioning for both S3 Buckets
* Don't allow public access for both S3 Buckets
* Retain the S3 Buckets when deleting the CloudFormation stack

### Amazon Transcribe Service
* The Transcribe service will have read access to the source bucket and write permissions to the destination bucket
* Lambda function will have permissions to start transcription jobs, get job status, and list transcription jobs

## Architecture
![Architecture Diagram](architecture.png)

***
&copy; Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
