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

import { CfnDatabase, CfnJob, CfnJobProps, CfnSecurityConfiguration, CfnTable } from '@aws-cdk/aws-glue';
import { Effect, Policy, PolicyStatement, Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import { Asset } from '@aws-cdk/aws-s3-assets';
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

  _glueJobPolicy.attachToRole(Role.fromRoleArn(scope, 'GlueJobRole', glueJobProps.role));

  const _glueJobProps: CfnJobProps = overrideProps(defaults.DefaultGlueJobProps(glueJobProps.role, glueJobProps.command,
    _glueSecurityConfigName), glueJobProps);

  const _glueJob: CfnJob = new CfnJob(scope, _jobID, _glueJobProps);
  return _glueJob;
}

/**
 * This is a helper method to creates @CfnJob.JobCommandProperty for CfnJob. Based on the input parameters, If the
 * @S3ObjectUrlForScript is passed, it will create only the JobCommandProperty. Instead if the @scriptLocationPath is
 * passed it will an Asset from the @scriptLocationPath and returns the JobCommandProperty and the Asset. The script
 * location can be retrieved using @Asset.s3ObjectUrl
 *
 * @param scope - The AWS Construct under the underlying construct should be created
 * @param _commandName - The identifier/ name of the ETL Job. The values are glueetl, gluestreaming, pythonshell.
 * THere is no validation, but if valid values are not provided, the deployment may fail
 * @param pythonVersion - The values as for Glue Documentation are '2' and '3'. There is no validation in the
 * method to check for these values to be forward compatible with Glue API changes. If valid values are not provided
 * the deployment may fail.
 * @param s3ObjectUrlForScript - If an S3 bucket location for the script exists, set this parameter. If the Bucket
 * is to be created, set the value as undefined. Setting this parameter will ignore @scriptLocationBucketProps as the
 * bucket already exists
 * @param scriptLocationPath - Set this parameter only if the bucket is to be created. If not then a new
 * Bucket location will be created to upload the ETL script asset
 */
export function createGlueJobCommand(scope: Construct, _commandName: string, pythonVersion: string, glueJobRole: Role,
  s3ObjectUrlForScript?: string, scriptLocationPath?: string): [ CfnJob.JobCommandProperty, Asset? ] {
  // create s3 bucket where script can be deployed
  let _scriptLocation: string;
  let _assetLocation: Asset;
  if (s3ObjectUrlForScript === undefined) {
    if (scriptLocationPath === undefined) {
      throw Error('Either s3ObjectUrlForScript or scriptLocationPath is required');
    } else {
      _assetLocation = new Asset(scope, 'ETLScriptLocation', {
        path: scriptLocationPath!
      });
      _assetLocation.grantRead(glueJobRole);
      _scriptLocation = _assetLocation.s3ObjectUrl;
    }
  } else {
    // since bucket location was provided in the props, logger bucket is not created
    _scriptLocation = s3ObjectUrlForScript;
  }

  return [{
    name: _commandName,
    pythonVersion,
    scriptLocation: _scriptLocation
  }, _assetLocation! !== undefined ? _assetLocation! : undefined ];
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