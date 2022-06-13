# aws-s3-stepfunctions module
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
|![Python Logo](https://docs.aws.amazon.com/cdk/api/latest/img/python32.png) Python|`aws_solutions_constructs.aws_s3_stepfunctions`|
|![Typescript Logo](https://docs.aws.amazon.com/cdk/api/latest/img/typescript32.png) Typescript|`@aws-solutions-constructs/aws-s3-stepfunctions`|
|![Java Logo](https://docs.aws.amazon.com/cdk/api/latest/img/java32.png) Java|`software.amazon.awsconstructs.services.s3stepfunctions`|

## Overview
This AWS Solutions Construct implements an Amazon S3 bucket connected to an AWS Step Functions.

*Note - This constructs sends S3 Event Notification to EventBridge, then triggers AWS Step Functions State Machine executions from EventBridge.*

*An alternative architecture can be built that triggers a Lambda function from S3 Event notifications using aws-s3-lambda and aws-lambda-stepfunctions. Channelling the S3 events through Lambda is less flexible than EventBridge, but is more cost effective and has lower latency.*

Here is a minimal deployable pattern definition:

Typescript
``` typescript
import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';
import { S3ToStepfunctions, S3ToStepfunctionsProps } from '@aws-solutions-constructs/aws-s3-stepfunctions';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';

const startState = new stepfunctions.Pass(this, 'StartState');

new S3ToStepfunctions(this, 'test-s3-stepfunctions-stack', {
    stateMachineProps: {
      definition: startState
    }
});
```

Python
```python
from aws_solutions_constructs.aws_s3_stepfunctions import S3ToStepfunctions
from aws_cdk import (
    aws_stepfunctions as stepfunctions,
    Stack
)
from constructs import Construct

start_state = stepfunctions.Pass(self, 'start_state')

S3ToStepfunctions(
    self, 'test_s3_stepfunctions_stack',
    state_machine_props=stepfunctions.StateMachineProps(
        definition=start_state)
)
```

Java
``` java
import software.constructs.Construct;

import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.stepfunctions.*;
import software.amazon.awsconstructs.services.s3stepfunctions.*;

final Pass startState = new Pass(this, "StartState");

new S3ToStepfunctions(this, "test_s3_stepfunctions_stack",
        new S3ToStepfunctionsProps.Builder()
                .stateMachineProps(new StateMachineProps.Builder()
                        .definition(startState)
                        .build())
                .build());
```

## Pattern Construct Props

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|existingBucketObj?|[`s3.IBucket`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.IBucket.html)|Existing instance of S3 Bucket object. If this is provided, then also providing bucketProps is an error. **The existing bucket must have [EventBridge enabled](https://docs.aws.amazon.com/AmazonS3/latest/userguide/enable-event-notifications-eventbridge.html) for this to work.**|
|bucketProps?|[`s3.BucketProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.BucketProps.html)|Optional user provided props to override the default props for the S3 Bucket.|
|stateMachineProps|[`sfn.StateMachineProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-stepfunctions.StateMachineProps.html)|User provided props to override the default props for sfn.StateMachine.|
|eventRuleProps?|[`events.RuleProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-events.RuleProps.html)|Optional user provided eventRuleProps to override the defaults.|
|deployCloudTrail?|`boolean`|Whether to deploy a Trail in AWS CloudTrail to log API events in Amazon S3. Defaults to `true`. <span style="color:red">**This is now deprecated and ignored because the construct no longer needs CloudTrail since it uses S3 Event Notifications**</span>.|
|createCloudWatchAlarms|`boolean`|Whether to create recommended CloudWatch alarms.|
|logGroupProps?|[`logs.LogGroupProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-logs.LogGroupProps.html)|Optional user provided props to override the default props for for the CloudWatchLogs LogGroup.|
|loggingBucketProps?|[`s3.BucketProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.BucketProps.html)|Optional user provided props to override the default props for the S3 Logging Bucket.|
|logS3AccessLogs?| boolean|Whether to turn on Access Logging for the S3 bucket. Creates an S3 bucket with associated storage costs for the logs. Enabling Access Logging is a best practice. default - true|

## Pattern Properties

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|stateMachine|[`sfn.StateMachine`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-stepfunctions.StateMachine.html)|Returns an instance of sfn.StateMachine created by the construct.|
|stateMachineLogGroup|[`logs.ILogGroup`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-logs.ILogGroup.html)|Returns an instance of the ILogGroup created by the construct for StateMachine.|
|cloudwatchAlarms?|[`cloudwatch.Alarm[]`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cloudwatch.Alarm.html)|Returns a list of cloudwatch.Alarm created by the construct.|
|s3Bucket?|[`s3.Bucket`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.Bucket.html)|Returns an instance of the s3.Bucket created by the construct.|
|s3LoggingBucket?|[`s3.Bucket`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.Bucket.html)|Returns an instance of s3.Bucket created by the construct as the logging bucket for the primary bucket.|
|s3BucketInterface|[`s3.IBucket`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.IBucket.html)|Returns an instance of s3.IBucket created by the construct.|

*Note - with the release of Enable EventBridge for Amazon S3, AWS CloudTrail is no longer required to implement this construct. Because of this, the following properties have been removed:*
- cloudtrail
- cloudtrailBucket
- cloudtrailLoggingBucket

## Default settings

Out of the box implementation of the Construct without any override will set the following defaults:

### Amazon S3 Bucket
* Enable EventBridge to send events from the S3 Bucket
* Configure Access logging for S3 Bucket
* Enable server-side encryption for S3 Bucket using AWS managed KMS Key
* Enforce encryption of data in transit
* Turn on the versioning for S3 Bucket
* Don't allow public access for S3 Bucket
* Retain the S3 Bucket when deleting the CloudFormation stack
* Applies Lifecycle Rule to move noncurrent object versions to Glacier storage after 90 days

### AWS S3 Event Notification
* Enable S3 to send events to EventBridge when an object is created.

### Amazon CloudWatch Events Rule
* Grant least privilege permissions to CloudWatch Events to trigger the Lambda Function

### AWS Step Functions
* Enable CloudWatch logging for API Gateway
* Deploy best practices CloudWatch Alarms for the Step Functions

## Architecture
![Architecture Diagram](architecture.png)

***
&copy; Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.