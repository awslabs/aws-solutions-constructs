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
import { Stack, RemovalPolicy } from "aws-cdk-lib";
import { S3ToSqs, S3ToSqsProps } from "../lib";
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Template } from 'aws-cdk-lib/assertions';
import * as defaults from '@aws-solutions-constructs/core';

test('Test getter methods', () => {
  // Initial Setup
  const stack = new Stack();
  const filter: s3.NotificationKeyFilter = { prefix: 'the/place', suffix: '*.mp3' };
  const props: S3ToSqsProps = {
    deployDeadLetterQueue: true,
    maxReceiveCount: 0,
    queueProps: {},
    s3EventTypes: [s3.EventType.OBJECT_REMOVED],
    s3EventFilters: [filter]
  };
  const app = new S3ToSqs(stack, 'test-s3-sqs', props);
  // Assertion 1
  expect(app.sqsQueue).toBeDefined();
  // Assertion 2
  expect(app.deadLetterQueue).toBeDefined();
  // Assertion 3
  expect(app.s3Bucket).toBeDefined();
});

test('Test deployment w/ existing queue', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const kmsKey: kms.Key = new kms.Key(stack, 'ExistingQueueEncryptionKey', {});
  const queue = new sqs.Queue(stack, 'existing-queue-obj', {
    queueName: 'existing-queue-obj',
    encryptionMasterKey: kmsKey
  });
  new S3ToSqs(stack, 'test-s3-sqs', {
    existingQueueObj: queue
  });
  // Assertion 1
  const template = Template.fromStack(stack);
  template.hasResourceProperties("Custom::S3BucketNotifications", {
    NotificationConfiguration: {
      QueueConfigurations: [
        {
          Events: ['s3:ObjectCreated:*'],
          QueueArn: {
            "Fn::GetAtt": [
              "existingqueueobjF8AF0ED1",
              "Arn"
            ]
          }
        }
      ]
    }
  });
});

test('Test deployment w/ existing Bucket', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration

  const buildS3BucketResponse = defaults.buildS3Bucket(stack, {});
  new S3ToSqs(stack, 'test-s3-sqs', {
    existingBucketObj: buildS3BucketResponse.bucket
  });
  // Assertion 1
  const template = Template.fromStack(stack);
  template.hasResourceProperties("Custom::S3BucketNotifications", {
    NotificationConfiguration: {
      QueueConfigurations: [
        {
          Events: ['s3:ObjectCreated:*'],
          QueueArn: {
            "Fn::GetAtt": [
              "tests3sqsqueue810CCE19",
              "Arn"
            ]
          }
        }
      ]
    }
  });
});

test('Pattern deployment w/ bucket versioning turned off', () => {
  const stack = new Stack();
  const props: S3ToSqsProps = {
    bucketProps: {
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: true,
        ignorePublicAcls: false,
        restrictPublicBuckets: true
      }
    }
  };
  new S3ToSqs(stack, 'test-s3-sqs', props);
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::S3::Bucket", {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: false,
      BlockPublicPolicy: true,
      IgnorePublicAcls: false,
      RestrictPublicBuckets: true
    }
  });
});

test('Test deployment w/ s3 event types and filters', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const filter: s3.NotificationKeyFilter = {
    prefix: 'the/place',
    suffix: '*.mp3'
  };
  const props: S3ToSqsProps = {
    deployDeadLetterQueue: true,
    maxReceiveCount: 0,
    queueProps: {},
    s3EventTypes: [s3.EventType.OBJECT_REMOVED],
    s3EventFilters: [filter]
  };
  new S3ToSqs(stack, 'test-s3-sqs', props);
  // Assertion 1
  const template = Template.fromStack(stack);
  template.hasResourceProperties("Custom::S3BucketNotifications", {
    NotificationConfiguration: {
      QueueConfigurations: [
        {
          Events: ['s3:ObjectRemoved:*'],
          Filter: {
            Key: {
              FilterRules: [
                {
                  Name: 'suffix',
                  Value: '*.mp3'
                },
                {
                  Name: 'prefix',
                  Value: 'the/place'
                }
              ]
            }
          },
          QueueArn: {
            "Fn::GetAtt": [
              "tests3sqsqueue810CCE19",
              "Arn"
            ]
          }
        }
      ]
    }
  });
});

test('Test deployment w/ SSE encryption enabled using customer managed KMS CMK', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  new S3ToSqs(stack, 'test-s3-sqs', {
    enableEncryptionWithCustomerManagedKey: true
  });

  // Assertion 1
  const template = Template.fromStack(stack);
  template.resourceCountIs("Custom::S3BucketNotifications", 1);

  // Assertion 2
  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "tests3sqsqueueKey27AABDC5",
        "Arn"
      ]
    }
  });

  // Assertion 3
  template.hasResourceProperties('AWS::KMS::Key', {
    EnableKeyRotation: true
  });
});

test("Test bad call with existingBucket and bucketProps", () => {
  // Stack
  const stack = new Stack();

  const testBucket = new s3.Bucket(stack, 'test-bucket', {});

  const app = () => {
    // Helper declaration
    new S3ToSqs(stack, "bad-s3-args", {
      existingBucketObj: testBucket,
      bucketProps: {
        removalPolicy: RemovalPolicy.DESTROY
      },
    });
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide bucketProps or existingBucketObj, but not both.\n');
});

test('s3 bucket with bucket, loggingBucket, and auto delete objects', () => {
  const stack = new Stack();

  new S3ToSqs(stack, 's3-sqs', {
    bucketProps: {
      removalPolicy: RemovalPolicy.DESTROY,
    },
    loggingBucketProps: {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    }
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::S3::Bucket", 2);

  template.hasResourceProperties("Custom::S3AutoDeleteObjects", {
    ServiceToken: {
      "Fn::GetAtt": [
        "CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F",
        "Arn"
      ]
    },
    BucketName: {
      Ref: "s3sqsS3LoggingBucketD877FC52"
    }
  });
});

test('s3 bucket with one content bucket and no logging bucket', () => {
  const stack = new Stack();

  new S3ToSqs(stack, 's3-sqs', {
    bucketProps: {
      removalPolicy: RemovalPolicy.DESTROY,
    },
    logS3AccessLogs: false
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::S3::Bucket", 1);
});

test('Queue is encrypted with imported CMK when set on encryptionKey prop', () => {
  const stack = new Stack();
  const key = new kms.Key(stack, 'cmk');
  new S3ToSqs(stack, 'test-s3-sqs', {
    encryptionKey: key
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "cmk01DE03DA",
        "Arn"
      ]
    }
  });
});

test('Queue is encrypted with provided encryptionKeyProps', () => {
  const stack = new Stack();
  new S3ToSqs(stack, 'test-s3-sqs', {
    encryptionKeyProps: {
      alias: 'new-key-alias-from-props'
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "tests3sqsqueueKey27AABDC5",
        "Arn"
      ]
    }
  });

  template.hasResourceProperties('AWS::KMS::Alias', {
    AliasName: 'alias/new-key-alias-from-props',
    TargetKeyId: {
      "Fn::GetAtt": [
        "tests3sqsqueueKey27AABDC5",
        "Arn"
      ]
    }
  });
});

test('Queue is encrypted with imported CMK when set on queueProps.encryptionMasterKey prop', () => {
  const stack = new Stack();
  const key = new kms.Key(stack, 'cmk');
  new S3ToSqs(stack, 'test-s3-sqs', {
    queueProps: {
      encryptionMasterKey: key
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "cmk01DE03DA",
        "Arn"
      ]
    }
  });
});

test('Queue is encrypted by default with Customer-managed KMS key when no other encryption properties are set', () => {
  const stack = new Stack();
  new S3ToSqs(stack, 'test-s3-sqs', {
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "tests3sqsqueueKey27AABDC5",
        "Arn"
      ]
    }
  });
});

test('Queue is encrypted with SQS-managed KMS Key when enable encryption flag is false', () => {
  const stack = new Stack();
  new S3ToSqs(stack, 'test-s3-sqs', {
    enableEncryptionWithCustomerManagedKey: false
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SQS::Queue", {
    KmsMasterKeyId: "alias/aws/sqs"
  });
});

test('Confirm CheckSqsProps is called', () => {
  // Initial Setup
  const stack = new Stack();
  const filter: s3.NotificationKeyFilter = { prefix: 'the/place', suffix: '*.mp3' };
  const props: S3ToSqsProps = {
    deployDeadLetterQueue: true,
    maxReceiveCount: 0,
    s3EventTypes: [s3.EventType.OBJECT_REMOVED],
    s3EventFilters: [filter],
    queueProps: {
      removalPolicy: RemovalPolicy.DESTROY,
    },
    existingQueueObj: new sqs.Queue(stack, 'test', {})
  };

  const app = () => {
    new S3ToSqs(stack, 'test-s3-sqs', props);
  };
  expect(app).toThrowError("Error - Either provide queueProps or existingQueueObj, but not both.\n");
});

test('Confirm CheckS3Props is being called', () => {
  const stack = new Stack();

  const app = () => {
    new S3ToSqs(stack, 'test-s3-sqs', {
      bucketProps: {},
      existingBucketObj: new s3.Bucket(stack, 'test-bucket', {}),
    });
  };

  // Assertion
  expect(app).toThrowError(/Error - Either provide bucketProps or existingBucketObj, but not both.\n/);
});
