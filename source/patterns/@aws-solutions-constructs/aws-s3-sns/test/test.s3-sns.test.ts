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

import { Stack } from "aws-cdk-lib";
import { S3ToSns } from "../lib";
import '@aws-cdk/assert/jest';
import * as defaults from '@aws-solutions-constructs/core';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import { expectKmsKeyAttachedToCorrectResource } from "@aws-solutions-constructs/core";

test('All get methods return non-null objects', () => {
  const stack = new Stack();
  const app = new S3ToSns(stack, 'test-s3-sns', {

  });
  expect(app.snsTopic !== null);
  expect(app.s3Bucket !== null);
  expect(app.s3LoggingBucket !== null);
  expect(app.encryptionKey !== null);
  expect(app.s3BucketInterface !== null);
});

test('construct creates default event notification', () => {
  const stack = new Stack();
  new S3ToSns(stack, 'test-s3-sns', {});

  expect(stack).toHaveResource("Custom::S3BucketNotifications", {
    NotificationConfiguration: {
      TopicConfigurations: [
        {
          Events: ['s3:ObjectCreated:*'],
          TopicArn: {
            Ref: "tests3snsSnsTopicF02F6BD0"
          }
        }
      ]
    }
  });
});

test('construct uses existingBucketObj property', () => {
  const stack = new Stack();
  const [ existingBucketObj ] = defaults.buildS3Bucket(stack, {
    bucketProps: {
      bucketName: 'existing-bucket-name'
    }
  });
  new S3ToSns(stack, 'test-s3-sns', {
    existingBucketObj
  });

  expect(stack).toHaveResourceLike("AWS::S3::Bucket", {
    BucketName: 'existing-bucket-name'
  });
});

test('construct uses existing topic and key', () => {
  const stack = new Stack();
  const cmk = defaults.buildEncryptionKey(stack, {
    description: 'existing-key-description'
  });
  const [ existingTopicObj ] = defaults.buildTopic(stack, {
    encryptionKey: cmk,
    topicProps: {
      topicName: 'existing-topic-name'
    }
  });

  new S3ToSns(stack, 'test-s3-sns', {
    existingTopicObj,
    existingTopicEncryptionKey: cmk
  });

  expect(stack).toHaveResourceLike("AWS::SNS::Topic", {
    TopicName: 'existing-topic-name'
  });

  expect(stack).toHaveResourceLike("AWS::KMS::Key", {
    Description: 'existing-key-description'
  });

  // Make sure the construct did not create any other topics or keys created
  expect(stack).toCountResources('AWS::KMS::Key', 1);
  expect(stack).toCountResources('AWS::SNS::Topic', 1);
});

test('construct uses specific event types and filters', () => {
  const stack = new Stack();
  new S3ToSns(stack, 'test-s3-sns', {
    s3EventTypes: [ s3.EventType.OBJECT_REMOVED ],
    s3EventFilters: [
      {
        prefix: 'the/place',
        suffix: '*.mp3'
      }
    ]
  });

  expect(stack).toHaveResource("Custom::S3BucketNotifications", {
    NotificationConfiguration: {
      TopicConfigurations: [
        {
          Events: [
            's3:ObjectRemoved:*'
          ],
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
          TopicArn: {
            Ref: "tests3snsSnsTopicF02F6BD0"
          }
        }
      ]
    }
  });
});

test('Topic is encrypted with imported CMK when set on encryptionKey prop', () => {
  const stack = new Stack();
  const cmk = defaults.buildEncryptionKey(stack, {
    description: 'existing-key-description'
  });
  new S3ToSns(stack, 'test-s3-sns', {
    encryptionKey: cmk
  });

  expectKmsKeyAttachedToCorrectResource(stack, 'AWS::SNS::Topic', 'existing-key-description');
});

test('Topic is encrypted with provided encryptionKeyProps', () => {
  const stack = new Stack();
  new S3ToSns(stack, 'test-s3-sns', {
    encryptionKeyProps: {
      description: 'existing-key-description'
    }
  });

  expectKmsKeyAttachedToCorrectResource(stack, 'AWS::SNS::Topic', 'existing-key-description');
});

test('Topic is encrypted with imported CMK when set on topicProps.masterKey prop', () => {
  const stack = new Stack();
  const cmk = defaults.buildEncryptionKey(stack, {
    description: 'existing-key-description'
  });
  new S3ToSns(stack, 'test-s3-sns', {
    topicProps: {
      masterKey: cmk
    }
  });

  expectKmsKeyAttachedToCorrectResource(stack, 'AWS::SNS::Topic', 'existing-key-description');
});

test('Topic is encrypted by default with Customer-managed KMS key when no other encryption properties are set', () => {
  const stack = new Stack();
  new S3ToSns(stack, 'test-s3-sns', {
  });

  expect(stack).toHaveResource("AWS::SNS::Topic", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "tests3snsEncryptionKey6C553584",
        "Arn"
      ]
    }
  });

  expect(stack).toCountResources('AWS::KMS::Key', 1);
  expect(stack).toCountResources('AWS::SNS::Topic', 1);
});

test('Topic is encrypted with SQS-managed KMS Key when enable encryption flag is false', () => {
  const stack = new Stack();
  new S3ToSns(stack, 'test-s3-sns', {
    enableEncryptionWithCustomerManagedKey: false
  });

  expect(stack).toHaveResource("AWS::SNS::Topic", {
    KmsMasterKeyId: {
      "Fn::Join": [
        "",
        [
          "arn:",
          {
            Ref: "AWS::Partition"
          },
          ":kms:",
          {
            Ref: "AWS::Region"
          },
          ":",
          {
            Ref: "AWS::AccountId"
          },
          ":alias/aws/sns"
        ]
      ]
    }
  });

  expect(stack).toCountResources('AWS::KMS::Key', 0);
  expect(stack).toCountResources('AWS::SNS::Topic', 1);
});

test('Construct does not override unencrypted topic when passed in existingTopicObj prop', () => {
  const stack = new Stack();

  const existingTopicObj = new sns.Topic(stack, 'Topic', {
    topicName: 'existing-topic-name'
  });

  new S3ToSns(stack, 'test-s3-sns', {
    existingTopicObj
  });

  expect(stack).toCountResources('AWS::KMS::Key', 0);
  expect(stack).toCountResources('AWS::SNS::Topic', 1);

  expect(stack).toHaveResource("AWS::SNS::Topic", {
    TopicName: 'existing-topic-name'
  });
});