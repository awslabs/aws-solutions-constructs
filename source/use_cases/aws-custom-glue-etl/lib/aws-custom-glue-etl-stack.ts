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

import { CfnTable } from '@aws-cdk/aws-glue';
import { Role } from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';
import { CfnOutput } from '@aws-cdk/core';
import { KinesisStreamGlueJob } from '@aws-solutions-constructs/aws-kinesisstreams-gluejob';
import * as defaults from '@aws-solutions-constructs/core';

export class AwsCustomGlueEtlStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const _outputBucket = defaults.buildS3Bucket(this, {
      bucketProps: defaults.DefaultS3Props()
    });

    const _fieldSchema: CfnTable.ColumnProperty [] = [{
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
    }];

    const _customEtlJob = new KinesisStreamGlueJob(this, 'CustomETL', {
      existingStreamObj: _kinesisStream,
      glueJobCommandProps: {
        jobCommandName: 'gluestreaming',
        pythonVersion: '3',
        scriptPath: `${__dirname}/../etl/transform.py`
      },
      fieldSchema: _fieldSchema,
      argumentList: {
        "--job-bookmark-option": "job-bookmark-enable",
        "--output_path": `s3://${_outputBucket[0].bucketName}/output/`,
      }
    });

    _outputBucket[0].grantReadWrite(Role.fromRoleArn(this, 'GlueJobRole',  _customEtlJob.glueJob.role));

    new CfnOutput(this, 'KinesisStreamName', {
      value: _customEtlJob.kinesisStream.streamName
    });

    new CfnOutput(this, 'OutputBucket', {
      value: _outputBucket[0].bucketArn
    });

    new CfnOutput(this, 'GlueJob', {
      value: _customEtlJob.glueJob.ref
    });
  }
}