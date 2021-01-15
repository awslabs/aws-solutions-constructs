/**
 *  Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import { CfnDatabase, CfnJob, CfnJobProps, CfnSecurityConfiguration, CfnTable } from '@aws-cdk/aws-glue';
import { Effect, IRole, Policy, PolicyStatement, Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import { Bucket, IBucket } from '@aws-cdk/aws-s3';
import { Aws, Construct, IResolvable } from '@aws-cdk/core';
import * as defaults from '../';
import { overrideProps } from './utils';

/**
 * Enumeration of data store types that could include S3, DynamoDB, DocumentDB, RDS or Redshift. Current
 * construct implementation only supports S3, but potential to add other output types in the future
 */
export enum SinkStoreType {
  S3 = 'S3'
}

/**
 * Interface to define potential outputs to allow the construct define additional output destinations for ETL
 * transformation
 */
export interface SinkDataStoreProps {
  /**
   * Sink data store type
   */
  readonly datastoreStype: SinkStoreType;
  /**
   * The output S3 location where the data should be written. The provided S3 bucket will be used to pass
   * the output location to the etl script as an argument to the AWS Glue job.
   *
   * If no location is provided the construct will
   * create a new S3 bucket location and pass it to the Glue job as arguments.
   *
   * The argument key is `output_path`. The value of the argument can be retrieve in the python script
   * as follows:
   *  getResolvedOptions(sys.argv, ["JOB_NAME", "output_path", <other arguments that are passed> ])
   *  output_path = args["output_path"]
   */
  readonly s3OutputBucket?: Bucket
}

export interface BuildGlueJobProps {
  /**
   * Glue ETL job properties. Do not pass the location of the script under the JobCommand. This
   * bucket location will be ignored and new location will be created. If a bucket location for the
   * ETL script exists, set it as the @scriptLocation parameter
   */
  readonly glueJobProps?: CfnJobProps | any
  /**
   * Existing instance of the S3 bucket object, if this is set then the script location is ignored.
   */
  readonly existingCfnJob?: CfnJob;

  readonly table: CfnTable;

  readonly database: CfnDatabase;

  readonly outputDataStore?: SinkDataStoreProps
}

export function buildGlueJob(scope: Construct, props: BuildGlueJobProps): [CfnJob, IRole] {

  if (!props.existingCfnJob) {
    if (props.glueJobProps) {
      return deployGlueJob(scope, props.glueJobProps, props.database!, props.table!, props.outputDataStore!);
    } else {
      throw Error('Either glueJobProps or existingCfnJob is required');
    }
  } else {
    return [props.existingCfnJob, Role.fromRoleArn(scope, 'ExistingRole', props.existingCfnJob.role)];
  }
}

export function deployGlueJob(scope: Construct, glueJobProps: CfnJobProps, database: CfnDatabase, table: CfnTable,
  outputDataStore: SinkDataStoreProps): [CfnJob, IRole] {

  let _glueSecurityConfigName: string;

  if (glueJobProps.securityConfiguration === undefined) {
    _glueSecurityConfigName = 'ETLJobSecurityConfig';
    const _glueKMSKey = `arn:${Aws.PARTITION}:kms:${Aws.REGION}:${Aws.ACCOUNT_ID}:alias/aws/glue`;

    new CfnSecurityConfiguration(scope, 'GlueSecurityConfig', {
      name: _glueSecurityConfigName,
      encryptionConfiguration: {
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
        resources: [ `arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:log-group:/aws-glue/*` ]
      })
    ]
  });

  let _jobRole: IRole;
  if (glueJobProps.role) {
    _jobRole = Role.fromRoleArn(scope, 'JobRole', glueJobProps.role);
  } else {
    _jobRole = defaults.createGlueJobRole(scope);
  }

  _glueJobPolicy.attachToRole(_jobRole);

  let _outputLocation: [ Bucket, Bucket? ];
  if (outputDataStore !== undefined && outputDataStore.s3OutputBucket !== undefined) {
    _outputLocation = [ outputDataStore.s3OutputBucket, undefined ];
  } else {
    _outputLocation = defaults.buildS3Bucket(scope, {});
  }

  const _jobArgumentsList = {
    "--enable-metrics" : true,
    "--enable-continuous-cloudwatch-log" : true,
    "--database_name": database.ref,
    "--table_name": table.ref,
    ...(outputDataStore && outputDataStore.datastoreStype === SinkStoreType.S3 &&
      { '--output_path' : `s3://${_outputLocation[0]}/output/` }),
    ...glueJobProps.defaultArguments
  };

  const _newGlueJobProps: CfnJobProps = overrideProps(defaults.DefaultGlueJobProps(_jobRole!, glueJobProps.command,
    _glueSecurityConfigName, _jobArgumentsList), glueJobProps);

  let _scriptLocation: string;
  if (isJobCommandProperty(_newGlueJobProps.command)) {
    if (_newGlueJobProps.command.scriptLocation) {
      _scriptLocation = _newGlueJobProps.command.scriptLocation;
    } else {
      throw Error('Script location has to be provided as an s3 Url location. Script location cannot be empty');
    }
  }

  const _scriptBucketLocation: IBucket = Bucket.fromBucketArn(scope, 'ScriptLocaiton', getS3ArnfromS3Url(_scriptLocation!));
  _scriptBucketLocation.grantRead(_jobRole);

  const _glueJob: CfnJob = new CfnJob(scope, 'KinesisETLJob', _newGlueJobProps);
  return [_glueJob, _jobRole];
}

/**
 * This is a helper method to create the Role required for the Glue Job. If a role is already created then this
 * method is not required to be called.
 *
 * @param scope - The AWS Construct under which the role is to be created
 */
export function createGlueJobRole(scope: Construct): Role {
  return new Role(scope, 'JobRole', {
    assumedBy: new ServicePrincipal('glue.amazonaws.com'),
    description: 'Service role that Glue custom ETL jobs will assume for exeuction',
  });
}

export function createGlueTable(scope: Construct, database: CfnDatabase, fieldSchema: CfnTable.ColumnProperty [], sourceType: string,
  parameters?: any): CfnTable {
  return defaults.DefaultGlueTable(scope, database, fieldSchema, sourceType, parameters);
}

export function createGlueDatabase(scope: Construct): CfnDatabase {
  return defaults.DefaultGlueDatabase(scope);
}

function getS3ArnfromS3Url(s3Url: string): string {
  const splitString: string = s3Url.slice(5);
  return `arn:${Aws.PARTITION}:s3:::${splitString}`;
}

function isJobCommandProperty(command: CfnJob.JobCommandProperty | IResolvable): command is CfnJob.JobCommandProperty {
  if ((command as CfnJob.JobCommandProperty).name ||
    (command as CfnJob.JobCommandProperty).pythonVersion ||
    (command as CfnJob.JobCommandProperty).scriptLocation) {

    return true;
  } else {
    return false;
  }
}