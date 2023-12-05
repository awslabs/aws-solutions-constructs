/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

/*
 *  The functions found here in the core library are for internal use and can be changed
 *  or removed outside of a major release. We recommend against calling them directly from client code.
 */

import { Construct } from 'constructs';
import * as glue from 'aws-cdk-lib/aws-glue';
import { Effect, IRole, Policy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Bucket, BucketProps, IBucket } from 'aws-cdk-lib/aws-s3';
import { Aws, IResolvable } from 'aws-cdk-lib';
import * as s3assets from "aws-cdk-lib/aws-s3-assets";
import * as defaults from '../';
import { overrideProps } from './utils';
import { BuildS3BucketResponse } from '../';

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
  /**
   * Asset instance for the ETL code that performs Glue Job transformation
   *
   * @default - None
   */
   readonly etlCodeAsset?: s3assets.Asset;
}

export interface BuildGlueJobResponse {
  readonly job: glue.CfnJob,
  readonly role: IRole,
  readonly bucket?: Bucket,
  readonly loggingBucket?: Bucket,
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function buildGlueJob(scope: Construct, props: BuildGlueJobProps): BuildGlueJobResponse {
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

      const deployGlueJobResponse =
        deployGlueJob(scope, props.glueJobProps, props.database, props.table, props.outputDataStore!, props.etlCodeAsset);
      return {
        job: deployGlueJobResponse.job,
        role: deployGlueJobResponse.role,
        bucket: deployGlueJobResponse.bucket,
        loggingBucket: deployGlueJobResponse.loggingBucket };
    } else {
      throw Error('Either glueJobProps or existingCfnJob is required');
    }
  } else {
    return { job: props.existingCfnJob, role: Role.fromRoleArn(scope, 'ExistingRole', props.existingCfnJob.role)};
  }
}

export interface DeployGlueJobResponse {
  readonly job: glue.CfnJob,
  readonly role: IRole,
  readonly bucket?: Bucket,
  readonly loggingBucket?: Bucket,
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function deployGlueJob(scope: Construct, glueJobProps: glue.CfnJobProps, database: glue.CfnDatabase, table: glue.CfnTable,
  outputDataStore: SinkDataStoreProps, etlCodeAsset?: s3assets.Asset): DeployGlueJobResponse {

  let glueSecurityConfigName: string;

  if (glueJobProps.securityConfiguration === undefined) {
    glueSecurityConfigName = `ETLJobSecurityConfig${Aws.STACK_ID}`;
    const glueKMSKey = `arn:${Aws.PARTITION}:kms:${Aws.REGION}:${Aws.ACCOUNT_ID}:alias/aws/glue`;

    const securityConfigurationProps: glue.CfnSecurityConfigurationProps = {
      name: glueSecurityConfigName,
      encryptionConfiguration: {
        jobBookmarksEncryption: {
          jobBookmarksEncryptionMode: 'CSE-KMS',
          kmsKeyArn: glueKMSKey
        },
        s3Encryptions: [{
          s3EncryptionMode: 'SSE-S3'
        }]
      }
    };

    // Before turning off SonarQube for the line, reduce the line to it's minimum
    new glue.CfnSecurityConfiguration(scope, 'GlueSecurityConfig', securityConfigurationProps);  // NOSONAR

  } else {
    glueSecurityConfigName = glueJobProps.securityConfiguration;
  }

  const glueJobPolicy = new Policy(scope, 'LogPolicy', {
    statements: [
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [ 'logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents' ],
        resources: [ `arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:log-group:/aws-glue/*` ]
      })
    ]
  });

  const jobRole = glueJobProps.role ?
    Role.fromRoleArn(scope, 'JobRole', glueJobProps.role) :
    defaults.createGlueJobRole(scope);

  glueJobPolicy.attachToRole(jobRole);

  let outputLocation: BuildS3BucketResponse;
  if (outputDataStore !== undefined && outputDataStore.datastoreType === SinkStoreType.S3) {
    if (outputDataStore.existingS3OutputBucket !== undefined) {
      outputLocation = { bucket: outputDataStore.existingS3OutputBucket };
    } else {
      outputLocation = defaults.buildS3Bucket(scope, { bucketProps: outputDataStore.outputBucketProps } );
    }
  } else {
    outputLocation = defaults.buildS3Bucket(scope, {});
  }

  outputLocation.bucket.grantReadWrite(jobRole);

  const jobArgumentsList = {
    "--enable-metrics" : true,
    "--enable-continuous-cloudwatch-log" : true,
    "--database_name": database.ref,
    "--table_name": table.ref,
    ...((outputDataStore === undefined || (outputDataStore && outputDataStore.datastoreType === SinkStoreType.S3)) &&
      { '--output_path' : `s3a://${outputLocation.bucket.bucketName}/output/` }),
    ...glueJobProps.defaultArguments
  };

  const newGlueJobProps: glue.CfnJobProps = overrideProps(defaults.DefaultGlueJobProps(jobRole, glueJobProps,
    glueSecurityConfigName, jobArgumentsList, etlCodeAsset), glueJobProps);
  if (etlCodeAsset) {
    etlCodeAsset.grantRead(jobRole);
  } else {
    // create CDK Bucket instance from S3 url and grant read access to Glue Job's service principal
    if (isJobCommandProperty(newGlueJobProps.command)) {
      const scriptLocation = newGlueJobProps.command.scriptLocation;

      // Incoming Props, including scriptLocation, are checked upstream in CheckGlueProps()
      const scriptBucketLocation: IBucket = Bucket.fromBucketArn(scope, 'ScriptLocation', getS3ArnfromS3Url(scriptLocation!));
      scriptBucketLocation.grantRead(jobRole);
    }
  }

  const glueJob: glue.CfnJob = new glue.CfnJob(scope, 'KinesisETLJob', newGlueJobProps);
  return  { job: glueJob, role: jobRole, bucket: outputLocation.bucket, loggingBucket: outputLocation.loggingBucket };
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 *
 * This is a helper method to create the Role required for the Glue Job. If a role is already created then this
 * method is not required to be called.
 *
 * @param scope - The AWS Construct under which the role is to be created
 */
export function createGlueJobRole(scope: Construct): Role {
  return new Role(scope, 'JobRole', {
    assumedBy: new ServicePrincipal('glue.amazonaws.com'),
    description: 'Service role that Glue custom ETL jobs will assume for execution',
  });
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 *
 * This method creates an AWS Glue table. The method is called when an existing Glue table is not provided
 */
export function createGlueTable(scope: Construct, database: glue.CfnDatabase, tableProps?: glue.CfnTableProps,
  fieldSchema?: glue.CfnTable.ColumnProperty [], sourceType?: string, parameters?: any): glue.CfnTable {
  return defaults.DefaultGlueTable(scope, tableProps !== undefined ? tableProps :
    defaults.DefaultGlueTableProps(database, fieldSchema!, sourceType, parameters));
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 *
 * This method creates an AWS Glue database. The method is only called with an existing Glue database type is not provided.
 * The method uses the user provided props to override the default props for the Glue database
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
  if (s3Url && s3Url.startsWith('s3://')) {
    const splitString: string = s3Url.slice('s3://'.length);
    return `arn:${Aws.PARTITION}:s3:::${splitString}`;
  } else {
    throw Error(`Received S3URL as ${s3Url}. The S3 url string does not begin with s3://. This is not a standard S3 url`);
  }
}

/**
 * A utility method to type check CfnJob.JobCommandProperty type. For the construct to work for streaming ETL from Kinesis Data
 * Streams, all three attributes of the JobCommandProperty are required, even though they may be optional for other use cases.
 *
 * @param command
 */
function isJobCommandProperty(command: glue.CfnJob.JobCommandProperty | IResolvable): command is glue.CfnJob.JobCommandProperty {
  if ((command as glue.CfnJob.JobCommandProperty).name &&
    (command as glue.CfnJob.JobCommandProperty).pythonVersion &&
    (command as glue.CfnJob.JobCommandProperty).scriptLocation) {
    return true;
  } else {
    defaults.printWarning('command not of type JobCommandProperty type');
    return false;
  }
}
