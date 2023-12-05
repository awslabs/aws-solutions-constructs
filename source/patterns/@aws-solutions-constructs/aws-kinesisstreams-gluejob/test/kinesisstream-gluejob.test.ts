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

import * as path from "path";
import * as s3assets from "aws-cdk-lib/aws-s3-assets";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Template } from 'aws-cdk-lib/assertions';
import { CfnDatabase, CfnJob } from 'aws-cdk-lib/aws-glue';
import { Stream, StreamEncryption } from 'aws-cdk-lib/aws-kinesis';
import { Duration, Stack } from "aws-cdk-lib";
import * as defaults from '@aws-solutions-constructs/core';
import { SinkStoreType } from '@aws-solutions-constructs/core';
import { KinesisstreamsToGluejob, KinesisstreamsToGluejobProps } from '../lib';

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

  expect(construct.outputBucket).toBeDefined();
  expect(construct.outputBucket![0]).toBeDefined();
  expect(construct.outputBucket![1]).toBeDefined();

  // check for role creation
  const template = Template.fromStack(stack);
  template.hasResource('AWS::IAM::Role', {
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
      Description: "Service role that Glue custom ETL jobs will assume for execution",
    },
    Type: "AWS::IAM::Role"
  });

  // check for Kinesis Stream
  template.hasResource('AWS::Kinesis::Stream', {
    Properties: {
      RetentionPeriodHours: 24,
      ShardCount: 1,
      StreamEncryption: {
        EncryptionType: "KMS",
        KeyId: "alias/aws/kinesis",
      },
    },
    Type: "AWS::Kinesis::Stream"
  });

  // check policy to allow read access to Kinesis Stream
  template.hasResource('AWS::IAM::Policy', {
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
  });

  // Check for cloudwatch alarm
  template.resourceCountIs('AWS::CloudWatch::Alarm', 2);

  // Check for properties
  expect(construct.database).toBeDefined();
  expect(construct.glueJob).toBeDefined();
  expect(construct.table).toBeDefined();
  expect(construct.kinesisStream).toBeDefined();
  expect(construct.glueJobRole).toBeDefined();
  expect(construct.cloudwatchAlarms).toBeDefined();
});

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

  const construct = new KinesisstreamsToGluejob(stack, 'test-kinesisstreams-lambda', {
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

  expect(construct.outputBucket).not.toBeDefined();

  // check for Kinesis Stream
  const template = Template.fromStack(stack);
  template.hasResource('AWS::Kinesis::Stream', {
    Properties: {
      RetentionPeriodHours: 24,
      ShardCount: 1,
      StreamEncryption: {
        EncryptionType: "KMS",
        KeyId: "alias/aws/kinesis",
      },
    },
    Type: "AWS::Kinesis::Stream"
  });
});

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
  const construct = new KinesisstreamsToGluejob(stack, 'test-kinesisstreams-lambda', props);

  expect(construct.outputBucket).toBeDefined();
  expect(construct.outputBucket![0]).toBeDefined();
  expect(construct.outputBucket![1]).toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResource('AWS::Glue::Job', {
    Type: 'AWS::Glue::Job',
    Properties: {
      Command: {
        Name: "pythonshell",
        PythonVersion: "3",
        ScriptLocation: "s3://fakelocation/etl/fakefile.py",
      }
    }
  });
});

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

  const template = Template.fromStack(stack);
  template.hasResource('AWS::Kinesis::Stream', {
    Type: 'AWS::Kinesis::Stream',
    Properties: {
      Name: 'fakename',
      RetentionPeriodHours: 30,
      ShardCount: 3
    }
  });
});

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
  const construct = new KinesisstreamsToGluejob(stack, 'test-kinesisstreams-lambda', props);

  expect(construct.outputBucket).toBeDefined();
  expect(construct.outputBucket![0]).toBeDefined();
  expect(construct.outputBucket![1]).toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResource('AWS::Glue::Database', {
    Type: "AWS::Glue::Database",
    Properties: {
      CatalogId: "fakecatalogId",
      DatabaseInput: {
        Description: "a fake glue db"
      }
    }
  });
});

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

  expect(construct.outputBucket).toBeDefined();
  expect(construct.outputBucket![0]).toBeDefined();
  expect(construct.outputBucket![1]).toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResource('AWS::Glue::Database', {
    Type: "AWS::Glue::Database",
    Properties: {
      CatalogId: {
        Ref: "AWS::AccountId"
      },
      DatabaseInput: {
        Description: "An AWS Glue database generated by AWS Solutions Construct"
      }
    }
  });

  template.hasResource('AWS::Glue::Table', {
    Type: 'AWS::Glue::Table',
    Properties: {
      CatalogId: {
        Ref: "AWS::AccountId"
      },
      DatabaseName: {
        Ref: "GlueDatabase"
      }
    }
  });

  template.hasResource('AWS::Glue::Table', {
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
  });

  // Cloudwatch alarms is set to false, no CFN def should exist
  template.resourceCountIs('AWS::CloudWatch::Alarm', 0);

  // Since alarms is set to false, cloudwatch alarms property should be undefined
  expect(construct.cloudwatchAlarms).toBeUndefined();
});

test('When Asset for local file is defined', () => {
  const stack = new Stack();
  const etlAsset = new s3assets.Asset(stack, 'ETL', {
    path: path.join(__dirname, 'fakefile.py')
  });

  const props: KinesisstreamsToGluejobProps = {
    etlCodeAsset: etlAsset,
    glueJobProps: {
      command: {
        name: 'glueetl',
        pythonVersion: '3'
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

  // Check for properties
  expect(construct.database).toBeDefined();
  expect(construct.glueJob).toBeDefined();
  expect(construct.table).toBeDefined();
  expect(construct.kinesisStream).toBeDefined();
  expect(construct.glueJobRole).toBeDefined();
  expect(construct.cloudwatchAlarms).toBeDefined();
  expect(construct.outputBucket).toBeDefined();
  expect(construct.outputBucket![0]).toBeDefined();
  expect(construct.outputBucket![1]).toBeDefined();

  // Each output bucket should have a logging bucket
  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::S3::Bucket", 2);

  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "s3:GetObject*",
            "s3:GetBucket*",
            "s3:List*",
            "s3:DeleteObject*",
            "s3:PutObject",
            "s3:PutObjectLegalHold",
            "s3:PutObjectRetention",
            "s3:PutObjectTagging",
            "s3:PutObjectVersionTagging",
            "s3:Abort*"
          ],
          Effect: "Allow",
          Resource: [
            {
              "Fn::GetAtt": [
                "testkinesisstreamslambdaS3Bucket54759F5C",
                "Arn"
              ]
            },
            {
              "Fn::Join": [
                "",
                [
                  {
                    "Fn::GetAtt": [
                      "testkinesisstreamslambdaS3Bucket54759F5C",
                      "Arn"
                    ]
                  },
                  "/*"
                ]
              ]
            }
          ]
        },
        {
          Action: [
            "s3:GetObject*",
            "s3:GetBucket*",
            "s3:List*"
          ],
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
                  ":s3:::", {}
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
                  ":s3:::", {},
                  "/*"
                ]
              ]
            }
          ]
        }
      ],
      Version: "2012-10-17"
    },
    PolicyName: "testkinesisstreamslambdaJobRoleDefaultPolicy943FFA49",
    Roles: [
      {
        Ref: "testkinesisstreamslambdaJobRole42199B9C"
      }
    ]
  });

  template.hasResource('AWS::Glue::Job', {
    Type: 'AWS::Glue::Job',
    Properties: {
      Command: {
        Name: "glueetl",
        PythonVersion: "3",
        ScriptLocation: {}
      },
      Role: {},
      DefaultArguments: {},
      GlueVersion: "2.0",
      NumberOfWorkers: 2,
      SecurityConfiguration: {
        "Fn::Join": [
          "",
          [
            "ETLJobSecurityConfig",
            {
              Ref: "AWS::StackId"
            }
          ]
        ]
      },
      WorkerType: "G.1X"
    }
  });
});

test('Check properties when output bucket is provided', () => {
  // Initial setup
  const stack = new Stack();

  const outputBucket = new s3.Bucket(stack, 'output-bucket');

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
    outputDataStore: {
      existingS3OutputBucket: outputBucket,
      datastoreType: SinkStoreType.S3
    }
  };

  const id = 'test-kinesisstreams-lambda';

  const construct = new KinesisstreamsToGluejob(stack, id, props);

  expect(construct.outputBucket).toBeDefined();
  expect(construct.outputBucket![0]).toBeDefined();
  expect(construct.outputBucket![1]).not.toBeDefined();
});

test('Confirm call to CheckKinesisStreamProps', () => {
  // Initial Setup
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
    existingStreamObj: new Stream(stack, 'test', {}),
    kinesisStreamProps: {}
  };
  const app = () => {
    new KinesisstreamsToGluejob(stack, 'test-construct', props);
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide existingStreamObj or kinesisStreamProps, but not both.\n');
});
