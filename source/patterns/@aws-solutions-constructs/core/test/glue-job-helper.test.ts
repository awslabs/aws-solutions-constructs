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

// Imports
import { Template } from 'aws-cdk-lib/assertions';
import { CfnJob, CfnJobProps } from 'aws-cdk-lib/aws-glue';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { RemovalPolicy, Stack } from "aws-cdk-lib";
import * as defaults from '..';

test('Test deployment with role creation', () => {
  // Stack
  const stack = new Stack();

  const jobRole = new Role(stack, 'CustomETLJobRole', {
    assumedBy: new ServicePrincipal('glue.amazonaws.com')
  });

  const cfnJobProps: CfnJobProps = defaults.DefaultGlueJobProps(jobRole, {
    command: {
      name: 'glueetl',
      pythonVersion: '3',
      scriptLocation: 's3://fakescriptlocation/fakebucket',
    },
    role: jobRole.roleArn
  }, 'testETLJob', {});

  const database = defaults.createGlueDatabase(stack, defaults.DefaultGlueDatabaseProps());

  const glueJob = defaults.buildGlueJob(stack, {
    glueJobProps: cfnJobProps,
    database,
    table: defaults.createGlueTable(stack, database, undefined, [{
      name: "id",
      type: "int",
      comment: ""
    }], 'kinesis', {STREAM_NAME: 'testStream'})
  });

  expect(glueJob.bucket).toBeDefined();
  expect(glueJob.bucket).toBeInstanceOf(Bucket);
  Template.fromStack(stack).hasResource('AWS::Glue::Job', {
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
  });
});

test('Create a Glue Job outside the construct', () => {
  // Stack
  const stack = new Stack();
  const existingCfnJob = new CfnJob(stack, 'ExistingJob', {
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

  const database = defaults.createGlueDatabase(stack, defaults.DefaultGlueDatabaseProps());

  const glueJob = defaults.buildGlueJob(stack, {
    existingCfnJob,
    outputDataStore: {
      datastoreType: defaults.SinkStoreType.S3
    },
    database,
    table: defaults.createGlueTable(stack, database, undefined, [{
      name: "id",
      type: "int",
      comment: ""
    }], 'kinesis', {STREAM_NAME: 'testStream'})
  });

  expect(glueJob.bucket).not.toBeDefined();
  expect(glueJob.loggingBucket).not.toBeDefined();
  Template.fromStack(stack).hasResource('AWS::Glue::Job', {
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
  });
});

test('Test custom deployment properties', () => {
  // Stack
  const stack = new Stack();
  const commandName = 'glueetl';

  const cfnJobProps: CfnJobProps = {
    command: {
      name: commandName,
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

  const database = defaults.createGlueDatabase(stack);

  defaults.buildGlueJob(stack, {
    glueJobProps: cfnJobProps,
    outputDataStore: {
      datastoreType: defaults.SinkStoreType.S3
    },
    database,
    table: defaults.createGlueTable(stack, database, undefined, [{
      name: "id",
      type: "int",
      comment: ""
    }], 'kinesis', {STREAM_NAME: 'testStream'})
  });

  const template = Template.fromStack(stack);
  // check if Glue Job Resource was created correctly
  template.hasResource('AWS::Glue::Job', {
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
  });

  // check if the role is created
  template.hasResource('AWS::IAM::Role',         {
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
  });

  // check if the security config is created
  template.hasResource('AWS::Glue::SecurityConfiguration', {
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
  });
});

test('Do no supply glueJobProps or existingCfnJob and error out', () => {
  const stack = new Stack();
  try {
    const database = defaults.createGlueDatabase(stack);
    defaults.buildGlueJob(stack, {
      outputDataStore: {
        datastoreType: defaults.SinkStoreType.S3
      },
      database,
      table: defaults.createGlueTable(stack, database, defaults.DefaultGlueTableProps(database, [{
        name: "id",
        type: "int",
        comment: ""
      }], 'kinesis', {STREAM_NAME: 'testStream'}))
    });
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
  }
});

test('llow the construct to create the job role required', () => {
  // Stack
  const stack = new Stack();
  const jobID = 'glueetl';

  const cfnJobProps = {
    command: {
      name: jobID,
      pythonVersion: '3',
      scriptLocation: 's3://fakelocation/script'
    }
  };

  const database = defaults.createGlueDatabase(stack);

  defaults.buildGlueJob(stack, {
    glueJobProps: cfnJobProps,
    outputDataStore: {
      datastoreType: defaults.SinkStoreType.S3
    },
    database,
    table: defaults.createGlueTable(stack, database, undefined, [{
      name: "id",
      type: "int",
      comment: ""
    }], 'kinesis', {STREAM_NAME: 'testStream'})
  });
  Template.fromStack(stack).hasResource('AWS::IAM::Role', {
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
      Description: "Service role that Glue custom ETL jobs will assume for execution"
    }
  });
});

test('Test deployment when output location is provided', () => {
  // Stack
  const stack = new Stack();
  const jobID = 'glueetl';

  const cfnJobProps = {
    command: {
      name: jobID,
      pythonVersion: '3',
      scriptLocation: 's3://fakelocation/script'
    }
  };

  const database = defaults.createGlueDatabase(stack);

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
    database,
    table: defaults.createGlueTable(stack, database, undefined, [{
      name: "id",
      type: "int",
      comment: ""
    }], 'kinesis', {STREAM_NAME: 'testStream'})
  });
  Template.fromStack(stack).hasResource('AWS::S3::Bucket', {
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
  });
});

test('Test for incorrect Job Command property', () => {
  const stack = new Stack();
  try {
    const database = defaults.createGlueDatabase(stack);
    defaults.buildGlueJob(stack, {
      glueJobProps: {},
      database,
      table: defaults.createGlueTable(stack, database, undefined, [{
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
    const database = defaults.createGlueDatabase(stack);
    defaults.buildGlueJob(stack, {
      glueJobProps: {
        command: {
          fakekey: 'fakevalue'
        }
      },
      database,
      table: defaults.createGlueTable(stack, database, undefined, [{
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
    const database = defaults.createGlueDatabase(stack);
    defaults.buildGlueJob(stack, {
      outputDataStore: {
        datastoreType: defaults.SinkStoreType.S3
      },
      database,
      table: defaults.createGlueTable(stack, database, defaults.DefaultGlueTableProps(database, [{
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

test('Cannot use maxCapacity and WorkerType, so error out', () => {
  const stack = new Stack();
  try {
    const database = defaults.createGlueDatabase(stack);
    defaults.buildGlueJob(stack, {
      outputDataStore: {
        datastoreType: defaults.SinkStoreType.S3
      },
      database,
      table: defaults.createGlueTable(stack, database, defaults.DefaultGlueTableProps(database, [{
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
    const database = defaults.createGlueDatabase(stack);
    defaults.buildGlueJob(stack, {
      outputDataStore: {
        datastoreType: defaults.SinkStoreType.S3
      },
      database,
      table: defaults.createGlueTable(stack, database, defaults.DefaultGlueTableProps(database, [{
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
    const database = defaults.createGlueDatabase(stack);
    defaults.buildGlueJob(stack, {
      outputDataStore: {
        datastoreType: defaults.SinkStoreType.S3
      },
      database,
      table: defaults.createGlueTable(stack, database, defaults.DefaultGlueTableProps(database, [{
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
