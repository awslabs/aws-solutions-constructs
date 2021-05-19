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

This AWS Solutions Construct deploys a Kinesis Stream and configures a AWS Glue Job to perform custom ETL transformation with the appropriate resources/properties for interaction and security. It also creates an S3 bucket where the python script for the AWS Glue Job can be uploaded.

Here is a minimal deployable pattern definition in Typescript:

```javascript
import * as glue from '@aws-cdk/aws-glue';
import * as s3assets from '@aws-cdk/aws-s3-assets';
import {KinesisstreamsToGluejob} from '@aws-solutions-constructs/aws-kinesisstreams-gluejob';

const fieldSchema: glue.CfnTable.ColumnProperty[] = [
    {
        name: 'id',
        type: 'int',
        comment: 'Identifier for the record',
    },
    {
        name: 'name',
        type: 'string',
        comment: 'Name for the record',
    },
    {
        name: 'address',
        type: 'string',
        comment: 'Address for the record',
    },
    {
        name: 'value',
        type: 'int',
        comment: 'Value for the record',
    },
];

const customEtlJob = new KinesisstreamsToGluejob(this, 'CustomETL', {
    glueJobProps: {
        command: {
            name: 'gluestreaming',
            pythonVersion: '3',
            scriptLocation: new s3assets.Asset(this, 'ScriptLocation', {
                path: `${__dirname}/../etl/transform.py`,
            }).s3ObjectUrl,
        },
    },
    fieldSchema: fieldSchema,
});
```

## Initializer

```text
new KinesisstreamsToGluejob(scope: Construct, id: string, props: KinesisstreamsToGluejobProps);
```

_Parameters_

-   scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.Construct.html)
-   id `string`
-   props [`KinesisstreamsToGluejobProps`](#pattern-construct-props)

## Pattern Construct Props

| **Name**            | **Type**                                                                                                                      | **Description**                                                                                                  |
| :------------------ | :---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| kinesisStreamProps? | [`kinesis.StreamProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-kinesis.StreamProps.html)                | Optional user-provided props to override the default props for the Kinesis stream.                               |
| existingStreamObj?  | [`kinesis.Stream`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-kinesis.Stream.html)                          | Existing instance of Kinesis Stream, providing both this and `kinesisStreamProps` will cause an error.                          |
| glueJobProps?       | [`cfnJob.CfnJobProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-glue.CfnJobProps.html)                    | User provided props to override the default props for the AWS Glue Job.                                          |
| existingGlueJob?    | [`cfnJob.CfnJob`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-glue.CfnJob.html)                              | Existing instance of AWS Glue Job, providing both this and `glueJobProps` will cause an error.                         |
| existingDatabase?   | [`CfnDatabase`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-glue.CfnDatabase.html)                           | Existing instance of AWS Glue Database. If this is set, then databaseProps is ignored.                           |
| databaseProps?      | [`CfnDatabaseProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-glue.CfnDatabaseProps.html)                 | User provided Glue Database Props to override the default props used to create the Glue Database.                |
| existingTable?      | [`CfnTable`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-glue.CfnTable.html)                                 | Existing instance of AWS Glue Table. If this is set, tableProps and fieldSchema are ignored.                     |
| tableProps?         | [`CfnTableProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-glue.TableProps.html)                          | User provided AWS Glue Table props to override default props used to create a Glue Table.                        |
| fieldSchema?        | [`CfnTable.ColumnProperty[]`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-glue.CfnTable.ColumnProperty.html) | User provided schema structure to create an AWS Glue Table.                                                      |
| outputDataStore?    | [`SinkDataStoreProps`](#sinkdatastoreprops)                                                                                   | User provided properties for S3 bucket that stores Glue Job output. Current datastore types suported is only S3. |

## SinkDataStoreProps

| **Name**                | **Type**                                                                                          | **Description**                                                                                                |
| :---------------------- | :------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| existingS3OutputBucket? | [`Bucket`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.Bucket.html)           | Existing instance of S3 bucket where the data should be written. Providing both this and `outputBucketProps` will cause an error. |
| outputBucketProps       | [`BucketProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.BucketProps.html) | User provided bucket properties to create the S3 bucket to store the output from the AWS Glue Job.             |
| datastoreType           | [`SinkStoreType`](#sinkstoretype)                                                                 | Sink data store type.                                                                                          |

## SinkStoreType

Enumeration of data store types that could include S3, DynamoDB, DocumentDB, RDS or Redshift. Current construct implementation only supports S3, but potential to add other output types in the future.

| **Name** | **Type** | **Description** |
| :------- | :------- | --------------- |
| S3       | `string` | S3 storage type |

# Default settings

Out of the box implementation of the Construct without any override will set the following defaults:

### Amazon Kinesis Stream

-   Configure least privilege access IAM role for Kinesis Stream
-   Enable server-side encryption for Kinesis Stream using AWS Managed KMS Key
-   Deploy best practices CloudWatch Alarms for the Kinesis Stream

### Glue Job

-   Create a Glue Security Config that configures encryption for CloudWatch, Job Bookmarks, and S3. CloudWatch and Job Bookmarks are encrypted using AWS Managed KMS Key created for AWS Glue Service. The S3 bucket is configured with SSE-S3 encryption mode
-   Configure service role policies that allow AWS Glue to read from Kinesis Data Streams

### Glue Database

-   Create an AWS Glue database. An AWS Glue Table will be added to the database. This table defines the schema for the records buffered in the Amazon Kinesis Data Streams

### Glue Table

-   Create an AWS Glue table. The table schema definition is based on the JSON structure of the records buffered in the Amazon Kinesis Data Streams

### IAM Role

-   A job execution role that has privileges to 1) read the ETL script from the S3 bucket location, 2) read records from the Kinesis Stream, and 3) execute the Glue Job

### Output S3 Bucket

-   An S3 bucket to store the output of the ETL transformation. This bucket will be passed as an argument to the created glue job so that it can be used in the ETL script to write data into it

## Architecture

![Architecture Diagram](architecture.png)

## Reference Implementation

A sample use case which uses this pattern is available under [`use_cases/aws-custom-glue-etl`](https://github.com/awslabs/aws-solutions-constructs/tree/master/source/use_cases/aws-custom-glue-etl).

&copy; Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
