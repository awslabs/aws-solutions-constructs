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

| **Language**                                                                                   | **Package**                                                   |
| :--------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| ![Python Logo](https://docs.aws.amazon.com/cdk/api/latest/img/python32.png) Python             | `aws_solutions_constructs.aws_kinesis_streams_gluejob`        |
| ![Typescript Logo](https://docs.aws.amazon.com/cdk/api/latest/img/typescript32.png) Typescript | `@aws-solutions-constructs/aws-kinesisstreams-gluejob`        |
| ![Java Logo](https://docs.aws.amazon.com/cdk/api/latest/img/java32.png) Java                   | `software.amazon.awsconstructs.services.kinesisstreamgluejob` |

This AWS Solutions Construct deploys a Kinesis Stream and configures a AWS Glue Job to perform custom ETL transformation with the appropriate resources/properties for interaction and security. It also creates an S3 bucket where the python script for the AWS Glue Job can be uploaded

Here is a minimal deployable pattern definition in Typescript:

```javascript
const _glueJobRole = KinesisStreamGlueJob.createGlueJobRole(this);

const _outputBucket = defaults.buildS3Bucket(this, {
    bucketProps: defaults.DefaultS3Props(),
});

_outputBucket[0].grantRead(_glueJobRole);

const _jobCommand = KinesisStreamGlueJob.createGlueJobCommand(
    this,
    'gluestreaming',
    '3',
    _glueJobRole,
    undefined,
    `${__dirname}/../python/transform.py`
);
const _kinesisStream = defaults.buildKinesisStream(this, {});

const _database = KinesisStreamGlueJob.createGlueDatabase(this);
const _table = KinesisStreamGlueJob.createGlueTable(
    this,
    _database,
    [
        {
            name: 'id',
            type: 'int',
            comment: '',
        },
        {
            name: 'name',
            type: 'string',
            comment: '',
        },
        {
            name: 'address',
            type: 'string',
            comment: '',
        },
        {
            name: 'value',
            type: 'int',
            comment: '',
        },
    ],
    'kinesis',
    {STREAM_NAME: _kinesisStream.streamName}
);

const _customEtlJob = new KinesisStreamGlueJob(this, 'CustomETL', {
    existingStreamObj: _kinesisStream,
    glueJobProps: {
        command: _jobCommand[0],
        role: _glueJobRole.roleArn,
        defaultArguments: {
            '--job-bookmark-option': 'job-bookmark-enable',
            '--enable-metrics': true,
            '--enable-continuous-cloudwatch-log': true,
            '--enable-glue-datacatalog': true,
            '--output_path': `s3://${_outputBucket[0].bucketName}/output/`,
            '--database_name': _database.ref,
            '--table_name': _table.ref,
        },
        glueVersion: '1.0',
    },
    database: _database,
    table: _table,
});
```

## Initializer

```text
new KinesisStreamGlueJob(scope: Construct, id: string, props: KinesisStreamsToLambdaProps);
```

_Parameters_

-   scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.Construct.html)
-   id `string`
-   props [`KinesisStreamGlueJobProps`](#pattern-construct-props)

## Pattern Construct Props

| **Name**            | **Type**                                                                                                       | **Description**                                                                         |
| :------------------ | :------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| kinesisStreamProps? | [`kinesis.StreamProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-kinesis.StreamProps.html) | Optional user-provided props to override the default props for the Kinesis stream.      |
| existingStreamObj?  | [`kinesis.Stream`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-kinesis.Stream.html)           | Existing instance of Kinesis Stream, if this is set then kinesisStreamProps is ignored. |
| glueJobProps?       | [`cfnJob.CfnJobProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-glue.CfnJobProps.html)     | User provided props to override the default props for the CfnJob.                       |
| existingGlueJob?    | [`cfnJob.CfnJob`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-glue.CfnJob.html)               | Existing CfnJob configuration, if this this set then glueJobProps is ignored.           |

# Default settings

Out of the box implementation of the Construct without any override will set the following defaults:

### Amazon Kinesis Stream

-   Configure least privilege access IAM role for Kinesis Stream
-   Enable server-side encryption for Kinesis Stream using AWS Managed KMS Key
-   Deploy best practices CloudWatch Alarms for the Kinesis Stream

### AWS Glue Job

-   Create a Glue Security Config that configures encryption for CloudWatch, Job Bookmarks, and S3. CloudWatch and Job Bookmarks are encrypted using AWS Managed KMS Key created for AWS Glue Service. The S3 bucket is configured with SSE-S3 encryption mode
-   Configure service role policies that allow AWS Glue to read from Kinesis Data Streams

### S3 Bucket

-   It creates an AWS S3 Bucket to which the custom ETL Job script can be uploaded
-   Grants read access to AWS Glue Job Service Principal through S3 Bucket Policy

### Glue Database

-   A Glue database to add the table required to define the schema for the Kinesis stream

### Glue Table

-   A Table with storage descriptor and table input properties using the schema details provided for the records in the Kinesis Data Streams

## Architecture

![Architecture Diagram](architecture.png)

## Reference Implementation

A sample use case which uses this pattern is available under [`use_cases/aws-custom-glue-etl`](https://github.com/awslabs/aws-solutions-constructs/tree/master/source/use_cases/aws-custom-glue-etl).

&copy; Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
