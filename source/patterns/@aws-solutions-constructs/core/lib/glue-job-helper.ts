/**
 *  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import * as glue from '@aws-cdk/aws-glue';
import { Effect, IRole, Policy, PolicyStatement, Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import { Bucket, BucketProps, IBucket } from '@aws-cdk/aws-s3';
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
  readonly datastoreType: SinkStoreType;
  /**
   * The output S3 location where the data should be written. The provided S3 bucket will be used to pass
   * the output location to the etl script as an argument to the AWS Glue job.
   *
   * If no location is provided, it will check if @outputBucketProps are provided. If not it will create a new
   * bucket if the @datastoreType is S3.
   *
   * The argument key is `output_path`. The value of the argument can be retrieve in the python script
   * as follows:
   *  getResolvedOptions(sys.argv, ["JOB_NAME", "output_path", <other arguments that are passed> ])
   *  output_path = args["output_path"]
   */
  readonly existingS3OutputBucket?: Bucket
  /**
   * If @existingS3OutputBUcket is provided, this parameter is ignored. If this parameter is not provided,
   * the construct will create a new bucket if the @datastoreType is S3.
   */
  readonly outputBucketProps?: BucketProps;
}

export interface BuildGlueJobProps {
  /**
   * Glue ETL job properties.
   */
  readonly glueJobProps?: glue.CfnJobProps | any
  /**
   * Existing instance of the S3 bucket object, if this is set then the script location is ignored.
   */
  readonly existingCfnJob?: glue.CfnJob;
  /**
   * AWS Glue table
   */
  readonly table: glue.CfnTable;
  /**
   * AWS Glue database
   */
  readonly database: glue.CfnDatabase;
  /**
   * Output storage options
   */
  readonly outputDataStore?: SinkDataStoreProps
}

export function buildGlueJob(scope: Construct, props: BuildGlueJobProps): [glue.CfnJob, IRole, [Bucket, (Bucket | undefined)?]?] {
  if (!props.existingCfnJob) {
    if (props.glueJobProps) {
      if (props.glueJobProps.glueVersion === '2.0' && props.glueJobProps.maxCapacity) {
        throw Error('Cannot set "MaxCapacity" with GlueVersion 2.0 or higher. Use "NumberOfWorkers" and "WorkerType". ' +
        'Refer the API documentation https://docs.aws.amazon.com/glue/latest/webapi/API_Job.html for more details');
      }

      if (props.glueJobProps.maxCapacity && (props.glueJobProps.numberOfWorkers || props.glueJobProps.workerType)) {
        throw Error('Cannot set MaxCapacity and "WorkerType" or  "NumberOfWorkers". If using glueVersion 2.0 or beyond, ' +
        'it is recommended to use "WorkerType" or  "NumberOfWorkers"');
      }

      return deployGlueJob(scope, props.glueJobProps, props.database!, props.table!, props.outputDataStore!);
    } else {
      throw Error('Either glueJobProps or existingCfnJob is required');
    }
  } else {
    return [props.existingCfnJob, Role.fromRoleArn(scope, 'ExistingRole', props.existingCfnJob.role)];
  }
}

export function deployGlueJob(scope: Construct, glueJobProps: glue.CfnJobProps, database: glue.CfnDatabase, table: glue.CfnTable,
  outputDataStore: SinkDataStoreProps): [glue.CfnJob, IRole, [Bucket, (Bucket | undefined)?]] {

  let _glueSecurityConfigName: string;

  if (glueJobProps.securityConfiguration === undefined) {
    _glueSecurityConfigName = 'ETLJobSecurityConfig';
    const _glueKMSKey = `arn:${Aws.PARTITION}:kms:${Aws.REGION}:${Aws.ACCOUNT_ID}:alias/aws/glue`;

    new glue.CfnSecurityConfiguration(scope, 'GlueSecurityConfig', {
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
  if (outputDataStore !== undefined && outputDataStore.datastoreType === SinkStoreType.S3) {
    if (outputDataStore.existingS3OutputBucket !== undefined) {
      _outputLocation = [ outputDataStore.existingS3OutputBucket, undefined ];
    } else {
      _outputLocation = defaults.buildS3Bucket(scope, { bucketProps: outputDataStore.outputBucketProps } );
    }
  } else {
    _outputLocation = defaults.buildS3Bucket(scope, {});
  }

  _outputLocation[0].grantReadWrite(_jobRole);

  const _jobArgumentsList = {
    "--enable-metrics" : true,
    "--enable-continuous-cloudwatch-log" : true,
    "--database_name": database.ref,
    "--table_name": table.ref,
    ...((outputDataStore === undefined || (outputDataStore && outputDataStore.datastoreType === SinkStoreType.S3)) &&
      { '--output_path' : `s3a://${_outputLocation[0].bucketName}/output/` }),
    ...glueJobProps.defaultArguments
  };

  const _newGlueJobProps: glue.CfnJobProps = overrideProps(defaults.DefaultGlueJobProps(_jobRole!, glueJobProps,
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

  const _glueJob: glue.CfnJob = new glue.CfnJob(scope, 'KinesisETLJob', _newGlueJobProps);
  return [_glueJob, _jobRole, _outputLocation];
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

/**
 * This method creates an AWS Glue table. The method is called when an existing Glue table is not provided
 */
export function createGlueTable(scope: Construct, database: glue.CfnDatabase, tableProps?: glue.CfnTableProps,
  fieldSchema?: glue.CfnTable.ColumnProperty [], sourceType?: string, parameters?: any): glue.CfnTable {
  return defaults.DefaultGlueTable(scope, tableProps !== undefined ? tableProps :
    defaults.DefaultGlueTableProps(database, fieldSchema!, sourceType, parameters));
}

/**
 * This method creates an AWS Glue database. The method is only called with an existing Glue database type is not provided.
 * The method uses the user provided props to override the defaul props for the Glue database
 *
 * @param scope
 * @param databaseProps
 */
export function createGlueDatabase(scope: Construct,  databaseProps?: glue.CfnDatabaseProps): glue.CfnDatabase {
  const _mergedDBProps: glue.CfnDatabaseProps = (databaseProps !== undefined) ? overrideProps(defaults.DefaultGlueDatabaseProps(), databaseProps) :
    defaults.DefaultGlueDatabaseProps();
  return defaults.DefaultGlueDatabase(scope, _mergedDBProps);
}

/**
 * A utility method to generate the S3 Arn from an S3 Url.
 *
 * @param s3Url
 */
function getS3ArnfromS3Url(s3Url: string): string {
  const splitString: string = s3Url.slice('s3://'.length);
  return `arn:${Aws.PARTITION}:s3:::${splitString}`;
}

/**
 * A utility method to type check CfnJob.JobCommandProperty type.
 *
 * @param command
 */
function isJobCommandProperty(command: glue.CfnJob.JobCommandProperty | IResolvable): command is glue.CfnJob.JobCommandProperty {
  if ((command as glue.CfnJob.JobCommandProperty).name ||
    (command as glue.CfnJob.JobCommandProperty).pythonVersion ||
    (command as glue.CfnJob.JobCommandProperty).scriptLocation) {
    return true;
  } else {
    defaults.printWarning('command not of type JobCommandProperty type');
    return false;
  }
}