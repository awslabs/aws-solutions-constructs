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

import { CfnJob, CfnJobProps } from '@aws-cdk/aws-glue';
import { Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import { Stream, StreamProps } from '@aws-cdk/aws-kinesis';
import { Bucket, BucketProps, CfnBucket } from '@aws-cdk/aws-s3';
import { Construct } from '@aws-cdk/core';
import * as defaults from '@aws-solutions-constructs/core';


export interface KinesisStreamGlueJobProps {
    /**
     * Existing instance of Kineses Data Stream. If not set, it will create an instance
     */
    readonly existingStreamObj?: Stream;
    /**
     * User provided props to override the default props for the Kinesis Stream.
     *
     * @default - Default props are used
     */
    readonly kinesisStreamProps?: StreamProps | any;
    /**
     * User provides props to override the default props for Glue ETL Jobs. This parameter will be ignored if the
     * existingGlueJob parameter is set
     *
     * @default - Default props are used
     */
    readonly glueJobProps?: CfnJobProps;
    /**
     * Existing GlueJob configuration. If not set, it will create the a CfnJob instance using the glueJobProps
     */
    readonly existingGlueJob?: CfnJob;
}

export class KinesisStreamGlueJob extends Construct {
    public readonly kinesisStream: Stream;

    public readonly glueJob: CfnJob;

    constructor(scope: Construct, id: string, props: KinesisStreamGlueJobProps) {
        super(scope, id);

        this.kinesisStream = defaults.buildKinesisStream(this, {
            existingStreamObj: props.existingStreamObj,
            kinesisStreamProps: props.kinesisStreamProps,
        });

        this.glueJob = defaults.buildGlueJob(this, {
            existingCfnJob: props.existingGlueJob,
            glueJobProps: props.glueJobProps
        });

        let _glueJobRoleName: string;
        if (props.existingGlueJob === undefined) {
            _glueJobRoleName = props.glueJobProps?.role!;
        } else {
            _glueJobRoleName = props.existingGlueJob.role;
        }

        this.kinesisStream.grantRead(Role.fromRoleArn(scope, 'GlueJobRole', _glueJobRoleName));
    }

    /**
     * This is a helper method to create the Role required for the Glue Job. If a role is already created then this
     * method is not required to be called.
     *
     * @param scope - The AWS Construct under which the role is to be created
     */
    public static createGlueJobRole(scope: Construct): Role {
        const _jobRole: Role = new Role(scope, 'JobRole', {
            assumedBy: new ServicePrincipal('glue.amazonaws.com'),
            description: 'Service role that Glue custom ETL jobs will assume for exeuction',
        });

        return _jobRole;
    }

    /**
     * This is a helper method to creates @CfnJob.JobCommandProperty for CfnJob. Based on the input parameters provided,
     * it will also create the S3 bucket for the ETL script location and grant 'read' access to 'glue.amazonaws.com'
     * Service Principal so that the script inside the bucket can be accessed as by AWS Glueglobal.fetch = require('node-fetch');
     *
     * Also this method does not set lifecycle policies on S3 buckets created unless they are explicitly set in the bucket
     * props
     *
     * @param scope - The AWS Construct under the underlying construct should be created
     * @param _jobID - The identifier/ name of the ETL Job
     * @param pythonVersion - The values as for Glue Documentation are '2' and '3'. There is no validation in the
     * method to check for these values to be forward compatible with Glue API changes. If valid values are not provided
     * the deployment would fail.
     * @param existingScriptLocation - If an S3 bucket location for the script exists, set this parameter. If the Bucket
     * is to be created, set the value as undefined. Setting this parameter will ignore @scriptLocationBucketProps as the
     * bucket already exists
     * @param scriptLocationBucketProps - Set this parameter only if the bucket is to be created. If the
     * @existingScriptLocation parameter is set, this parameter will be ignored. This parameter allows to set S3 Bucket
     * properts where the ETL script will be located
     */
    public static createGlueJobCommand(scope: Construct,
                                       _jobID: string, pythonVersion: string, existingScriptLocation?: Bucket,
                                       scriptLocationBucketProps?: BucketProps): CfnJob.JobCommandProperty {
        // create s3 bucket where script can be deployed
        let scriptLocation: [ Bucket, (Bucket | undefined)? ];
        if (existingScriptLocation === undefined) {
            scriptLocation = defaults.buildS3Bucket(scope, {
                bucketProps: scriptLocationBucketProps
            });
            // Remove the default LifecycleConfiguration for the Logging Bucket
            if (scriptLocationBucketProps?.lifecycleRules === undefined) {
                (scriptLocation[0]!.node.findChild('Resource') as CfnBucket).addPropertyDeletionOverride(
                                                                                        'LifecycleConfiguration.Rules');
            }
        } else {
            // since bucket location was provided in the props, logger bucket is not created
            scriptLocation = [ existingScriptLocation, undefined ];
        }

        scriptLocation[0].grantRead(new ServicePrincipal('glue.amazonaws.com'));

        const _jobCommand: CfnJob.JobCommandProperty = {
            name: _jobID,
            pythonVersion,
            scriptLocation: scriptLocation[0].s3UrlForObject()
        };

        return _jobCommand;
    }
}