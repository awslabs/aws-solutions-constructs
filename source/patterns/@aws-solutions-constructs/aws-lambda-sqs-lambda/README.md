# aws-lambda-sqs-lambda module
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
|![Python Logo](https://docs.aws.amazon.com/cdk/api/latest/img/python32.png) Python|`aws_solutions_constructs.aws_lambda_sqs_lambda`|
|![Typescript Logo](https://docs.aws.amazon.com/cdk/api/latest/img/typescript32.png) Typescript|`@aws-solutions-constructs/aws-lambda-sqs-lambda`|
|![Java Logo](https://docs.aws.amazon.com/cdk/api/latest/img/java32.png) Java|`software.amazon.awsconstructs.services.lambdasqslambda`|

This AWS Solutions Construct implements (1) an AWS Lambda function that is configured to send messages to a queue; (2) an Amazon SQS queue; and (3) an AWS Lambda function configured to consume messages from the queue.

Here is a minimal deployable pattern definition:

Typescript
``` typescript
import { LambdaToSqsToLambda, LambdaToSqsToLambdaProps } from "@aws-solutions-constructs/aws-lambda-sqs-lambda";
import * as lambda from 'aws-cdk-lib/aws-lambda';

new LambdaToSqsToLambda(this, 'LambdaToSqsToLambdaPattern', {
  producerLambdaFunctionProps: {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/producer-function`)
  },
  consumerLambdaFunctionProps: {
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda/consumer-function`)
  }
});
```

Python
```python
from aws_solutions_constructs.aws_lambda_sqs_lambda import LambdaToSqsToLambda
from aws_cdk import (
    aws_lambda as _lambda,
)

LambdaToSqsToLambda(
    self, 'LambdaToSqsToLambdaPattern',
    producer_lambda_function_props=_lambda.FunctionProps(
        code=_lambda.Code.from_asset('{__dirname}/producer-lambda'),
        runtime=_lambda.Runtime.PYTHON_3_9,
        handler='index.handler'
    ),
    consumer_lambda_function_props=_lambda.FunctionProps(
        code=_lambda.Code.from_asset('{__dirname}/consumer-lambda'),
        runtime=_lambda.Runtime.PYTHON_3_9,
        handler='index.handler'
    )
)
```

Java
``` java
import software.amazon.awsconstructs.services.lambdasqslambda.*;
import software.amazon.awscdk.services.lambda.*;

new LambdaToSqsToLambda(this, "LambdaToSqsToLambdaPattern", new LambdaToSqsToLambdaProps.Builder()
    .producerLambdaFunctionProps(new FunctionProps.Builder()
        .runtime(Runtime.NODEJS_14_X)
        .code(Code.fromAsset("producer-lambda"))
        .handler("index.handler")
        .build())
    .consumerLambdaFunctionProps(new FunctionProps.Builder()
        .runtime(Runtime.NODEJS_14_X)
        .code(Code.fromAsset("consumer-lambda"))
        .handler("index.handler")
        .build())
    .build());
```
## Pattern Construct Props

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|existingProducerLambdaObj?|[`lambda.Function`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.Function.html)|An optional, existing Lambda function to be used instead of the default function for sending messages to the queue. Providing both this and `producerLambdaFunctionProps` will cause an error. |
|producerLambdaFunctionProps?|[`lambda.FunctionProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.FunctionProps.html)|Optional user-provided properties to override the default properties for the producer Lambda function. |
|existingQueueObj?|[`sqs.Queue`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sqs.Queue.html)|An optional, existing SQS queue to be used instead of the default queue. Providing both this and `queueProps` will cause an error.|
|queueProps?|[`sqs.QueueProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sqs.QueueProps.html)|Optional user-provided properties to override the default properties for the SQS queue. Providing both this and `existingQueueObj` will cause an error. |
|deployDeadLetterQueue?|`boolean`|Whether to create a secondary queue to be used as a dead letter queue. Defaults to `true`.|
|deadLetterQueueProps?|[`sqs.QueueProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sqs.QueueProps.html)|Optional user-provided props to override the default props for the dead letter queue. Only used if the `deployDeadLetterQueue` property is set to `true`.|
|maxReceiveCount?|`number`|The number of times a message can be unsuccessfully dequeued before being moved to the dead letter queue. Defaults to `15`.|
|existingConsumerLambdaObj?|[`lambda.Function`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.Function.html)|An optional, existing Lambda function to be used instead of the default function for receiving/consuming messages from the queue. Providing both this and `consumerLambdaFunctionProps` will cause an error. |
|consumerLambdaFunctionProps?|[`lambda.FunctionProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.FunctionProps.html)|Optional user-provided properties to override the default properties for the consumer Lambda function.|
|queueEnvironmentVariableName?|`string`|Optional Name for the SQS queue URL environment variable set for the producer Lambda function.|
|sqsEventSourceProps?| [`SqsEventSourceProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda-event-sources.SqsEventSourceProps.html)|Optional user provided properties for the queue event source.|
|existingVpc?|[`ec2.IVpc`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-ec2.IVpc.html)|An optional, existing VPC into which this pattern should be deployed. When deployed in a VPC, the Lambda function will use ENIs in the VPC to access network resources and an Interface Endpoint will be created in the VPC for Amazon SQS. If an existing VPC is provided, the `deployVpc` property cannot be `true`. This uses `ec2.IVpc` to allow clients to supply VPCs that exist outside the stack using the [`ec2.Vpc.fromLookup()`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-ec2.Vpc.html#static-fromwbrlookupscope-id-options) method.|
|vpcProps?|[`ec2.VpcProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-ec2.VpcProps.html)|Optional user-provided properties to override the default properties for the new VPC. `enableDnsHostnames`, `enableDnsSupport`, `natGateways` and `subnetConfiguration` are set by the pattern, so any values for those properties supplied here will be overrriden. If `deployVpc` is not `true` then this property will be ignored.|
|deployVpc?|`boolean`|Whether to create a new VPC based on `vpcProps` into which to deploy this pattern. Setting this to true will deploy the minimal, most private VPC to run the pattern:<ul><li> One isolated subnet in each Availability Zone used by the CDK program</li><li>`enableDnsHostnames` and `enableDnsSupport` will both be set to true</li></ul>If this property is `true` then `existingVpc` cannot be specified. Defaults to `false`.|

## Pattern Properties

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|producerLambdaFunction|[`lambda.Function`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.Function.html)|Returns an instance of the producer Lambda function created by the pattern.|
|sqsQueue|[`sqs.Queue`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sqs.Queue.html)|Returns an instance of the SQS queue created by the pattern. |
|deadLetterQueue?|[`sqs.Queue \| undefined`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sqs.Queue.html)|Returns an instance of the dead letter queue created by the pattern, if one is deployed.|
|consumerLambdaFunction|[`lambda.Function`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.Function.html)|Returns an instance of the consumer Lambda function created by the pattern.|
|vpc?|[`ec2.IVpc`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-ec2.IVpc.html)|Returns an interface on the VPC used by the pattern (if any). This may be a VPC created by the pattern or the VPC supplied to the pattern constructor.|

## Default Settings

Out-of-the-box implementation of this Construct (without any overridden properties) will adhere to the following defaults:

### AWS Lambda Functions
* Configure limited privilege access IAM role for Lambda functions.
* Enable reusing connections with Keep-Alive for NodeJs Lambda functions.
* Enable X-Ray Tracing
* Set Environment Variables
  * AWS_NODEJS_CONNECTION_REUSE_ENABLED (for Node 10.x and higher functions)

### Amazon SQS Queue
* Deploy a dead letter queue for the primary queue.
* Enable server-side encryption for the primary queue using an AWS Managed KMS Key.
* Enforce encryption of data in transit

## Architecture
![Architecture Diagram](architecture.png)

***
&copy; Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.