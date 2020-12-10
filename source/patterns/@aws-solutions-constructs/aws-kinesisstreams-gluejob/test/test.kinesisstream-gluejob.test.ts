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

import { ResourcePart, SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import { CfnJob } from '@aws-cdk/aws-glue';
import { Bucket } from '@aws-cdk/aws-s3';
import { Stack } from "@aws-cdk/core";
import { buildKinesisStream } from '@aws-solutions-constructs/core';
import { KinesisStreamGlueJob, KinesisStreamGlueJobProps } from '../lib';

// --------------------------------------------------------------
// Pattern minimal deployment
// --------------------------------------------------------------
test('Pattern minimal deployment', () => {
    // Initial setup
    const stack = new Stack();
    const props: KinesisStreamGlueJobProps = {
        glueJobProps: {
            command: KinesisStreamGlueJob.createGlueJobCommand(stack, 'testJob', '3'),
            role: KinesisStreamGlueJob.createGlueJobRole(stack).roleArn,
            securityConfiguration: 'testSecConfig'
        }
    };
    new KinesisStreamGlueJob(stack, 'test-kinesisstreams-lambda', props);
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();

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

    // check for bucket creation
    expect(stack).toHaveResourceLike('AWS::S3::Bucket', {
        Properties: {
            BucketEncryption: {
                ServerSideEncryptionConfiguration: [{
                    ServerSideEncryptionByDefault: {
                        SSEAlgorithm: "AES256",
                    },
                }],
            },
            LoggingConfiguration: {
                DestinationBucketName: {
                    Ref: "S3LoggingBucket800A2B27",
                },
            },
            PublicAccessBlockConfiguration: {
                BlockPublicAcls: true,
                BlockPublicPolicy: true,
                IgnorePublicAcls: true,
                RestrictPublicBuckets: true,
            },
            VersioningConfiguration: {
                Status: "Enabled",
            },
        },
        Type: "AWS::S3::Bucket",
        UpdateReplacePolicy: "Retain"
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
        PolicyDocument: {
            Statement: [{
                Action: [
                    "kinesis:DescribeStreamSummary",
                    "kinesis:GetRecords",
                    "kinesis:GetShardIterator",
                    "kinesis:ListShards",
                    "kinesis:SubscribeToShard",
                ],
                Effect: "Allow",
                Resource: {
                    "Fn::GetAtt": [
                        "testkinesisstreamslambdaKinesisStream374D6D56",
                        "Arn",
                    ],
                },
            }],
            Version: "2012-10-17"
        }
    }, ResourcePart.Properties);
});

// --------------------------------------------------------------
// Test if existing Glue Job is provided
// --------------------------------------------------------------
test('Pattern minimal deployment', () => {
    // Initial setup
    const stack = new Stack();
    const existingCfnJob = new CfnJob(stack, 'ExistingJob', {
        command: KinesisStreamGlueJob.createGlueJobCommand(stack, 'testJob', '3'),
        role: KinesisStreamGlueJob.createGlueJobRole(stack).roleArn,
        securityConfiguration: 'testSecConfig'
    });

    new KinesisStreamGlueJob(stack, 'test-kinesisstreams-lambda', {
        existingGlueJob: existingCfnJob
    });
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();

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
        PolicyDocument: {
            Statement: [{
                Action: [
                    "kinesis:DescribeStreamSummary",
                    "kinesis:GetRecords",
                    "kinesis:GetShardIterator",
                    "kinesis:ListShards",
                    "kinesis:SubscribeToShard",
                ],
                Effect: "Allow",
                Resource: {
                    "Fn::GetAtt": [
                        "testkinesisstreamslambdaKinesisStream374D6D56",
                        "Arn",
                    ],
                },
            }],
            Version: "2012-10-17"
        }
    }, ResourcePart.Properties);
});

// --------------------------------------------------------------
// Test if existing S3 bucket location is provided
// --------------------------------------------------------------
test('When S3 bucket location for script exists', () => {
    // Initial setup
    const stack = new Stack();
    const props: KinesisStreamGlueJobProps = {
        glueJobProps: {
            command: KinesisStreamGlueJob.createGlueJobCommand(stack, 'testJob', '3', new Bucket(stack, 'ScriptLocation')),
            role: KinesisStreamGlueJob.createGlueJobRole(stack).roleArn,
            securityConfiguration: 'testSecConfig'
        },
    };
    new KinesisStreamGlueJob(stack, 'test-kinesisstreams-lambda', props);
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();

    // Assert existing bucket
    expect(stack).toHaveResourceLike('AWS::S3::Bucket', {
        DeletionPolicy: "Retain",
        Type: "AWS::S3::Bucket",
        UpdateReplacePolicy: "Retain",
    }, ResourcePart.CompleteDefinition);

    // Assert bucket policy on existing bucket
    expect(stack).toHaveResourceLike('AWS::S3::BucketPolicy', {
        Properties: {
            Bucket: {
                Ref: "ScriptLocation6396DB53",
            },
            PolicyDocument: {
                Statement: [{
                    Action: [ "s3:GetObject*", "s3:GetBucket*", "s3:List*" ],
                    Effect: "Allow",
                    Principal: {
                        Service: "glue.amazonaws.com",
                    },
                    Resource: [{
                        "Fn::GetAtt": [
                            "ScriptLocation6396DB53",
                            "Arn",
                        ]}, {
                            "Fn::Join": [
                                "", [{
                                    "Fn::GetAtt": [
                                        "ScriptLocation6396DB53",
                                        "Arn",
                                    ],
                                },
                                "/*",
                                ],
                            ],
                        },
                    ],
                }],
                Version: "2012-10-17",
            }
        },
        Type: "AWS::S3::BucketPolicy"
    }, ResourcePart.CompleteDefinition);
});

// --------------------------------------------------------------
// Test when the construct is supplied with an existing stream
// --------------------------------------------------------------
test('create glue job with existing kinesis stream', () => {
    const stack = new Stack();
    const kinesisStream = buildKinesisStream(stack, {});
    new KinesisStreamGlueJob(stack, 'existingStreamJob', {
        existingStreamObj: kinesisStream,
        glueJobProps: {
            command: KinesisStreamGlueJob.createGlueJobCommand(stack, 'JobCommand', '3'),
            role: KinesisStreamGlueJob.createGlueJobRole(stack).roleArn
        }
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();

    // Assert if the Glue Job role has read access to the stream
    expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
        Properties: {
            PolicyDocument: {
                Statement: [{
                    Action: [ "kinesis:DescribeStreamSummary", "kinesis:GetRecords", "kinesis:GetShardIterator",
                                "kinesis:ListShards", "kinesis:SubscribeToShard"
                    ],
                    Effect: "Allow",
                    Resource: {
                        "Fn::GetAtt":  [
                            "KinesisStream46752A3E",
                            "Arn",
                        ]
                    },
                }],
                Version: "2012-10-17",
            },
            PolicyName: "GlueJobRolePolicy422D4F2E",
            Roles: [{
                "Fn::Select": [
                    1, {
                        "Fn::Split": [
                        "/", {
                            "Fn::Select": [
                                5, {
                                    "Fn::Split": [
                                    ":", {
                                        "Fn::GetAtt": [
                                            "JobRole014917C6",
                                            "Arn",
                                        ],
                                    }]
                                },
                            ]
                        },
                    ],
                }],
            }],
        },
        Type: "AWS::IAM::Policy",
    }, ResourcePart.CompleteDefinition);
});