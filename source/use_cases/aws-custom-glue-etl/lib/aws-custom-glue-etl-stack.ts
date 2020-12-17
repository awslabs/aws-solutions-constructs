/**
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

import * as cdk from '@aws-cdk/core';
import { CfnOutput } from '@aws-cdk/core';
import { KinesisStreamGlueJob } from '@aws-solutions-constructs/aws-kinesisstreams-gluejob';
import * as defaults from '@aws-solutions-constructs/core';

export class AwsCustomGlueEtlStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const _glueJobRole = KinesisStreamGlueJob.createGlueJobRole(this);

    const _outputBucket = defaults.buildS3Bucket(this, {
      bucketProps: defaults.DefaultS3Props()
    });

    _outputBucket[0].grantReadWrite(_glueJobRole);

    const _jobCommand = KinesisStreamGlueJob.createGlueJobCommand(this, 'gluestreaming', '3', _glueJobRole, undefined, `${__dirname}/../etl/transform.py`);
    const _kinesisStream = defaults.buildKinesisStream(this, {});
    const _database = KinesisStreamGlueJob.createGlueDatabase(this);
    const _table = KinesisStreamGlueJob.createGlueTable(this, _database, [{
      "name": "ventilatorid",
      "type": "int",
      "comment": ""
    },
    {
      "name": "eventtime",
      "type": "string",
      "comment": ""
    },
    {
      "name": "serialnumber",
      "type": "string",
      "comment": ""
    },
    {
      "name": "pressurecontrol",
      "type": "int",
      "comment": ""
    },
    {
      "name": "o2stats",
      "type": "int",
      "comment": ""
    },
    {
      "name": "minutevolume",
      "type": "int",
      "comment": ""
    },
    {
      "name": "manufacturer",
      "type": "string",
      "comment": ""
    }], 'kinesis', { STREAM_NAME: _kinesisStream.streamName });

    const _customEtlJob = new KinesisStreamGlueJob(this, 'CustomETL', {
      existingStreamObj: _kinesisStream,
      glueJobProps: {
        command: _jobCommand[0],
        role: _glueJobRole.roleArn,
        defaultArguments: {
          "--job-bookmark-option": "job-bookmark-enable",
          "--enable-metrics" : true,
          "--enable-continuous-cloudwatch-log" : true,
          "--enable-glue-datacatalog": true,
          "--output_path": `s3://${_outputBucket[0].bucketName}/output/`,
          "--database_name": _database.ref,
          "--table_name": _table.ref
        },
        glueVersion: "1.0"
      },
      database: _database,
      table: _table
    });

    new CfnOutput(this, 'KinesisStreamName', {
      value: _customEtlJob.kinesisStream.streamName
    });

    new CfnOutput(this, 'ScripLocation', {
      value: _jobCommand[1]!.s3ObjectUrl
    });

    new CfnOutput(this, 'OutputBucket', {
      value: _outputBucket[0].bucketArn
    });

    new CfnOutput(this, 'GlueJob', {
      value: _customEtlJob.glueJob.ref
    });
  }
}