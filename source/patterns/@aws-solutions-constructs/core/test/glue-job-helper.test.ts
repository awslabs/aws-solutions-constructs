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

// Imports
import { ResourcePart } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import { CfnJob, CfnJobProps } from '@aws-cdk/aws-glue';
import { Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import { Bucket, BucketEncryption } from '@aws-cdk/aws-s3';
import { RemovalPolicy, Stack } from "@aws-cdk/core";
import * as defaults from '..';

// --------------------------------------------------------------
// Test deployment with role creation
// --------------------------------------------------------------
test('Test deployment with role creation', () => {
  // Stack
  const stack = new Stack();

  const _jobRole = new Role(stack, 'CustomETLJobRole', {
    assumedBy: new ServicePrincipal('glue.amazonaws.com')
  });

  const cfnJobProps: CfnJobProps = defaults.DefaultGlueJobProps(_jobRole, {
    command: {
      name: 'glueetl',
      pythonVersion: '3',
      scriptLocation: 's3://fakescriptlocation/fakebucket',
    },
    role: _jobRole.roleArn
  }, 'testETLJob', {});

  const _database = defaults.createGlueDatabase(stack, defaults.DefaultGlueDatabaseProps());

  const _glueJob = defaults.buildGlueJob(stack, {
    glueJobProps: cfnJobProps,
    database: _database,
    table: defaults.createGlueTable(stack, _database, undefined, [{
      name: "id",
      type: "int",
      comment: ""
    }], 'kinesis', {STREAM_NAME: 'testStream'})
  });

  expect(_glueJob[2]?.[0]).toBeDefined();
  expect(_glueJob[2]?.[0]).toBeInstanceOf(Bucket);
  expect(stack).toHaveResourceLike('AWS::Glue::Job', {
    Type: "AWS::Glue::Job",
    Properties: {
      Command: {
        Name: "glueetl",
        PythonVersion: "3",
        ScriptLocation: "s3://fakescriptlocation/fakebucket"
      },
      Role: {
        "Fn::GetAtt": [
          "CustomETLJobRole90A83A66",
          "Arn"
        ]
      },
      GlueVersion: "2.0",
      NumberOfWorkers: 2,
      SecurityConfiguration: "testETLJob",
      WorkerType: "G.1X"
    }
  }, ResourcePart.CompleteDefinition);
});

// --------------------------------------------------------------
// Pass an existing Glue Job
// --------------------------------------------------------------
test('Create a Glue Job outside the construct', () => {
  // Stack
  const stack = new Stack();
  const _existingCfnJob = new CfnJob(stack, 'ExistingJob', {
    command: {
      name: 'pythonshell',
      pythonVersion: '2',
      scriptLocation: 's3://existingfakelocation/existingScript'
    },
    role: new Role(stack, 'ExistingJobRole', {
      assumedBy: new ServicePrincipal('glue.amazon.com'),
      description: 'Existing role'
    }).roleArn,
    glueVersion: '1',
    allocatedCapacity: 2,
    maxCapacity: 4,
    numberOfWorkers: 2,
    workerType: 'Standard'
  });

  const _database = defaults.createGlueDatabase(stack, defaults.DefaultGlueDatabaseProps());

  const _glueJob = defaults.buildGlueJob(stack, {
    existingCfnJob: _existingCfnJob,
    outputDataStore: {
      datastoreType: defaults.SinkStoreType.S3
    },
    database: _database,
    table: defaults.createGlueTable(stack, _database, undefined, [{
      name: "id",
      type: "int",
      comment: ""
    }], 'kinesis', {STREAM_NAME: 'testStream'})
  });

  expect(_glueJob[2]).not.toBeDefined();
  expect(stack).toHaveResourceLike('AWS::Glue::Job', {
    Type: "AWS::Glue::Job",
    Properties: {
      AllocatedCapacity: 2,
      Command: {
        Name: "pythonshell",
        PythonVersion: "2",
        ScriptLocation: "s3://existingfakelocation/existingScript",
      },
      GlueVersion: "1",
      MaxCapacity: 4,
      NumberOfWorkers: 2,
      Role: {
        "Fn::GetAtt": [
          "ExistingJobRole8F750976",
          "Arn",
        ],
      },
      WorkerType: "Standard",
    }
  }, ResourcePart.CompleteDefinition);
});

// --------------------------------------------------------------
// Provide additional parameters other than default ones
// --------------------------------------------------------------
test('Test custom deployment properties', () => {
  // Stack
  const stack = new Stack();
  const _commandName = 'glueetl';

  const cfnJobProps: CfnJobProps = {
    command: {
      name: _commandName,
      pythonVersion: '3',
      scriptLocation: 's3://existingfakelocation/existingScript'
    },
    role: new Role(stack, 'ExistingJobRole', {
      assumedBy: new ServicePrincipal('glue.amazon.com'),
      description: 'Existing role'
    }).roleArn,
    glueVersion: '1',
    numberOfWorkers: 2,
    workerType: 'Standard'
  };

  const _database = defaults.createGlueDatabase(stack);

  defaults.buildGlueJob(stack, {
    glueJobProps: cfnJobProps,
    outputDataStore: {
      datastoreType: defaults.SinkStoreType.S3
    },
    database: _database,
    table: defaults.createGlueTable(stack, _database, undefined, [{
      name: "id",
      type: "int",
      comment: ""
    }], 'kinesis', {STREAM_NAME: 'testStream'})
  });

  // check if Glue Job Resource was created correctly
  expect(stack).toHaveResourceLike('AWS::Glue::Job', {
    Properties: {
      Command: {
        Name: "glueetl",
        PythonVersion: "3",
        ScriptLocation: "s3://existingfakelocation/existingScript",
      },
      GlueVersion: "1",
      NumberOfWorkers: 2,
      Role: {
        "Fn::GetAtt": [
          "ExistingJobRole8F750976",
          "Arn",
        ],
      },
      SecurityConfiguration: "ETLJobSecurityConfig",
      WorkerType: "Standard",
    },
    Type: "AWS::Glue::Job"
  }, ResourcePart.CompleteDefinition);

  // check if the role is created
  expect(stack).toHaveResourceLike('AWS::IAM::Role',         {
    Type: "AWS::IAM::Role",
    Properties: {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: {
              Service: "glue.amazon.com"
            }
          }
        ],
        Version: "2012-10-17"
      },
      Description: "Existing role"
    }
  }, ResourcePart.CompleteDefinition);

  // check if the security config is created
  expect(stack).toHaveResourceLike('AWS::Glue::SecurityConfiguration', {
    Properties: {
      EncryptionConfiguration: {
        JobBookmarksEncryption: {
          JobBookmarksEncryptionMode: "CSE-KMS",
          KmsKeyArn: {
            "Fn::Join": [
              "", [
                "arn:", {
                  Ref: "AWS::Partition",
                },
                ":kms:", {
                  Ref: "AWS::Region",
                },
                ":", {
                  Ref: "AWS::AccountId",
                },
                ":alias/aws/glue",
              ],
            ],
          },
        },
        S3Encryptions: [{
          S3EncryptionMode: "SSE-S3",
        }],
      },
      Name: "ETLJobSecurityConfig",
    },
    Type: "AWS::Glue::SecurityConfiguration",
  }, ResourcePart.CompleteDefinition);
});

// --------------------------------------------------------------
// Do not supply parameters and error out
// --------------------------------------------------------------
test('Do no supply glueJobProps or existingCfnJob and error out', () => {
  const stack = new Stack();
  try {
    const _database = defaults.createGlueDatabase(stack);
    defaults.buildGlueJob(stack, {
      outputDataStore: {
        datastoreType: defaults.SinkStoreType.S3
      },
      database: _database,
      table: defaults.createGlueTable(stack, _database, defaults.DefaultGlueTableProps(_database, [{
        name: "id",
        type: "int",
        comment: ""
      }], 'kinesis', {STREAM_NAME: 'testStream'}))
    });
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
  }
});

// --------------------------------------------------------------
// Allow the construct to create the job role required
// --------------------------------------------------------------
test('Test deployment with role creation', () => {
  // Stack
  const stack = new Stack();
  const _jobID = 'glueetl';

  const cfnJobProps = {
    command: {
      name: _jobID,
      pythonVersion: '3',
      scriptLocation: 's3://fakelocation/script'
    }
  };

  const _database = defaults.createGlueDatabase(stack);

  defaults.buildGlueJob(stack, {
    glueJobProps: cfnJobProps,
    outputDataStore: {
      datastoreType: defaults.SinkStoreType.S3
    },
    database: _database,
    table: defaults.createGlueTable(stack, _database, undefined, [{
      name: "id",
      type: "int",
      comment: ""
    }], 'kinesis', {STREAM_NAME: 'testStream'})
  });
  expect(stack).toHaveResourceLike('AWS::IAM::Role', {
    Type: "AWS::IAM::Role",
    Properties: {
      AssumeRolePolicyDocument: {
        Statement: [{
          Action: "sts:AssumeRole",
          Effect: "Allow",
          Principal: {
            Service: "glue.amazonaws.com"
          }
        }],
        Version: "2012-10-17"
      },
      Description: "Service role that Glue custom ETL jobs will assume for exeuction"
    }
  }, ResourcePart.CompleteDefinition);
});

// --------------------------------------------------------------
// Test deployment when output location is provided
// --------------------------------------------------------------
test('Test deployment with role creation', () => {
  // Stack
  const stack = new Stack();
  const _jobID = 'glueetl';

  const cfnJobProps = {
    command: {
      name: _jobID,
      pythonVersion: '3',
      scriptLocation: 's3://fakelocation/script'
    }
  };

  const _database = defaults.createGlueDatabase(stack);

  defaults.buildGlueJob(stack, {
    glueJobProps: cfnJobProps,
    outputDataStore: {
      datastoreType: defaults.SinkStoreType.S3,
      existingS3OutputBucket: new Bucket(stack, 'OutputBucket', {
        versioned: false,
        bucketName: 'outputbucket',
        encryption: BucketEncryption.S3_MANAGED,
        removalPolicy: RemovalPolicy.DESTROY
      })
    },
    database: _database,
    table: defaults.createGlueTable(stack, _database, undefined, [{
      name: "id",
      type: "int",
      comment: ""
    }], 'kinesis', {STREAM_NAME: 'testStream'})
  });
  expect(stack).toHaveResourceLike('AWS::S3::Bucket', {
    Type: 'AWS::S3::Bucket',
    Properties: {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [{
          ServerSideEncryptionByDefault: {
            SSEAlgorithm: "AES256"
          }
        }]
      },
      BucketName: "outputbucket"
    },
    UpdateReplacePolicy: "Delete",
    DeletionPolicy: "Delete"
  }, ResourcePart.CompleteDefinition);
});

// --------------------------------------------------------------
// Test deployment when script location not provided - throw error
// --------------------------------------------------------------
test('Test deployment with role creation', () => {
  // Stack
  const stack = new Stack();
  const _jobID = 'glueetl';

  const cfnJobProps = {
    command: {
      name: _jobID,
      pythonVersion: '3'
    }
  };

  const _database = defaults.createGlueDatabase(stack);
  try {
    defaults.buildGlueJob(stack, {
      glueJobProps: cfnJobProps,
      outputDataStore: {
        datastoreType: defaults.SinkStoreType.S3,
        existingS3OutputBucket: new Bucket(stack, 'OutputBucket', {
          versioned: false
        })
      },
      database: _database,
      table: defaults.createGlueTable(stack, _database, undefined, [{
        name: "id",
        type: "int",
        comment: ""
      }], 'kinesis', {STREAM_NAME: 'testStream'})
    });
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toEqual('Script location has to be provided as an s3 Url location. Script location cannot be empty');
  }
});

// --------------------------------------------------------------
// Dont pass Job Command attributes and it should throw an error
// --------------------------------------------------------------
test('Test for incorrect Job Command property', () => {
  const stack = new Stack();
  try {
    const _database = defaults.createGlueDatabase(stack);
    defaults.buildGlueJob(stack, {
      glueJobProps: {},
      database: _database,
      table: defaults.createGlueTable(stack, _database, undefined, [{
        name: "id",
        type: "int",
        comment: ""
      }], 'kinesis', {STREAM_NAME: 'testStream'})
    });
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
  }
});

// --------------------------------------------------------------
// Check for CfnJob.JobCommandProperty type
// --------------------------------------------------------------
test('check for JobCommandProperty type', () => {
  const stack = new Stack();
  try {
    const _database = defaults.createGlueDatabase(stack);
    defaults.buildGlueJob(stack, {
      glueJobProps: {
        command: {
          fakekey: 'fakevalue'
        }
      },
      database: _database,
      table: defaults.createGlueTable(stack, _database, undefined, [{
        name: "id",
        type: "int",
        comment: ""
      }], 'kinesis', {STREAM_NAME: 'testStream'})
    });
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
  }
});

// --------------------------------------------------------------
// Supply maxCapacity with GlueVersion 2.0 and error out
// --------------------------------------------------------------
test('GlueJob configuration with glueVersion 2.0 should not support maxCapacity and error out', () => {
  const stack = new Stack();
  try {
    const _database = defaults.createGlueDatabase(stack);
    defaults.buildGlueJob(stack, {
      outputDataStore: {
        datastoreType: defaults.SinkStoreType.S3
      },
      database: _database,
      table: defaults.createGlueTable(stack, _database, defaults.DefaultGlueTableProps(_database, [{
        name: "id",
        type: "int",
        comment: ""
      }], 'kinesis', {STREAM_NAME: 'testStream'})),
      glueJobProps: {
        glueVersion: '2.0',
        maxCapacity: '2'
      }
    });
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
  }
});

// --------------------------------------------------------------
// Fail if setting maxCapacity and WorkerType/ NumberOfWorkers
// --------------------------------------------------------------
test('Cannot use maxCapacity and WorkerType, so error out', () => {
  const stack = new Stack();
  try {
    const _database = defaults.createGlueDatabase(stack);
    defaults.buildGlueJob(stack, {
      outputDataStore: {
        datastoreType: defaults.SinkStoreType.S3
      },
      database: _database,
      table: defaults.createGlueTable(stack, _database, defaults.DefaultGlueTableProps(_database, [{
        name: "id",
        type: "int",
        comment: ""
      }], 'kinesis', {STREAM_NAME: 'testStream'})),
      glueJobProps: {
        command: {
          name: "gluejob1.0",
          pythonVersion: '3'
        },
        glueVersion: '1.0',
        maxCapacity: '2',
        workerType: 'Standard'
      }
    });
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
  }
});

test('Cannot use maxCapacity and WorkerType, so error out', () => {
  const stack = new Stack();
  try {
    const _database = defaults.createGlueDatabase(stack);
    defaults.buildGlueJob(stack, {
      outputDataStore: {
        datastoreType: defaults.SinkStoreType.S3
      },
      database: _database,
      table: defaults.createGlueTable(stack, _database, defaults.DefaultGlueTableProps(_database, [{
        name: "id",
        type: "int",
        comment: ""
      }], 'kinesis', {STREAM_NAME: 'testStream'})),
      glueJobProps: {
        command: {
          name: "gluejob1.0",
          pythonVersion: '3'
        },
        glueVersion: '1.0',
        maxCapacity: '2',
        numberOfWorkers: 2
      }
    });
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
  }
});

test('Cannot use maxCapacity and WorkerType, so error out', () => {
  const stack = new Stack();
  try {
    const _database = defaults.createGlueDatabase(stack);
    defaults.buildGlueJob(stack, {
      outputDataStore: {
        datastoreType: defaults.SinkStoreType.S3
      },
      database: _database,
      table: defaults.createGlueTable(stack, _database, defaults.DefaultGlueTableProps(_database, [{
        name: "id",
        type: "int",
        comment: ""
      }], 'kinesis', {STREAM_NAME: 'testStream'})),
      glueJobProps: {
        command: {
          name: "gluejob1.0",
          pythonVersion: '3'
        },
        glueVersion: '1.0',
        maxCapacity: '2',
        numberOfWorkers: 2,
        workerType: 'G1.X'
      }
    });
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
  }
});