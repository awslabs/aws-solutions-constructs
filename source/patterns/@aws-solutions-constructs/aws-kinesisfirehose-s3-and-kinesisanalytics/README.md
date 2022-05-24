# aws-kinesisfirehose-s3-and-kinesisanalytics module
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
|![Python Logo](https://docs.aws.amazon.com/cdk/api/latest/img/python32.png) Python|`aws_solutions_constructs.aws_kinesisfirehose_s3_and_kinesisanalytics`|
|![Typescript Logo](https://docs.aws.amazon.com/cdk/api/latest/img/typescript32.png) Typescript|`@aws-solutions-constructs/aws-kinesisfirehose-s3-and-kinesisanalytics`|
|![Java Logo](https://docs.aws.amazon.com/cdk/api/latest/img/java32.png) Java|`software.amazon.awsconstructs.services.kinesisfirehoses3kinesisanalytics`|

## Overview
This AWS Solutions Construct implements an Amazon Kinesis Firehose delivery stream connected to an Amazon S3 bucket, and an Amazon Kinesis Analytics application.

Here is a minimal deployable pattern definition:

Typescript
``` typescript
import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';
import { KinesisFirehoseToAnalyticsAndS3 } from '@aws-solutions-constructs/aws-kinesisfirehose-s3-and-kinesisanalytics';

new KinesisFirehoseToAnalyticsAndS3(this, 'FirehoseToS3AndAnalyticsPattern', {
  kinesisAnalyticsProps: {
    inputs: [{
      inputSchema: {
        recordColumns: [{
          name: 'ticker_symbol',
          sqlType: 'VARCHAR(4)',
          mapping: '$.ticker_symbol'
        }, {
          name: 'sector',
          sqlType: 'VARCHAR(16)',
          mapping: '$.sector'
        }, {
          name: 'change',
          sqlType: 'REAL',
          mapping: '$.change'
        }, {
          name: 'price',
          sqlType: 'REAL',
          mapping: '$.price'
        }],
        recordFormat: {
          recordFormatType: 'JSON'
        },
        recordEncoding: 'UTF-8'
      },
      namePrefix: 'SOURCE_SQL_STREAM'
    }]
  }
});
```

Python
```python
from aws_solutions_constructs.aws_kinesis_firehose_s3_kinesis_analytics import KinesisFirehoseToAnalyticsAndS3
from aws_cdk import (
    aws_kinesisanalytics as kinesisanalytics,
    Stack
)
from constructs import Construct

KinesisFirehoseToAnalyticsAndS3(self, 'FirehoseToS3AndAnalyticsPattern',
                                kinesis_analytics_props=kinesisanalytics.CfnApplicationProps(
                                    inputs=[kinesisanalytics.CfnApplication.InputProperty(
                                        input_schema=kinesisanalytics.CfnApplication.InputSchemaProperty(
                                            record_columns=[kinesisanalytics.CfnApplication.RecordColumnProperty(
                                                name='ticker_symbol',
                                                sql_type='VARCHAR(4)',
                                                mapping='$.ticker_symbol'
                                            ), kinesisanalytics.CfnApplication.RecordColumnProperty(
                                                name='sector',
                                                sql_type='VARCHAR(16)',
                                                mapping='$.sector'
                                            ), kinesisanalytics.CfnApplication.RecordColumnProperty(
                                                name='change',
                                                sql_type='REAL',
                                                mapping='$.change'
                                            ), kinesisanalytics.CfnApplication.RecordColumnProperty(
                                                name='price',
                                                sql_type='REAL',
                                                mapping='$.price'
                                            )],
                                            record_format=kinesisanalytics.CfnApplication.RecordFormatProperty(
                                                record_format_type='JSON'
                                            ),
                                            record_encoding='UTF-8'
                                        ),
                                        name_prefix='SOURCE_SQL_STREAM'
                                    )]
                                )
                                )
```

Java
``` java
import software.constructs.Construct;
import java.util.List;

import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.kinesisanalytics.*;
import software.amazon.awscdk.services.kinesisanalytics.CfnApplication.*;
import software.amazon.awsconstructs.services.kinesisfirehoses3kinesisanalytics.*;

new KinesisFirehoseToAnalyticsAndS3(this, "FirehoseToS3AndAnalyticsPattern",
        new KinesisFirehoseToAnalyticsAndS3Props.Builder()
                .kinesisAnalyticsProps(new CfnApplicationProps.Builder()
                        .inputs(List.of(new InputProperty.Builder()
                                .inputSchema(new InputSchemaProperty.Builder()
                                        .recordColumns(List.of(
                                                new RecordColumnProperty.Builder()
                                                        .name("ticker_symbol")
                                                        .sqlType("VARCHAR(4)")
                                                        .mapping("$.ticker_symbol")
                                                        .build(),
                                                new RecordColumnProperty.Builder()
                                                        .name("sector")
                                                        .sqlType("VARCHAR(16)")
                                                        .mapping("$.sector")
                                                        .build(),
                                                new RecordColumnProperty.Builder()
                                                        .name("change")
                                                        .sqlType("REAL")
                                                        .mapping("$.change")
                                                        .build(),
                                                new RecordColumnProperty.Builder()
                                                        .name("price")
                                                        .sqlType("REAL")
                                                        .mapping("$.price")
                                                        .build()))
                                        .recordFormat(new RecordFormatProperty.Builder()
                                                .recordFormatType("JSON")
                                                .build())
                                        .recordEncoding("UTF-8")
                                        .build())
                                .namePrefix("SOURCE_SQL_STREAM")
                                .build()))
                        .build())
                .build());
```

## Pattern Construct Props

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|kinesisFirehoseProps?|[`kinesisFirehose.CfnDeliveryStreamProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-kinesisfirehose.CfnDeliveryStreamProps.html)|Optional user-provided props to override the default props for the Kinesis Firehose delivery stream.|
|kinesisAnalyticsProps?|[`kinesisAnalytics.CfnApplicationProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-kinesisanalytics.CfnApplicationProps.html)|Optional user-provided props to override the default props for the Kinesis Analytics application.|
|existingBucketObj?|[`s3.IBucket`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.IBucket.html)|Existing instance of S3 Bucket object. If this is provided, then also providing bucketProps is an error. |
|bucketProps?|[`s3.BucketProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.BucketProps.html)|User provided props to override the default props for the S3 Bucket.|
|logGroupProps?|[`logs.LogGroupProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-logs.LogGroupProps.html)|User provided props to override the default props for for the CloudWatchLogs LogGroup.|
|loggingBucketProps?|[`s3.BucketProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.BucketProps.html)|Optional user provided props to override the default props for the S3 Logging Bucket.|
|logS3AccessLogs?| boolean|Whether to turn on Access Logging for the S3 bucket. Creates an S3 bucket with associated storage costs for the logs. Enabling Access Logging is a best practice. default - true|

## Pattern Properties

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|kinesisAnalytics|[`kinesisAnalytics.CfnApplication`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-kinesisanalytics.CfnApplication.html)|Returns an instance of the Kinesis Analytics application created by the pattern.|
|kinesisFirehose|[`kinesisFirehose.CfnDeliveryStream`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-kinesisfirehose.CfnDeliveryStream.html)|Returns an instance of the Kinesis Firehose delivery stream created by the pattern.|
|kinesisFirehoseRole|[`iam.Role`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-iam.Role.html)|Returns an instance of the iam.Role created by the construct for Kinesis Data Firehose delivery stream.|
|kinesisFirehoseLogGroup|[`logs.LogGroup`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-logs.LogGroup.html)|Returns an instance of the LogGroup created by the construct for Kinesis Data Firehose delivery stream|
|s3Bucket?|[`s3.Bucket`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.Bucket.html)|Returns an instance of the S3 bucket created by the pattern.|
|s3LoggingBucket?|[`s3.Bucket`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.Bucket.html)|Returns an instance of s3.Bucket created by the construct as the logging bucket for the primary bucket.|
|s3BucketInterface|[`s3.IBucket`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.IBucket.html)|Returns an instance of s3.IBucket created by the construct.|

## Default settings

Out of the box implementation of the Construct without any override will set the following defaults:

### Amazon Kinesis Firehose
* Enable CloudWatch logging for Kinesis Firehose
* Configure least privilege access IAM role for Amazon Kinesis Firehose

### Amazon S3 Bucket
* Configure Access logging for S3 Bucket
* Enable server-side encryption for S3 Bucket using AWS managed KMS Key
* Enforce encryption of data in transit
* Turn on the versioning for S3 Bucket
* Don't allow public access for S3 Bucket
* Retain the S3 Bucket when deleting the CloudFormation stack
* Applies Lifecycle rule to move noncurrent object versions to Glacier storage after 90 days

### Amazon Kinesis Data Analytics
* Configure least privilege access IAM role for Amazon Kinesis Analytics

## Architecture
![Architecture Diagram](architecture.png)

***
&copy; Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.