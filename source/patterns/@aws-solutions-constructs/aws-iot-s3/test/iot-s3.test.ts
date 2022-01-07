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

import { IotToS3, IotToS3Props } from "../lib";
import * as cdk from "@aws-cdk/core";
import '@aws-cdk/assert/jest';
import * as s3 from "@aws-cdk/aws-s3";
import { RemovalPolicy } from "@aws-cdk/core";

test('check for default props', () => {
  const stack = new cdk.Stack();

  const props: IotToS3Props = {
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "process solutions constructs messages",
        sql: "SELECT * FROM 'solutions/constructs'",
        actions: []
      }
    }
  };
  const construct = new IotToS3(stack, 'test-iot-s3-integration', props);

  // Check whether construct has two s3 buckets for storing msgs and logging
  expect(stack).toCountResources('AWS::S3::Bucket', 2);

  // Check for IoT Topic Rule Definition
  expect(stack).toHaveResource('AWS::IoT::TopicRule', {
    TopicRulePayload: {
      Actions: [
        {
          S3: {
            BucketName: {
              Ref: "testiots3integrationS3Bucket9B8B180C"
            },
            Key: "${topic()}/${timestamp()}",
            RoleArn: {
              "Fn::GetAtt": [
                "testiots3integrationiotactionsrole04473665",
                "Arn"
              ]
            }
          }
        }
      ],
      Description: "process solutions constructs messages",
      RuleDisabled: false,
      Sql: "SELECT * FROM 'solutions/constructs'"
    }
  });

  // Check for IAM policy to have access to s3 bucket
  /**
   * Due to difference in CDK V1 and V2 Synth, the policy documents doesn't match, hence checking only for number of policies
   */
  expect(stack).toCountResources('AWS::IAM::Policy', 1);

  // Check for properties
  expect(construct.s3Bucket).toBeDefined();
  expect(construct.s3BucketInterface).toBeDefined();
  expect(construct.s3LoggingBucket).toBeDefined();
  expect(construct.iotActionsRole).toBeDefined();
  expect(construct.iotTopicRule).toBeDefined();
});

test('check for overriden props', () => {
  const stack = new cdk.Stack();
  const props: IotToS3Props = {
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: true,
        description: "process solutions constructs messages",
        sql: "SELECT * FROM 'test/constructs'",
        actions: []
      }
    },
    s3Key: 'test/key',
    bucketProps: {
      encryption: s3.BucketEncryption.KMS
    },
    loggingBucketProps: {
      encryption: s3.BucketEncryption.KMS_MANAGED
    }
  };
  const construct = new IotToS3(stack, 'test-iot-s3-integration', props);

  // Check whether construct has two s3 buckets for storing msgs and logging
  expect(stack).toCountResources('AWS::S3::Bucket', 2);

  // Check logging bucket encryption type to be KMS_Managed
  expect(stack).toHaveResourceLike('AWS::S3::Bucket', {
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [
        {
          ServerSideEncryptionByDefault: {
            SSEAlgorithm: "aws:kms"
          }
        }
      ]
    }
  });

  // Check for bucket to have KMS CMK Encryption
  expect(stack).toHaveResourceLike('AWS::S3::Bucket', {
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [
        {
          ServerSideEncryptionByDefault: {
            KMSMasterKeyID: {
              "Fn::GetAtt": [
                "testiots3integrationS3BucketKey127368C9",
                "Arn"
              ]
            },
            SSEAlgorithm: "aws:kms"
          }
        }
      ]
    },
  });

  // Check for IoT Topic Rule Definition
  expect(stack).toHaveResource('AWS::IoT::TopicRule', {
    TopicRulePayload: {
      Actions: [
        {
          S3: {
            BucketName: {
              Ref: "testiots3integrationS3Bucket9B8B180C"
            },
            Key: "test/key",
            RoleArn: {
              "Fn::GetAtt": [
                "testiots3integrationiotactionsrole04473665",
                "Arn"
              ]
            }
          }
        }
      ],
      Description: "process solutions constructs messages",
      RuleDisabled: true,
      Sql: "SELECT * FROM 'test/constructs'"
    }
  });

  /**
   * Due to difference in CDK V1 and V2 Synth, the policy documents doesn't match, hence checking only for number of policies
   */
  // Check for automatically created CMK KMS Key
  expect(stack).toCountResources('AWS::KMS::Key', 1);

  // Check for IoT Topic Rule permissions to KMS key to store msgs to S3 Bucket and access to put data to s3 bucket
  expect(stack).toCountResources('AWS::IAM::Policy', 1);

  // Check for properties
  expect(construct.s3Bucket).toBeDefined();
  expect(construct.s3BucketInterface).toBeDefined();
  expect(construct.s3LoggingBucket).toBeDefined();
  expect(construct.iotActionsRole).toBeDefined();
  expect(construct.iotTopicRule).toBeDefined();
});

test('check for existing bucket', () => {
  const stack = new cdk.Stack();
  const existingBucket = new s3.Bucket(stack, `existingBucket`);
  const props: IotToS3Props = {
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "process solutions constructs messages",
        sql: "SELECT * FROM 'test/constructs'",
        actions: []
      }
    },
    s3Key: 'existingtest/key',
    existingBucketInterface: existingBucket
  };
  const construct = new IotToS3(stack, 'test-iot-s3-integration', props);

  // Check whether construct has a single s3 bucket, no logging bucket should exist since existing bucket is supplied
  expect(stack).toCountResources('AWS::S3::Bucket', 1);

  // Check for IoT Topic Rule Definition with existing Bucket Ref
  expect(stack).toHaveResource('AWS::IoT::TopicRule', {
    TopicRulePayload: {
      Actions: [
        {
          S3: {
            BucketName: {
              Ref: "existingBucket9529822F"
            },
            Key: "existingtest/key",
            RoleArn: {
              "Fn::GetAtt": [
                "testiots3integrationiotactionsrole04473665",
                "Arn"
              ]
            }
          }
        }
      ],
      Description: "process solutions constructs messages",
      RuleDisabled: false,
      Sql: "SELECT * FROM 'test/constructs'"
    }
  });

  /**
   * Due to difference in CDK V1 and V2 Synth, the policy documents doesn't match, hence checking only for number of policies
   */
  // Check for IAM policy to have access to s3 bucket
  expect(stack).toCountResources('AWS::IAM::Policy', 1);

  // since existing bucket is supplied, no key should exist
  expect(stack).not.toHaveResource('AWS::KMS::Key', {});

  // Check for IoT Topic Rule permissions to KMS key to store msgs to S3 Bucket
  expect(stack).toCountResources("AWS::IAM::Policy", 1);

  // Check for properties
  expect(construct.s3Bucket).toBeUndefined();
  expect(construct.s3BucketInterface).toBeDefined();
  expect(construct.s3LoggingBucket).toBeUndefined();
  expect(construct.iotActionsRole).toBeDefined();
  expect(construct.iotTopicRule).toBeDefined();
});

test('check for both bucketProps and existingBucket', () => {
  const stack = new cdk.Stack();
  const existingBucket = new s3.Bucket(stack, `existingBucket`, {encryption: s3.BucketEncryption.KMS});
  const props: IotToS3Props = {
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "process solutions constructs messages",
        sql: "SELECT * FROM 'test/constructs'",
        actions: []
      }
    },
    bucketProps: {
      encryption: s3.BucketEncryption.KMS_MANAGED
    },
    existingBucketInterface: existingBucket
  };

  // since bucketprops and existing bucket is supplied, this should result in error
  try {
    new IotToS3(stack, 'test-iot-s3-integration', props);
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
  }
});

test('check for name collision', () => {
  const stack = new cdk.Stack();
  const props: IotToS3Props = {
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "process solutions constructs messages",
        sql: "SELECT * FROM 'test/constructs'",
        actions: []
      }
    },
    bucketProps: {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY
    }
  };

  // since bucketprops and existing bucket is supplied, this should result in error
  new IotToS3(stack, 'test-iot-s3-integration', props);
  new IotToS3(stack, 'test-iot-s3-integration1', props);

  expect(stack).toCountResources('AWS::IoT::TopicRule', 2);
  expect(stack).toCountResources('AWS::S3::Bucket', 4);
});

test('check for chaining of resource', () => {
  const stack = new cdk.Stack();
  const props: IotToS3Props = {
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "process solutions constructs messages",
        sql: "SELECT * FROM 'test/constructs'",
        actions: []
      }
    }
  };

  // since bucketprops and existing bucket is supplied, this should result in error
  const construct = new IotToS3(stack, 'test-iot-s3-integration', props);

  const props1: IotToS3Props = {
    iotTopicRuleProps: {
      topicRulePayload: {
        ruleDisabled: false,
        description: "process solutions constructs messages",
        sql: "SELECT * FROM 'test/constructs'",
        actions: []
      }
    },
    existingBucketInterface: construct.s3Bucket
  };
  new IotToS3(stack, 'test-iot-s3-integration1', props1);

  expect(stack).toCountResources('AWS::IoT::TopicRule', 2);
  expect(stack).toCountResources('AWS::S3::Bucket', 2);
});