# aws-lambda-kinesisstream module
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
|![Python Logo](https://docs.aws.amazon.com/cdk/api/latest/img/python32.png) Python|`aws_solutions_constructs.aws_lambda_kinesis_stream`|
|![Typescript Logo](https://docs.aws.amazon.com/cdk/api/latest/img/typescript32.png) Typescript|`@aws-solutions-constructs/aws-lambda-kinesisstream`|
|![Java Logo](https://docs.aws.amazon.com/cdk/api/latest/img/java32.png) Java|`software.amazon.awsconstructs.services.lambdakinesisstream`|

## Overview
This AWS Solutions Construct deploys an AWS Lambda Function that can put records on an Amazon Kinesis Data Stream.

Here is a minimal deployable pattern definition:

Typescript
``` typescript
import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';
import { LambdaToKinesisStreamProps } from '@aws-solutions-constructs/aws-lambda-kinesisstream';
import * as lambda from 'aws-cdk-lib/aws-lambda';

new LambdaToKinesisStream(this, 'LambdaToKinesisStream', {
  lambdaFunctionProps: {
    runtime: lambda.Runtime.NODEJS_18_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`lambda`)
  }
});
```

Python
``` python
from aws_solutions_constructs.aws_lambda_kinesis_stream import LambdaToKinesisStream
from aws_cdk import (
    aws_lambda as _lambda,
    aws_kinesis as kinesis,
    Stack
)
from constructs import Construct

LambdaToKinesisStream(self, 'LambdaToKinesisStream',
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
import software.amazon.awscdk.services.lambda.eventsources.*;
import software.amazon.awscdk.services.lambda.Runtime;
import software.amazon.awsconstructs.services.lambdakinesisstream.*;

new LambdaToKinesisStream(this, "LambdaToKinesisStream", new LambdaToKinesisStreamProps.Builder()
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
|existingLambdaObj?|[`lambda.Function`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Function.html)|Existing instance of a Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.|
|lambdaFunctionProps?|[`lambda.FunctionProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.FunctionProps.html)|User provided props to override the default props for the Lambda Function.|
|existingStreamObj?|[`kinesis.Stream`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_kinesis.Stream.html)|Existing instance of a Kinesis Data Stream, providing both this and `kinesisStreamProps` will cause an error.|
|kinesisStreamProps?|[`kinesis.StreamProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_kinesis.StreamProps.html)|Optional user-provided props to override the default props for the Kinesis Data Stream.|
|createCloudWatchAlarms|`boolean`|Whether to create recommended CloudWatch Alarms (defaults to true).|

## Pattern Properties

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|lambdaFunction|[`lambda.Function`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Function.html)|Returns an instance of the Lambda Function.|
|kinesisStream|[`kinesis.Stream`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_kinesis.Stream.html)|Returns an instance of the Kinesis Data Stream.|
|cloudwatchAlarms?|[`cloudwatch.Alarm[]`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudwatch.Alarm.html)|Returns the CloudWatch Alarms created to monitor the Kinesis Data Stream.|

## Default settings

Out of the box implementation of the Construct without any overrides will set the following defaults:

### AWS Lambda Function
* Minimally-permissive IAM role for the Lambda Function to put records on the Kinesis Data Stream
* Enable X-Ray Tracing

### Amazon Kinesis Stream
* Enable server-side encryption for the Kinesis Data Stream using AWS Managed CMK
* Deploy best practices CloudWatch Alarms for the Kinesis Data Stream

## Architecture
![Architecture Diagram](architecture.png)

***
&copy; Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
