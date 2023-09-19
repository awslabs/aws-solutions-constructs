# aws-kinesisstreams-gluejob module

<!--BEGIN STABILITY BANNER-->

---

![Stability: Experimental](https://img.shields.io/badge/stability-Experimental-important.svg?style=for-the-badge)

> All classes are under active development and subject to non-backward compatible changes or removal in any
> future version. These are not subject to the [Semantic Versioning](https://semver.org/) model.
> This means that while you may use them, you may need to update your source code when upgrading to a newer version of this package.

---

<!--END STABILITY BANNER-->

| **Reference Documentation**: | <span style="font-weight: normal">https://docs.aws.amazon.com/solutions/latest/constructs/</span> |
| :--------------------------- | :------------------------------------------------------------------------------------------------ |

<div style="height:8px"></div>

| **Language**                                                                                   | **Package**                                                    |
| :--------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| ![Python Logo](https://docs.aws.amazon.com/cdk/api/latest/img/python32.png) Python             | `aws_solutions_constructs.aws_kinesis_streams_gluejob`         |
| ![Typescript Logo](https://docs.aws.amazon.com/cdk/api/latest/img/typescript32.png) Typescript | `@aws-solutions-constructs/aws-kinesisstreams-gluejob`         |
| ![Java Logo](https://docs.aws.amazon.com/cdk/api/latest/img/java32.png) Java                   | `software.amazon.awsconstructs.services.kinesisstreamsgluejob` |

## Overview
This AWS Solutions Construct deploys a Kinesis Stream and configures a AWS Glue Job to perform custom ETL transformation with the appropriate resources/properties for interaction and security. It also creates an S3 bucket where the python script for the AWS Glue Job can be uploaded.

Here is a minimal deployable pattern definition:

Typescript
```typescript
import * as glue from "@aws-cdk/aws-glue";
import * as s3assets from "@aws-cdk/aws-s3-assets";
import { KinesisstreamsToGluejob } from "@aws-solutions-constructs/aws-kinesisstreams-gluejob";

const fieldSchema: glue.CfnTable.ColumnProperty[] = [
  {
    name: "id",
    type: "int",
    comment: "Identifier for the record",
  },
  {
    name: "name",
    type: "string",
    comment: "Name for the record",
  },
  {
    name: "address",
    type: "string",
    comment: "Address for the record",
  },
  {
    name: "value",
    type: "int",
    comment: "Value for the record",
  },
];

const customEtlJob = new KinesisstreamsToGluejob(this, "CustomETL", {
  glueJobProps: {
    command: {
      name: "gluestreaming",
      pythonVersion: "3",
    },
  },
  fieldSchema: fieldSchema,
  etlCodeAsset: new s3assets.Asset(this, "ScriptLocation", {
    path: `${__dirname}/../etl/transform.py`,
  }),
});
```

## Pattern Construct Props

| **Name**            | **Type**                                                                                                                      | **Description**                                                                                                  |
| :------------------ | :---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| existingStreamObj?  | [`kinesis.Stream`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_kinesis.Stream.html)                          | Existing instance of Kinesis Stream, providing both this and `kinesisStreamProps` will cause an error.           |
| kinesisStreamProps? | [`kinesis.StreamProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_kinesis.StreamProps.html)                | Optional user-provided props to override the default props for the Kinesis stream.                               |
| glueJobProps?       | [`cfnJob.CfnJobProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_glue.CfnJobProps.html)                    | User provided props to override the default props for the AWS Glue Job.                                          |
| existingGlueJob?    | [`cfnJob.CfnJob`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_glue.CfnJob.html)                              | Existing instance of AWS Glue Job, providing both this and `glueJobProps` will cause an error.                   |
| fieldSchema?        | [`CfnTable.ColumnProperty[]`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_glue.CfnTable.ColumnProperty.html) | User provided schema structure to create an AWS Glue Table.                                                      |
| existingTable?      | [`CfnTable`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_glue.CfnTable.html)                                 | Existing instance of AWS Glue Table. If this is set, tableProps and fieldSchema are ignored.                     |
| tableProps?         | [`CfnTableProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_glue.TableProps.html)                          | User provided AWS Glue Table props to override default props used to create a Glue Table.                        |
| existingDatabase?   | [`CfnDatabase`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_glue.CfnDatabase.html)                           | Existing instance of AWS Glue Database. If this is set, then databaseProps is ignored.                           |
| databaseProps?      | [`CfnDatabaseProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_glue.CfnDatabaseProps.html)                 | User provided Glue Database Props to override the default props used to create the Glue Database.                |
| outputDataStore?    | [`SinkDataStoreProps`](#sinkdatastoreprops)                                                                                   | User provided properties for S3 bucket that stores Glue Job output. Current datastore types supported is only S3. |
|createCloudWatchAlarms?|`boolean`|Whether to create recommended CloudWatch alarms for Kinesis Data Stream. Default value is set to `true`.|
| etlCodeAsset?       | [s3assets.Asset](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3_assets.Asset.html)                               | User provided instance of the Asset class that represents the ETL code on the local filesystem                    |

### SinkDataStoreProps

| **Name**                | **Type**                                                                                          | **Description**                                                                                                |
| :---------------------- | :------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| existingS3OutputBucket? | [`Bucket`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.Bucket.html)           | Existing instance of S3 bucket where the data should be written. Providing both this and `outputBucketProps` will cause an error. |
| outputBucketProps       | [`BucketProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.BucketProps.html) | User provided bucket properties to create the S3 bucket to store the output from the AWS Glue Job.             |
| datastoreType           | [`SinkStoreType`](#sinkstoretype)                                                                 | Sink data store type.                                                                                          |

### SinkStoreType

Enumeration of data store types that could include S3, DynamoDB, DocumentDB, RDS or Redshift. Current construct implementation only supports S3, but potential to add other output types in the future.

| **Name** | **Type** | **Description** |
| :------- | :------- | --------------- |
| S3       | `string` | S3 storage type |

## Pattern Properties

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|kinesisStream|[`kinesis.Stream`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_kinesis.Stream.html)|Returns an instance of the Kinesis stream created or used by the pattern.|
|glueJob|[`CfnJob`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_glue.CfnJob.html)|Returns an instance of AWS Glue Job created by the construct.|
|glueJobRole|[`iam.Role`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_iam.Role.html)|Returns an instance of the IAM Role created by the construct for the Glue Job.|
|database|[`CfnDatabase`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_glue.CfnDatabase.html)|Returns an instance of AWS Glue Database created by the construct.|
|table|[`CfnTable`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_glue.CfnTable.html)|Returns an instance of the AWS Glue Table created by the construct|
|outputBucket?|[`s3.Bucket`](https://docs.aws.amazon.com/cdk/api/latest/docs/aws-s3-readme.html)|Returns an instance of the output bucket created by the construct for the AWS Glue Job.|
|cloudwatchAlarms?|[`cloudwatch.Alarm[]`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudwatch.Alarm.html)|Returns an array of recommended CloudWatch Alarms created by the construct for Kinesis Data stream.|

## Default settings

Out of the box implementation of the Construct without any override will set the following defaults:

### Amazon Kinesis Stream

- Configure least privilege access IAM role for Kinesis Stream
- Enable server-side encryption for Kinesis Stream using AWS Managed KMS Key
- Deploy best practices CloudWatch Alarms for the Kinesis Stream

### Glue Job

- Create a Glue Security Config that configures encryption for CloudWatch, Job Bookmarks, and S3. CloudWatch and Job Bookmarks are encrypted using AWS Managed KMS Key created for AWS Glue Service. The S3 bucket is configured with SSE-S3 encryption mode
- Configure service role policies that allow AWS Glue to read from Kinesis Data Streams

### Glue Database

- Create an AWS Glue database. An AWS Glue Table will be added to the database. This table defines the schema for the records buffered in the Amazon Kinesis Data Streams

### Glue Table

- Create an AWS Glue table. The table schema definition is based on the JSON structure of the records buffered in the Amazon Kinesis Data Streams

### IAM Role

- A job execution role that has privileges to 1) read the ETL script from the S3 bucket location, 2) read records from the Kinesis Stream, and 3) execute the Glue Job

### Output S3 Bucket

- An S3 bucket to store the output of the ETL transformation. This bucket will be passed as an argument to the created glue job so that it can be used in the ETL script to write data into it

### Cloudwatch Alarms

- A CloudWatch Alarm to report when consumer application is reading data slower than expected
- A CloudWatch Alarm to report when consumer record processing is falling behind (to avoid risk of data loss due to record expiration)

## Architecture

![Architecture Diagram](architecture.png)

## Reference Implementation

A sample use case which uses this pattern is available under [`use_cases/aws-custom-glue-etl`](https://github.com/awslabs/aws-solutions-constructs/tree/master/source/use_cases/aws-custom-glue-etl).

&copy; Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
