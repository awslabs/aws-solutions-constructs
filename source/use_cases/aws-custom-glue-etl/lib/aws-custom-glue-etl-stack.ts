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
import { Asset } from '@aws-cdk/aws-s3-assets';
import * as cdk from '@aws-cdk/core';
import { CfnOutput } from '@aws-cdk/core';
import { KinesisStreamGlueJob } from '@aws-solutions-constructs/aws-kinesisstreams-gluejob';
import { SinkStoreType } from '@aws-solutions-constructs/core';

export class AwsCustomGlueEtlStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

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
      glueJobProps: {
        command: {
          name: 'gluestreaming',
          pythonVersion: '3',
          scriptLocation: new Asset(this, 'ScriptLocation', {
            path: `${__dirname}../etl/transform.py`
          })
        }
      },
      outputDataStore: {
        datastoreStype: SinkStoreType.S3
      },
      fieldSchema: _fieldSchema
    });

    new CfnOutput(this, 'KinesisStreamName', {
      value: _customEtlJob.kinesisStream.streamName
    });

    new CfnOutput(this, 'GlueJob', {
      value: _customEtlJob.glueJob[0].ref
    });

    new CfnOutput(this, 'JobRole', {
      value: _customEtlJob.glueJob[1].roleArn
    });
  }
}