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

// Imports
import { ResourcePart, SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import { CfnJob, CfnJobProps } from '@aws-cdk/aws-glue';
import { Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import { Stack } from "@aws-cdk/core";
import * as defaults from '..';

// --------------------------------------------------------------
// Test minimal deployment with no properties
// --------------------------------------------------------------
test('Test minimal deployment with no properties', () => {
  // Stack
  const stack = new Stack();
  const _jobID = 'glueetl';

  const _jobRole = new Role(stack, 'CustomETLJobRole', {
    assumedBy: new ServicePrincipal('glue.amazonaws.com')
  });

  const cfnJobProps: CfnJobProps = defaults.DefaultGlueJobProps(_jobRole.roleArn, {
    name: _jobID,
    pythonVersion: '3',
    scriptLocation: 's3://fakelocation/script'
  }, 'testETLJob');

  defaults.buildGlueJob(stack, { glueJobProps: cfnJobProps });
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  // Assertion 2
  expect(stack).toHaveResourceLike('AWS::Glue::Job', {
    Type: "AWS::Glue::Job",
    Properties: {
      Command: {
        Name: "glueetl",
        PythonVersion: "3",
        ScriptLocation: "s3://fakelocation/script"
      },
      Role: {
        "Fn::GetAtt": [
          "CustomETLJobRole90A83A66",
          "Arn"
        ]
      },
      SecurityConfiguration: "testETLJob"
    }
  }, ResourcePart.CompleteDefinition);
});

// --------------------------------------------------------------
// Create a Glue job outside the construct, should not create a new one
// --------------------------------------------------------------
test('Create a Glue Job outside the construct', () => {
  // Stack
  const stack = new Stack();
  const _existingCfnJob = new CfnJob(stack, 'ExistingJob', {
    command: {
        name: 'pythonshell',
        pythonVersion: '2',
        scriptLocation: 's3://existingFakeLocation/existingScript'
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

  defaults.buildGlueJob(stack, {
      existingCfnJob: _existingCfnJob
  });
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  expect(stack).toHaveResourceLike('AWS::Glue::Job', {
    Type: "AWS::Glue::Job",
    Properties: {
      AllocatedCapacity: 2,
      Command: {
        Name: "pythonshell",
        PythonVersion: "2",
        ScriptLocation: "s3://existingFakeLocation/existingScript",
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
      scriptLocation: 's3://existingFakeLocation/existingScript'
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
  };

  defaults.buildGlueJob(stack, { glueJobProps: cfnJobProps });
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();

  // check if Glue Job Resource was created correctly
  expect(stack).toHaveResourceLike('AWS::Glue::Job', {
    Properties: {
      AllocatedCapacity: 2,
      Command: {
        Name: "glueetl",
        PythonVersion: "3",
        ScriptLocation: "s3://existingFakeLocation/existingScript",
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

test('Do no supply glueJobProps or existingCfnJob and error out', () => {
  const stack = new Stack();
  try {
    defaults.buildGlueJob(stack, {});
  } catch(error) {
    expect(error).toBeInstanceOf(Error);
  }
});