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

import { CfnSecurityConfiguration } from '@aws-cdk/aws-glue';
import { StreamEncryption } from '@aws-cdk/aws-kinesis';
import { LogGroup } from '@aws-cdk/aws-logs';
import * as cdk from '@aws-cdk/core';
import { Aws, CfnOutput } from '@aws-cdk/core';
import { KinesisStreamGlueJob } from '@aws-solutions-constructs/aws-kinesisstreams-gluejob';
import * as defaults from '@aws-solutions-constructs/core';

export class AwsCustomGlueEtlStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const _glueKMSKey = `arn:${Aws.PARTITION}:kms:${Aws.REGION}:${Aws.ACCOUNT_ID}:alias/aws/glue`;
    const _securityConfigName = 'customjob-example-config';

    new CfnSecurityConfiguration(this, 'GlueSecConfig', {
      name: _securityConfigName,
      encryptionConfiguration: {
        cloudWatchEncryption: {
          cloudWatchEncryptionMode: 'SSE-KMS',
          kmsKeyArn: _glueKMSKey
        },
        s3Encryptions: [{
          s3EncryptionMode: 'SSE-S3'
        }],
        jobBookmarksEncryption: {
          jobBookmarksEncryptionMode: 'CSE-KMS',
          kmsKeyArn: _glueKMSKey
        }
      }
    });

    const _glueJobRole = KinesisStreamGlueJob.createGlueJobRole(this)

    const _outputBucket = defaults.buildS3Bucket(this, {
      bucketProps: defaults.DefaultS3Props()
    });

    _outputBucket[0].grantWrite(_glueJobRole);

    const _jobCommand = KinesisStreamGlueJob.createGlueJobCommand(this, 'JobCommand', '3', undefined, `${__dirname}/../etl/transform.py`);

    const _customEtlJob = new KinesisStreamGlueJob(this, 'CustomETL', {
      kinesisStreamProps: {
       encryption: StreamEncryption.MANAGED
      },
      glueJobProps: {
        command: _jobCommand[0],
        role: _glueJobRole.roleArn,
        securityConfiguration: _securityConfigName,
        defaultArguments: {
          "--job-bookmark-option": "job-bookmark-disable",
          "--enable-metrics" : true,
          "--enable-continuous-cloudwatch-log" : true,
          "--enable-continuous-log-filter": true,
          "--enable-glue-datacatalog": true,
          "--continuous-log-logGroup": new LogGroup(this, 'GlueCWLogGroup').logGroupName,
          "--output-path": `s3://${_outputBucket[0].bucketName}/output/`,
          "--aws-region": Aws.REGION
        }
      }
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
  }
}