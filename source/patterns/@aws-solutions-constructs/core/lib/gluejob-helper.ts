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

import { CfnJob, CfnJobProps, CfnSecurityConfiguration } from '@aws-cdk/aws-glue';
import { Effect, Policy, PolicyStatement, Role } from '@aws-cdk/aws-iam';
import { Aws, Construct } from '@aws-cdk/core';
import * as defaults from '../';
import { overrideProps } from './utils';

export interface BuildGlueJobProps {
  /**
   * Glue ETL job properties. Do not pass the location of the script under the JobCommand. This
   * bucket location will be ignored and new location will be created. If a bucket location for the
   * ETL script exists, set it as the @scriptLocation parameter
   */
  readonly glueJobProps?: CfnJobProps
  /**
   * Existing instance of the S3 bucket object, if this is set then the script location is ignored.
   */
  readonly existingCfnJob?: CfnJob;
}

export function buildGlueJob(scope: Construct, props: BuildGlueJobProps): CfnJob {

  if (!props.existingCfnJob) {
    if (props.glueJobProps) {
      return deployGlueJob(scope, props.glueJobProps);
    } else {
      throw Error('Either glueJobProps or existingCfnJob is required');
    }
  } else {
    // return properties are already supplied then bucket is not created and hence returns undefined
    return props.existingCfnJob;
  }
}

export function deployGlueJob(scope: Construct, glueJobProps: CfnJobProps): CfnJob {
  const _jobID = 'ETLJob';

  let _glueSecurityConfigName: string;

  if (glueJobProps.securityConfiguration === undefined) {
    _glueSecurityConfigName = 'ETLJobSecurityConfig';
    const _glueKMSKey = `arn:${Aws.PARTITION}:kms:${Aws.REGION}:${Aws.ACCOUNT_ID}:alias/aws/glue`;

    new CfnSecurityConfiguration(scope, 'GlueSecurityConfig', {
      name: _glueSecurityConfigName,
      encryptionConfiguration: {
        cloudWatchEncryption: {
          cloudWatchEncryptionMode: 'SSE-KMS',
          kmsKeyArn: _glueKMSKey
        },
        jobBookmarksEncryption: {
          jobBookmarksEncryptionMode: 'CSE-KMS',
          kmsKeyArn: _glueKMSKey
        },
        s3Encryptions: [{
          s3EncryptionMode: 'SSE-S3'
        }]
      }
    });
  } else {
    _glueSecurityConfigName = glueJobProps.securityConfiguration;
  }

  const _glueJobPolicy = new Policy(scope, 'LogPolicy', {
    statements: [
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [ 'logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents' ],
        resources: [ `arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:log-group/aws-glue/*` ]
      })
    ]
  });

  _glueJobPolicy.attachToRole(Role.fromRoleArn(scope, 'GlueJobRole', glueJobProps.role));

  const _glueJobProps: CfnJobProps = overrideProps(defaults.DefaultGlueJobProps(glueJobProps.role, glueJobProps.command,
                                                                              _glueSecurityConfigName), glueJobProps);

  const _glueJob: CfnJob = new CfnJob(scope, _jobID, _glueJobProps);
  return _glueJob;
}