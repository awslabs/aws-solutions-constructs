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
import * as cdk from '@aws-cdk/core';
import { Aws, CfnOutput } from '@aws-cdk/core';
import { KinesisStreamGlueJob } from '@aws-solutions-constructs/aws-kinesisstreams-gluejob';

export class AwsCustomGlueEtlStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const _glueKMSKey = `arn:${Aws.PARTITION}:kms:${Aws.REGION}:${Aws.ACCOUNT_ID}:alias/aws/glue`;
    const securityConfigName = 'customjob-example-config';

    new CfnSecurityConfiguration(this, 'GlueSecConfig', {
      name: securityConfigName,
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

    const customEtlJob = new KinesisStreamGlueJob(this, 'CustomETL', {
      kinesisStreamProps: {
       encryption: StreamEncryption.MANAGED
      },
      glueJobProps: {
        command: KinesisStreamGlueJob.createGlueJobCommand(this, 'JobCommanda', '3'),
        role: KinesisStreamGlueJob.createGlueJobRole(this).roleArn,
        securityConfiguration: securityConfigName
      }
    });

    new CfnOutput(this, 'KinesisStreamName', {
      value: customEtlJob.kinesisStream.streamName
    });
  }
}
