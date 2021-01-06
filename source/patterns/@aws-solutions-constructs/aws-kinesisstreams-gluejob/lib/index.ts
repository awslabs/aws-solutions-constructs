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
import { CfnPolicy, Effect, IRole, Policy, PolicyStatement, Role } from '@aws-cdk/aws-iam';
import { Stream, StreamProps } from '@aws-cdk/aws-kinesis';
import { Aws, Construct } from '@aws-cdk/core';
import * as defaults from '@aws-solutions-constructs/core';

export interface GlueJobCommandProps {
  /**
   * The command to execute the Glue Job, The name of the job command. For an Apache Spark ETL job, this must be glueetl.
   * For a Python shell job, it must be pythonshell. For streaming job it must be gluestreaming
   */
  readonly jobCommandName: string,
  /**
   * The Python version being used to execute a Python shell job. Allowed values are 2 or 3.
   */
  readonly pythonVersion: string,
  /**
   * The location of the ETL script in your locat directory. If the @s3ObjectUrlForScript parameter is provided, this
   * parmaeter is ignored.
   */
  readonly scriptPath?: string,
  /**
   * The S3 URL for the ETL script. If this parameter is provided, the @scriptPath parameter is ignored.
   */
  readonly s3ObjectUrlForScript?: string
}

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
   */
  readonly glueJobProps?: CfnJobProps;
  /**
   * Existing GlueJob configuration. If this property is provided, any configuration provided through @glueJobProps
   * and @glueJobCommandProps will be ignored.
   */
  readonly existingGlueJob?: CfnJob;
  /**
   * @default - using this props the construct will create a default CfnGlueJobProps. This property will be ignored
   * if either @existingGlueJob or @glueJobProps is provided
   * Glue Job Command Props as defined in @GlueJobCommandProps.
   */
  readonly glueJobCommandProps?: GlueJobCommandProps;
  /**
   * @default
   * A JSON document defining the schema structure of the records in the data stream. An example of such a
   * definition as below. Either @table or @fieldSchema is mandatory. If @table is provided then @fieldSchema is ignored
   * 	"FieldSchema": [{
   *  	"name": "id",
   *  	"type": "int",
   *    "comment": "Identifier for the record"
   *  }, {
   *    "name": "name",
   *    "type": "string",
   *    "comment": "The name of the record"
   *  }, {
   *    "name": "type",
   *    "type": "string",
   *    "comment": "The type of the record"
   *  }, {
   *    "name": "numericvalue",
   *    "type": "int",
   *    "comment": "Some value associated with the record"
   *  },
   */
  readonly fieldSchema?: CfnTable.ColumnProperty [];
  /**
   * Glue Database for this construct. If not provided the construct will create a new Glue Database.
   * The database is where the schema for the data in Kinesis Data Streams is stored
   */
  readonly database?: CfnDatabase;
  /**
   * Glue Table for this construct, If not provided the construct will create a new Table in the
   * database. This table should define the schema for the records in the Kinesis Data Streams.
   * Either @table or @fieldSchema is mandatory. If @table is provided then @fieldSchema is ignored
   */
  readonly table?: CfnTable;
  /**
   * @default
   * List of arguments that can be passed to a CfnJob. This arguments will be augmented with the default
   * arguments as below:
   * {
   *  "--enable-metrics" : true,
   *  "--enable-continuous-cloudwatch-log" : true,
   *  "--database_name": <database name>,
   *  "--table_name": <table name>
   * }
   */
  readonly jobArgumentsList: {};
  /**
   * Glue version as supported by the AWS Glue service. The value defaults to 1.0 in the construct, since
   * glue streaming is not supported by version 2.0 and 1.0 is the only version that supports python 3.0.
   * This property will only be used if @glueJobCommandProps is set. This property will be ingored if
   * @glueJobProps or @existingGlueJob is set.
   */
  readonly glueVersion?: string;
}

export class KinesisStreamGlueJob extends Construct {
  public readonly kinesisStream: Stream;

  public readonly glueJob: CfnJob;

  public readonly database: CfnDatabase;

  public readonly table: CfnTable;

  constructor(scope: Construct, id: string, props: KinesisStreamGlueJobProps) {
    super(scope, id);

    this.kinesisStream = defaults.buildKinesisStream(this, {
      existingStreamObj: props.existingStreamObj,
      kinesisStreamProps: props.kinesisStreamProps,
    });

    if (props.database !== undefined) {
      this.database = props.database!;
    } else {
      this.database = defaults.createGlueDatabase(scope);
    }

    if (props.fieldSchema === undefined && props.table === undefined) {
      throw Error('Either fieldSchema or table property has to be set, both cannot be optional');
    }

    if (props.table !== undefined) {
      this.table = props.table;
    } else {
      this.table = defaults.createGlueTable(scope, this.database, props.fieldSchema!, 'kinesis', {
        STREAM_NAME: this.kinesisStream.streamName
      });
    }

    if (props.existingGlueJob === undefined && props.glueJobProps === undefined && props.glueJobCommandProps === undefined) {
      throw Error('Either existingGlueJob or glueJobProps or glueJobCommandProps should be defined. All the attributes cannot be optional');
    }

    if (props.existingGlueJob !== undefined || props.glueJobProps !== undefined) {
      this.glueJob = defaults.buildGlueJob(this, {
        existingCfnJob: props.existingGlueJob,
        glueJobProps: props.glueJobProps
      });
    } else {
      const _jobRole = defaults.createGlueJobRole(this);
      const _jobCommand = defaults.createGlueJobCommand(this,
        props.glueJobCommandProps!.jobCommandName,
        props.glueJobCommandProps!.pythonVersion,
        _jobRole,
        props.glueJobCommandProps!.s3ObjectUrlForScript,
        props.glueJobCommandProps!.scriptPath);

      this.glueJob = defaults.buildGlueJob(this, {
        glueJobProps: {
          command: _jobCommand[0],
          role: _jobRole.roleArn,
          defaultArguments: {
            "--enable-metrics" : true,
            "--enable-continuous-cloudwatch-log" : true,
            "--database_name": this.database.ref,
            "--table_name": this.table.ref,
            ...props.jobArgumentsList
          },
          glueVersion: props.glueVersion ? props.glueVersion : '1.0'
        }
      });
    }
    this.buildRolePolicy(scope, this.database, this.table, this.glueJob.role);
  }

  private buildRolePolicy(scope: Construct, glueDatabase: CfnDatabase, glueTable: CfnTable, role: string): IRole {
    const _glueJobPolicy = new Policy(scope, 'GlueJobPolicy', {
      statements: [ new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [ 'glue:GetJob' ],
        resources: [ `arn:${Aws.PARTITION}:glue:${Aws.REGION}:${Aws.ACCOUNT_ID}:job/${this.glueJob.ref}` ]
      }), new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [ 'glue:GetSecurityConfiguration' ],
        resources: [ '*' ] // Security Configurations have no resource ARNs
      }), new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [ 'glue:GetTable' ],
        resources: [ `arn:${Aws.PARTITION}:glue:${Aws.REGION}:${Aws.ACCOUNT_ID}:table/${glueDatabase.ref}/${glueTable.ref}`,
          `arn:${Aws.PARTITION}:glue:${Aws.REGION}:${Aws.ACCOUNT_ID}:database/${glueDatabase.ref}`,
          `arn:${Aws.PARTITION}:glue:${Aws.REGION}:${Aws.ACCOUNT_ID}:catalog`
        ]
      }), new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [ 'cloudwatch:PutMetricData' ],
        resources: [ '*' ], // Metrics do not have resource ARN and hence added conditions
        conditions: {
          StringEquals: {
            "cloudwatch:namespace": "Glue"
          },
          Bool: {
            "aws:SecureTransport": "true"
          }
        }
      }), new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [ 'kinesis:DescribeStream', 'kinesis:DescribeStreamSummary', 'kinesis:GetRecords',
          'kinesis:GetShardIterator', 'kinesis:ListShards', 'kinesis:SubscribeToShard' ],
        resources: [ this.kinesisStream.streamArn ]
      })]
    });

    (_glueJobPolicy.node.defaultChild as CfnPolicy).cfnOptions.metadata = {
      cfn_nag: {
        rules_to_suppress: [{
          id: 'W12',
          reason: 'Glue Security Configuration does not have an ARN, and the policy only allows reading the configuration.\
            CloudWatch metrics also do not have an ARN but adding a namespace condition to the policy to allow it to\
            publish metrics only for AWS Glue'
        }]
      }
    };

    const _glueJobRole = Role.fromRoleArn(scope, 'GlueJobRole', role);
    _glueJobRole.attachInlinePolicy(_glueJobPolicy);
    return _glueJobRole;
  }
}