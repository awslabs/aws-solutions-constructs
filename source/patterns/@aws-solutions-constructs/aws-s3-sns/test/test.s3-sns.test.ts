/**
 *  Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import * as kms from 'aws-cdk-lib/aws-kms';
import * as s3 from 'aws-cdk-lib/aws-s3';

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

test('deployment works with existing bucket', () => {
  const stack = new Stack();
  const [ existingBucketObj ] = defaults.buildS3Bucket(stack, {});
  new S3ToSns(stack, 'test-s3-sns', {
    existingBucketObj
  });

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

test('deployment works with existing topic and key', () => {
  const stack = new Stack();
  const cmk = defaults.buildEncryptionKey(stack);
  const [ existingTopicObj ] = defaults.buildTopic(stack, {
    encryptionKey: cmk
  });
  new S3ToSns(stack, 'test-s3-sns', {
    existingTopicObj,
    existingTopicEncryptionKey: cmk
  });

  expect(stack).toHaveResource("Custom::S3BucketNotifications", {
    NotificationConfiguration: {
      TopicConfigurations: [
        {
          Events: ['s3:ObjectCreated:*'],
          TopicArn: {
            Ref: "SnsTopic2C1570A4"
          }
        }
      ]
    }
  });

  expect(stack).toHaveResource("AWS::SNS::Topic", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "EncryptionKey1B843E66",
        "Arn"
      ]
    }
  });
});

test('deployment works with specific evnet types and filters', () => {
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
  new S3ToSns(stack, 'test-s3-sns', {
    encryptionKey: new kms.Key(stack, 'cmk')
  });

  expect(stack).toHaveResource("AWS::SNS::Topic", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "cmk01DE03DA",
        "Arn"
      ]
    }
  });
});

test('Topic is encrypted with provided encryptionKeyProps', () => {
  const stack = new Stack();
  new S3ToSns(stack, 'test-s3-sns', {
    encryptionKeyProps: {
      alias: 'new-key-alias-from-props'
    }
  });

  expect(stack).toHaveResource("AWS::SNS::Topic", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "tests3snsEncryptionKey6C553584",
        "Arn"
      ]
    }
  });

  expect(stack).toHaveResource('AWS::KMS::Alias', {
    AliasName: 'alias/new-key-alias-from-props',
    TargetKeyId: {
      "Fn::GetAtt": [
        "tests3snsEncryptionKey6C553584",
        "Arn"
      ]
    }
  });
});

test('Topic is encrypted with imported CMK when set on topicProps.masterKey prop', () => {
  const stack = new Stack();
  new S3ToSns(stack, 'test-s3-sns', {
    topicProps: {
      masterKey: new kms.Key(stack, 'cmk')
    }
  });

  expect(stack).toHaveResource("AWS::SNS::Topic", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "cmk01DE03DA",
        "Arn"
      ]
    }
  });
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
});