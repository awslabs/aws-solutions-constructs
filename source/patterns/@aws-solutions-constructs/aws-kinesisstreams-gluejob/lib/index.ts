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

import { CfnDatabase, CfnJob, CfnJobProps, CfnTable } from '@aws-cdk/aws-glue';
import { Effect, Policy, PolicyStatement, Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import { Stream, StreamProps } from '@aws-cdk/aws-kinesis';
import { Asset } from '@aws-cdk/aws-s3-assets';
import { Aws, Construct } from '@aws-cdk/core';
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
  /**
   * A JSON document defining the schema structure of the records in the data stream. An example of such a
   * definition as below. Either @table or @fieldSchema is mandatory. If @table is provided then @fieldSchema is ignored
   * 	"FieldSchema": [{
	 *		"name": "id",
	 *		"type": "int",
	 *		"comment": "Identifier for the record"
	 *	}, {
   *    "name": "name",
	 *		"type": "string",
	 *		"comment": "The name of the record"
	 *	}, {
	 *		"name": "type",
	 * 		"type": "string",
	 *		"comment": "The type of the record"
	 *	}, {
	 *		"name": "numericvalue",
	 *		"type": "int",
	 *		"comment": "Some value associated with the record"
	 *	},
   */
  readonly fieldSchema?: CfnTable.ColumnProperty [];
  /**
   * Glue Database for this construct. If not provided the construct will create a new Glue Database.
   * The database is where the schema for the data in Kinesis Data Streams
   */
  readonly database?: CfnDatabase;
  /**
   * Glue Table for this construct, If not provided the construct will create a new Table in the
   * database. This table should define the schema for the records in the Kinesis Data Streams.
   * Either @table or @fieldSchema is mandatory. If @table is provided then @fieldSchema is ignored
   */
  readonly table?: CfnTable;
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

    let _glueDatabase: CfnDatabase;
    if (props.database !== undefined) {
      _glueDatabase = props.database!;
    } else {
      _glueDatabase = defaults.DefaultGlueDatabaseProps(scope);
    }

    if (props.fieldSchema === undefined && props.table === undefined) {
      throw Error('Either fieldSchema or table property has to be set, both cannot be optional');
    }

    let _glueTable: CfnTable;
    if (props.table !== undefined) {
      _glueTable = props.table;
    } else {
      _glueTable = defaults.DefaultGlueTableProps(scope, _glueDatabase, props.fieldSchema!, 'Kinesis', {
        STREAM_NAME: this.kinesisStream.streamName
      });
    }

    const _glueJobRole = Role.fromRoleArn(scope, 'GlueJobRole', this.glueJob.role);
    _glueJobRole.attachInlinePolicy(new Policy(scope, 'GlueJobPolicy', {
      statements: [ new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [ 'glue:GetJob' ],
        resources: [ `arn:${Aws.PARTITION}:glue:${Aws.REGION}:${Aws.ACCOUNT_ID}:job/${this.glueJob.ref}` ]
      }), new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [ 'glue:GetSecurityConfiguration' ],
        resources: [ '*' ] //Security Configurations have no resource arns
      }), new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [ 'glue:GetTable' ],
        resources: [ `arn:${Aws.PARTITION}:glue:${Aws.REGION}:${Aws.ACCOUNT_ID}:table/${_glueDatabase.ref}/${_glueTable.ref}`,
                     `arn:${Aws.PARTITION}:glue:${Aws.REGION}:${Aws.ACCOUNT_ID}:database/${_glueDatabase.ref}`,
                     `arn:${Aws.PARTITION}:glue:${Aws.REGION}:${Aws.ACCOUNT_ID}:catalog`
        ]
      })]
    }));

    this.kinesisStream.grantRead(_glueJobRole);
  }

  /**
   * This is a helper method to create the Role required for the Glue Job. If a role is already created then this
   * method is not required to be called.
   *
   * @param scope - The AWS Construct under which the role is to be created
   */
  public static createGlueJobRole(scope: Construct): Role {
    return new Role(scope, 'JobRole', {
      assumedBy: new ServicePrincipal('glue.amazonaws.com'),
      description: 'Service role that Glue custom ETL jobs will assume for exeuction',
    });
  }

  /**
   * This is a helper method to creates @CfnJob.JobCommandProperty for CfnJob. Based on the input parameters, If the
   * @S3ObjectUrlForScript is passed, it will create only the JobCommandProperty. Instead if the @scriptLocationPath is
   * passed it will an Asset from the @scriptLocationPath and returns the JobCommandProperty and the Asset. The script
   * location can be retrieved using @Asset.s3ObjectUrl
   *
   * @param scope - The AWS Construct under the underlying construct should be created
   * @param _commandName - The identifier/ name of the ETL Job
   * @param pythonVersion - The values as for Glue Documentation are '2' and '3'. There is no validation in the
   * method to check for these values to be forward compatible with Glue API changes. If valid values are not provided
   * the deployment would fail.
   * @param s3ObjectUrlForScript - If an S3 bucket location for the script exists, set this parameter. If the Bucket
   * is to be created, set the value as undefined. Setting this parameter will ignore @scriptLocationBucketProps as the
   * bucket already exists
   * @param scriptLocationPath - Set this parameter only if the bucket is to be created. If not then a new
   * Bucket location will be created to upload the ETL script asset
   */
  public static createGlueJobCommand(scope: Construct,
                                     _commandName: string, pythonVersion: string,
                                     s3ObjectUrlForScript?: string,
                                     scriptLocationPath?: string): [ CfnJob.JobCommandProperty, Asset? ] {
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
        _assetLocation.grantRead(new ServicePrincipal('glue.amazonaws.com'));
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
}