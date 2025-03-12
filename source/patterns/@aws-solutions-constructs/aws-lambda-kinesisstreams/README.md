# aws-lambda-kinesisstreams module
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
|![Python Logo](https://docs.aws.amazon.com/cdk/api/latest/img/python32.png) Python|`aws_solutions_constructs.aws_lambda_kinesis_stream`|
|![Typescript Logo](https://docs.aws.amazon.com/cdk/api/latest/img/typescript32.png) Typescript|`@aws-solutions-constructs/aws-lambda-kinesisstreams`|
|![Java Logo](https://docs.aws.amazon.com/cdk/api/latest/img/java32.png) Java|`software.amazon.awsconstructs.services.lambdakinesisstreams`|

## Overview
This AWS Solutions Construct deploys an AWS Lambda Function that can put records on an Amazon Kinesis Data Stream.

Here is a minimal deployable pattern definition:

Typescript
``` typescript
import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';
import { LambdaToKinesisStreamsProps } from '@aws-solutions-constructs/aws-lambda-kinesisstreams';
import * as lambda from 'aws-cdk-lib/aws-lambda';

new LambdaToKinesisStreams(this, 'LambdaToKinesisStreams', {
  lambdaFunctionProps: {
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`lambda`)
  }
});
```

Python
``` python
from aws_solutions_constructs.aws_lambda_kinesis_stream import LambdaToKinesisStreams
from aws_cdk import (
    aws_lambda as _lambda,
    aws_kinesis as kinesis,
    Stack
)
from constructs import Construct

LambdaToKinesisStreams(self, 'LambdaToKinesisStreams',
                        lambda_function_props=_lambda.FunctionProps(
                          runtime=_lambda.Runtime.PYTHON_3_11,
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
import software.amazon.awsconstructs.services.lambdakinesisstreams.*;

new LambdaToKinesisStreams(this, "LambdaToKinesisStreams", new LambdaToKinesisStreamsProps.Builder()
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
|existingLambdaObj?|[`lambda.Function`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Function.html)|Existing instance of a Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.|
|lambdaFunctionProps?|[`lambda.FunctionProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.FunctionProps.html)|User provided props to override the default props for the Lambda Function.|
|existingStreamObj?|[`kinesis.Stream`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_kinesis.Stream.html)|Existing instance of a Kinesis Data Stream, providing both this and `kinesisStreamProps` will cause an error.|
|kinesisStreamProps?|[`kinesis.StreamProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_kinesis.StreamProps.html)|Optional user-provided props to override the default props for the Kinesis Data Stream.|
|createCloudWatchAlarms|`boolean`|Whether to create recommended CloudWatch Alarms (defaults to true).|
|existingVpc?|[`ec2.IVpc`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.IVpc.html)|An optional, existing VPC into which this pattern should be deployed. When deployed in a VPC, the Lambda function will use ENIs in the VPC to access network resources and an Interface Endpoint will be created in the VPC for Amazon Kinesis Streams. If an existing VPC is provided, the `deployVpc` property cannot be `true`. This uses `ec2.IVpc` to allow clients to supply VPCs that exist outside the stack using the [`ec2.Vpc.fromLookup()`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.Vpc.html#static-fromwbrlookupscope-id-options) method.|
|vpcProps?|[`ec2.VpcProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.VpcProps.html)|Optional user-provided properties to override the default properties for the new VPC. `enableDnsHostnames`, `enableDnsSupport`, `natGateways` and `subnetConfiguration` are set by the pattern, so any values for those properties supplied here will be overridden. If `deployVpc` is not `true` then this property will be ignored.|
|deployVpc?|`boolean`|Whether to create a new VPC based on `vpcProps` into which to deploy this pattern. Setting this to true will deploy the minimal, most private VPC to run the pattern:<ul><li> One isolated subnet in each Availability Zone used by the CDK program</li><li>`enableDnsHostnames` and `enableDnsSupport` will both be set to true</li></ul>If this property is `true` then `existingVpc` cannot be specified. Defaults to `false`.|
|streamEnvironmentVariableName?|`string`|Optional Name to override the Lambda Function default environment variable name that holds the Kinesis Data Stream name value. Default: KINESIS_DATASTREAM_NAME |

## Pattern Properties

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|lambdaFunction|[`lambda.Function`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Function.html)|Returns an instance of the Lambda Function.|
|kinesisStream|[`kinesis.Stream`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_kinesis.Stream.html)|Returns an instance of the Kinesis Data Stream.|
|cloudwatchAlarms?|[`cloudwatch.Alarm[]`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudwatch.Alarm.html)|Returns the CloudWatch Alarms created to monitor the Kinesis Data Stream.|
|vpc?|[`ec2.IVpc`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.IVpc.html)|Returns an interface to the VPC used by the pattern (if any). This may be a VPC created by the pattern or the VPC supplied to the pattern constructor.|

## Default settings

Out of the box implementation of the Construct without any overrides will set the following defaults:

### AWS Lambda Function
* Minimally-permissive IAM role for the Lambda Function to put records on the Kinesis Data Stream
* Enable X-Ray Tracing
* Sets an Environment Variable named KINESIS_DATASTREAM_NAME that holds the Kinesis Data Stream Name, which is a required property Kinesis Data Streams SDK when making calls to it

### Amazon Kinesis Stream
* Enable server-side encryption for the Kinesis Data Stream using AWS Managed CMK
* Deploy best practices CloudWatch Alarms for the Kinesis Data Stream

## Architecture
![Architecture Diagram](architecture.png)

***
&copy; Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
