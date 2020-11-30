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
import { Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import { Bucket } from '@aws-cdk/aws-s3';
import { Aws, Construct } from '@aws-cdk/core';
import { DefaultGlueJobProps } from './gluejob-defaults';
import { buildEncryptionKey } from './kms-helper';
import { buildS3Bucket } from './s3-bucket-helper';
import { overrideProps } from './utils';

export interface BuildGlueJobProps {
    /**
     * Glue ETL job properties
     */
    readonly glueJobProps?: CfnJobProps
    /**
     * Existing instance of the S3 bucket object, if this is set then the script location is ignored.
     */
    readonly existingBucketObj: Bucket;
}

export function buildGlueJob(scope: Construct, props: BuildGlueJobProps, jobId?: string): CfnJob {
    const _jobID = jobId ? jobId : 'ETLJob';

    const _jobRole: string = props.glueJobProps?.role ? props.glueJobProps.role : (new Role(scope, `${_jobID}Role`, {
        assumedBy: new ServicePrincipal('glue.amazonaws.com'),
        description: 'Service role that Glue custom ETL jobs will assume for exeuction'
    })).roleArn;

    const glueKMSKey = buildEncryptionKey(scope);
    glueKMSKey.grantEncryptDecrypt(new ServicePrincipal(`logs.${Aws.REGION}.amazonaws.com`));

    const _glueSecurityConfigName: string = 'ETLJobSecurityConfig';

    new CfnSecurityConfiguration(scope, 'GlueSecurityConfig', {
        name: _glueSecurityConfigName,
        encryptionConfiguration: {
            cloudWatchEncryption: {
                cloudWatchEncryptionMode: 'SSE-KMS',
                kmsKeyArn: glueKMSKey.keyArn
            },
            jobBookmarksEncryption: {
                jobBookmarksEncryptionMode: 'SSE-KMS',
                kmsKeyArn: glueKMSKey.keyArn
            },
            s3Encryptions: [{
                s3EncryptionMode: 'SSE-S3'
            }]
        }
    });

    const _jobCommand: CfnJob.JobCommandProperty = {
        name: _jobID,
        pythonVersion: '3',
        scriptLocation: buildS3Bucket(scope, {

        })[1]?.s3UrlForObject()!
    };

    const _glueJobProps = overrideProps(DefaultGlueJobProps(_jobRole, _jobCommand, _glueSecurityConfigName), props.glueJobProps!);
    const _glueJob = new CfnJob(scope, _jobID, _glueJobProps);

    return _glueJob;
}