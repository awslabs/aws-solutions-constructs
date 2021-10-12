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

import { ResourcePart } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import { CfnDatabase, CfnJob } from '@aws-cdk/aws-glue';
import { Stream, StreamEncryption } from '@aws-cdk/aws-kinesis';
import { Duration, Stack } from "@aws-cdk/core";
import * as defaults from '@aws-solutions-constructs/core';
import { SinkStoreType } from '@aws-solutions-constructs/core';
import { KinesisstreamsToGluejob, KinesisstreamsToGluejobProps } from '../lib';

// --------------------------------------------------------------
// Pattern minimal deployment
// --------------------------------------------------------------
test('Pattern minimal deployment', () => {
  // Initial setup
  const stack = new Stack();
  const props: KinesisstreamsToGluejobProps = {
    glueJobProps: {
      command: {
        name: 'glueetl',
        pythonVersion: '3',
        scriptLocation: 's3://fakebucket/fakefolder/fakefolder/fakefile.py'
      }
    },
    fieldSchema: [{
      name: "id",
      type: "int",
      comment: "Identifier for the record"
    }, {
      name: "name",
      type: "string",
      comment: "The name of the record"
    }, {
      name: "type",
      type: "string",
      comment: "The type of the record"
    }, {
      name: "numericvalue",
      type: "int",
      comment: "Some value associated with the record"
    }],
  };

  const id = 'test-kinesisstreams-lambda';

  const construct = new KinesisstreamsToGluejob(stack, id, props);

  // check for role creation
  expect(stack).toHaveResourceLike('AWS::IAM::Role', {
    Properties: {
      AssumeRolePolicyDocument: {
        Statement: [{
          Action: "sts:AssumeRole",
          Effect: "Allow",
          Principal: {
            Service: "glue.amazonaws.com",
          },
        }],
        Version: "2012-10-17",
      },
      Description: "Service role that Glue custom ETL jobs will assume for exeuction",
    },
    Type: "AWS::IAM::Role"
  }, ResourcePart.CompleteDefinition);

  // check for Kinesis Stream
  expect(stack).toHaveResourceLike('AWS::Kinesis::Stream', {
    Properties: {
      RetentionPeriodHours: 24,
      ShardCount: 1,
      StreamEncryption: {
        EncryptionType: "KMS",
        KeyId: "alias/aws/kinesis",
      },
    },
    Type: "AWS::Kinesis::Stream"
  }, ResourcePart.CompleteDefinition);

  // check policy to allow read access to Kinesis Stream
  expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
    Type: "AWS::IAM::Policy",
    Properties: {
      PolicyDocument: {
        Statement: [
          {
            Action: "glue:GetJob",
            Effect: "Allow",
            Resource: {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition"
                  },
                  ":glue:",
                  {
                    Ref: "AWS::Region"
                  },
                  ":",
                  {
                    Ref: "AWS::AccountId"
                  },
                  ":job/",
                  {
                    Ref: "testkinesisstreamslambdaKinesisETLJobF9454612"
                  }
                ]
              ]
            }
          },
          {
            Action: "glue:GetSecurityConfiguration",
            Effect: "Allow",
            Resource: "*"
          },
          {
            Action: "glue:GetTable",
            Effect: "Allow",
            Resource: [
              {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      Ref: "AWS::Partition"
                    },
                    ":glue:",
                    {
                      Ref: "AWS::Region"
                    },
                    ":",
                    {
                      Ref: "AWS::AccountId"
                    },
                    ":table/",
                    {
                      Ref: "GlueDatabase"
                    },
                    "/",
                    {
                      Ref: "GlueTable"
                    }
                  ]
                ]
              },
              {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      Ref: "AWS::Partition"
                    },
                    ":glue:",
                    {
                      Ref: "AWS::Region"
                    },
                    ":",
                    {
                      Ref: "AWS::AccountId"
                    },
                    ":database/",
                    {
                      Ref: "GlueDatabase"
                    }
                  ]
                ]
              },
              {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      Ref: "AWS::Partition"
                    },
                    ":glue:",
                    {
                      Ref: "AWS::Region"
                    },
                    ":",
                    {
                      Ref: "AWS::AccountId"
                    },
                    ":catalog"
                  ]
                ]
              }
            ]
          },
          {
            Action: "cloudwatch:PutMetricData",
            Condition: {
              StringEquals: {
                "cloudwatch:namespace": "Glue"
              },
              Bool: {
                "aws:SecureTransport": "true"
              }
            },
            Effect: "Allow",
            Resource: "*"
          },
          {
            Action: [
              "kinesis:DescribeStream",
              "kinesis:DescribeStreamSummary",
              "kinesis:GetRecords",
              "kinesis:GetShardIterator",
              "kinesis:ListShards",
              "kinesis:SubscribeToShard"
            ],
            Effect: "Allow",
            Resource: {
              "Fn::GetAtt": [
                "testkinesisstreamslambdaKinesisStream374D6D56",
                "Arn"
              ]
            }
          }
        ],
        Version: "2012-10-17"
      },
      PolicyName: "testkinesisstreamslambdaGlueJobPolicy10DEE7DE",
      Roles: [
        {
          Ref: "testkinesisstreamslambdaJobRole42199B9C"
        }
      ]
    },
    Metadata: {
      cfn_nag: {
        rules_to_suppress: [
          {
            id: "W12",
            reason: "Glue Security Configuration does not have an ARN, and the policy only allows reading the configuration.            CloudWatch metrics also do not have an ARN but adding a namespace condition to the policy to allow it to            publish metrics only for AWS Glue"
          }
        ]
      }
    }
  }, ResourcePart.CompleteDefinition);

  // Check for cloudwatch alarm
  expect(stack).toCountResources('AWS::CloudWatch::Alarm', 2);

  // Check for properties
  expect(construct.database).toBeDefined();
  expect(construct.glueJob).toBeDefined();
  expect(construct.table).toBeDefined();
  expect(construct.kinesisStream).toBeDefined();
  expect(construct.glueJobRole).toBeDefined();
  expect(construct.cloudwatchAlarms).toBeDefined();
});

// --------------------------------------------------------------
// Test if existing Glue Job is provided
// --------------------------------------------------------------
test('Test if existing Glue Job is provided', () => {
  // Initial setup
  const stack = new Stack();
  const _jobRole = defaults.createGlueJobRole(stack);
  const existingCfnJob = new CfnJob(stack, 'ExistingJob', {
    command: {
      name: 'glueetl',
      pythonVersion: '3',
      scriptLocation: 's3://fakebucket/fakepath/fakepath/fakefile.py'
    },
    role: _jobRole.roleArn,
    securityConfiguration: 'testSecConfig'
  });

  new KinesisstreamsToGluejob(stack, 'test-kinesisstreams-lambda', {
    existingGlueJob: existingCfnJob,
    fieldSchema: [{
      name: "id",
      type: "int",
      comment: "Identifier for the record"
    }, {
      name: "name",
      type: "string",
      comment: "The name of the record"
    }, {
      name: "type",
      type: "string",
      comment: "The type of the record"
    }, {
      name: "numericvalue",
      type: "int",
      comment: "Some value associated with the record"
    }],
  });

  // check for Kinesis Stream
  expect(stack).toHaveResourceLike('AWS::Kinesis::Stream', {
    Properties: {
      RetentionPeriodHours: 24,
      ShardCount: 1,
      StreamEncryption: {
        EncryptionType: "KMS",
        KeyId: "alias/aws/kinesis",
      },
    },
    Type: "AWS::Kinesis::Stream"
  }, ResourcePart.CompleteDefinition);
});

// --------------------------------------------------------------
// Test if existing S3 bucket location for script is provided
// --------------------------------------------------------------
test('When S3 bucket location for script exists', () => {
  // Initial setup
  const stack = new Stack();
  const _s3ObjectUrl: string = 's3://fakelocation/etl/fakefile.py';
  const props: KinesisstreamsToGluejobProps = {
    glueJobProps: {
      command: {
        name: 'pythonshell',
        pythonVersion: '3',
        scriptLocation: _s3ObjectUrl
      }
    },
    fieldSchema: [{
      name: "id",
      type: "int",
      comment: "Identifier for the record"
    }, {
      name: "name",
      type: "string",
      comment: "The name of the record"
    }, {
      name: "type",
      type: "string",
      comment: "The type of the record"
    }, {
      name: "numericvalue",
      type: "int",
      comment: "Some value associated with the record"
    }],
    outputDataStore: {
      datastoreType: SinkStoreType.S3
    }
  };
  new KinesisstreamsToGluejob(stack, 'test-kinesisstreams-lambda', props);
  expect(stack).toHaveResourceLike('AWS::Glue::Job', {
    Type: 'AWS::Glue::Job',
    Properties: {
      Command: {
        Name: "pythonshell",
        PythonVersion: "3",
        ScriptLocation: "s3://fakelocation/etl/fakefile.py",
      }
    }
  }, ResourcePart.CompleteDefinition);
});

// --------------------------------------------------------------
// Test when the construct is supplied with an existing stream
// --------------------------------------------------------------
test('create glue job with existing kinesis stream', () => {
  const stack = new Stack();
  const _kinesisStream = new Stream(stack, 'FakeStream', {
    streamName: 'fakename',
    encryption: StreamEncryption.UNENCRYPTED,
    shardCount: 3,
    retentionPeriod: Duration.hours(30)
  });

  new KinesisstreamsToGluejob(stack, 'existingStreamJob', {
    glueJobProps: {
      command: {
        name: 'pythonshell',
        pythonVersion: '3',
        scriptLocation: 's3://fakes3bucket/fakepath/fakefile.py'
      }
    },
    existingStreamObj: _kinesisStream,
    fieldSchema: [{
      name: "id",
      type: "int",
      comment: "Identifier for the record"
    }, {
      name: "name",
      type: "string",
      comment: "The name of the record"
    }, {
      name: "type",
      type: "string",
      comment: "The type of the record"
    }, {
      name: "numericvalue",
      type: "int",
      comment: "Some value associated with the record"
    }],
    outputDataStore: {
      datastoreType: SinkStoreType.S3
    }
  });

  expect(stack).toHaveResourceLike('AWS::Kinesis::Stream', {
    Type: 'AWS::Kinesis::Stream',
    Properties: {
      Name: 'fakename',
      RetentionPeriodHours: 30,
      ShardCount: 3
    }
  }, ResourcePart.CompleteDefinition);
});

// --------------------------------------------------------------
// Test if no script loocation is provided
// --------------------------------------------------------------
test('Do not pass s3ObjectUrlForScript or scriptLocationPath, error out', () => {
  const stack = new Stack();
  try {
    const _kinesisStream = defaults.buildKinesisStream(stack, {});
    new KinesisstreamsToGluejob(stack, 'existingStreamJob', {
      glueJobProps: {
        command: {
          name: 'pythonshell',
          scriptLocation: 's3://fakebucket/fakepath/fakefile.py'
        }
      },
      existingStreamObj: _kinesisStream,
      fieldSchema: [{
        name: "id",
        type: "int",
        comment: "Identifier for the record"
      }, {
        name: "name",
        type: "string",
        comment: "The name of the record"
      }, {
        name: "type",
        type: "string",
        comment: "The type of the record"
      }, {
        name: "numericvalue",
        type: "int",
        comment: "Some value associated with the record"
      }],
      outputDataStore: {
        datastoreType: SinkStoreType.S3
      }
    });
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
  }
});

// --------------------------------------------------------------
// Test when neither CfnTable nor Table schem structure is provided
// --------------------------------------------------------------
test('Do not pass fieldSchame or table (CfnTable), error out', () => {
  const stack = new Stack();

  try {
    const props: KinesisstreamsToGluejobProps = {
      glueJobProps: {
        command: {
          name: 'glueetl',
          pythonVersion: '3',
          scriptPath: `s3://fakebucket/fakepath/fakefile.py`
        }
      },
      outputDataStore: {
        datastoreType: SinkStoreType.S3
      }
    };
    new KinesisstreamsToGluejob(stack, 'test-kinesisstreams-lambda', props);
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
  }
});

// --------------------------------------------------------------
// Provide a database and table
// --------------------------------------------------------------
test('When database and table are provided', () => {
  // Initial setup
  const stack = new Stack();
  const _database = new CfnDatabase(stack, 'fakedb', {
    catalogId: 'fakecatalogId',
    databaseInput: {
      description: 'a fake glue db'
    }
  });
  const props: KinesisstreamsToGluejobProps = {
    glueJobProps: {
      command: {
        name: 'glueetl',
        pythonVersion: '3',
        scriptLocation: 's3://fakebucket/fakefolder/fakefolder/fakefile.py'
      }
    },
    existingDatabase: _database,
    existingTable: defaults.createGlueTable(stack, _database, undefined, [{
      name: "id",
      type: "int",
      comment: "Identifier for the record"
    }, {
      name: "name",
      type: "string",
      comment: "The name of the record"
    }, {
      name: "type",
      type: "string",
      comment: "The type of the record"
    }, {
      name: "numericvalue",
      type: "int",
      comment: "Some value associated with the record"
    }], 'kinesis', { STREAM_NAME: 'testStream' })
  };
  new KinesisstreamsToGluejob(stack, 'test-kinesisstreams-lambda', props);
  expect(stack).toHaveResourceLike('AWS::Glue::Database', {
    Type: "AWS::Glue::Database",
    Properties: {
      CatalogId: "fakecatalogId",
      DatabaseInput: {
        Description: "a fake glue db"
      }
    }
  }, ResourcePart.CompleteDefinition);
});

// --------------------------------------------------------------
// When database and table are not provided & cloudwatch alarms set to false
// --------------------------------------------------------------
test('When database and table are not provided & cloudwatch alarms set to false', () => {
  // Initial setup
  const stack = new Stack();
  const props: KinesisstreamsToGluejobProps = {
    createCloudWatchAlarms: false,
    glueJobProps: {
      command: {
        name: 'glueetl',
        pythonVersion: '3',
        scriptLocation: 's3://fakebucket/fakefolder/fakefolder/fakefile.py'
      }
    },
    fieldSchema: [{
      name: "id",
      type: "int",
      comment: "Identifier for the record"
    }, {
      name: "name",
      type: "string",
      comment: "The name of the record"
    }, {
      name: "type",
      type: "string",
      comment: "The type of the record"
    }, {
      name: "numericvalue",
      type: "int",
      comment: "Some value associated with the record"
    }]
  };
  const construct = new KinesisstreamsToGluejob(stack, 'test-kinesisstreams-lambda', props);
  expect(stack).toHaveResourceLike('AWS::Glue::Database', {
    Type: "AWS::Glue::Database",
    Properties: {
      CatalogId: {
        Ref: "AWS::AccountId"
      },
      DatabaseInput: {
        Description: "An AWS Glue database generated by AWS Solutions Construct"
      }
    }
  }, ResourcePart.CompleteDefinition);

  expect(stack).toHaveResourceLike('AWS::Glue::Table', {
    Type: 'AWS::Glue::Table',
    Properties: {
      CatalogId: {
        Ref: "AWS::AccountId"
      },
      DatabaseName: {
        Ref: "GlueDatabase"
      }
    }
  }, ResourcePart.CompleteDefinition);

  expect(stack).toHaveResourceLike('AWS::Glue::Table', {
    Type: "AWS::Glue::Table",
    Properties: {
      CatalogId: {
        Ref: "AWS::AccountId"
      },
      DatabaseName: {
        Ref: "GlueDatabase"
      },
      TableInput: {
        Parameters: {
          classification: "json"
        },
        StorageDescriptor: {
          Columns: [
            {
              Comment: "Identifier for the record",
              Name: "id",
              Type: "int"
            },
            {
              Comment: "The name of the record",
              Name: "name",
              Type: "string"
            },
            {
              Comment: "The type of the record",
              Name: "type",
              Type: "string"
            },
            {
              Comment: "Some value associated with the record",
              Name: "numericvalue",
              Type: "int"
            }
          ],
          Compressed: false,
          InputFormat: "org.apache.hadoop.mapred.TextInputFormat",
          Location: {
            Ref: "testkinesisstreamslambdaKinesisStream374D6D56"
          },
          NumberOfBuckets: -1,
          OutputFormat: "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat",
          Parameters: {
            endpointUrl: {
              "Fn::Join": [
                "",
                [
                  "https://kinesis.",
                  {
                    Ref: "AWS::Region"
                  },
                  ".amazonaws.com"
                ]
              ]
            },
            streamName: {
              Ref: "testkinesisstreamslambdaKinesisStream374D6D56"
            },
            typeOfData: "kinesis"
          },
          SerdeInfo: {
            Parameters: {
              paths: "id,name,type,numericvalue"
            },
            SerializationLibrary: "org.openx.data.jsonserde.JsonSerDe"
          }
        },
        TableType: "EXTERNAL_TABLE"
      }
    }
  }, ResourcePart.CompleteDefinition);

  // Cloudwatch alarms is set to false, no CFN def should exist
  expect(stack).not.toHaveResource('AWS::CloudWatch::Alarm');

  // Since alarms is set to false, cloudwatch alarms property should be undefined
  expect(construct.cloudwatchAlarms).toBeUndefined();
});