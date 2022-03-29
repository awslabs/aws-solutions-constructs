/**
 *  Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

// Imports
import * as glue from '@aws-cdk/aws-glue';
import * as s3assets from '@aws-cdk/aws-s3-assets';
import * as cdk from '@aws-cdk/core';
import { CfnOutput } from '@aws-cdk/core';
import { KinesisstreamsToGluejob } from '@aws-solutions-constructs/aws-kinesisstreams-gluejob';

export class AwsCustomGlueEtlStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const fieldSchema: glue.CfnTable.ColumnProperty [] = [{
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

    const customEtlJob = new KinesisstreamsToGluejob(this, 'CustomETL', {
      glueJobProps: {
        command: {
          name: 'gluestreaming',
          pythonVersion: '3'
        }
      },
      fieldSchema: fieldSchema,
      etlCodeAsset: new s3assets.Asset(this, 'ScriptLocation', {
        path: `${__dirname}/../etl/transform.py`
      })
    });

    new CfnOutput(this, 'KinesisStreamName', {
      value: customEtlJob.kinesisStream.streamName
    });

    new CfnOutput(this, 'GlueJob', {
      value: customEtlJob.glueJob.ref
    });

    new CfnOutput(this, 'JobRole', {
      value: customEtlJob.glueJobRole.roleArn
    });
  }
}
