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

import { KinesisFirehoseToS3, KinesisFirehoseToS3Props } from "../lib";
import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import '@aws-cdk/assert/jest';
import { CreateScrapBucket } from '@aws-solutions-constructs/core';

function deploy(stack: cdk.Stack, props: KinesisFirehoseToS3Props = {}) {
  return new KinesisFirehoseToS3(stack, 'test-firehose-s3', props);
}

test('check s3Bucket default encryption', () => {
  const stack = new cdk.Stack();
  deploy(stack);
  expect(stack).toHaveResource('AWS::S3::Bucket', {
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [{
        ServerSideEncryptionByDefault : {
          SSEAlgorithm: "AES256"
        }
      }]
    }
  });
});

test('check s3Bucket public access block configuration', () => {
  const stack = new cdk.Stack();
  deploy(stack);
  expect(stack).toHaveResource('AWS::S3::Bucket', {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true
    }
  });
});

test('test s3Bucket override publicAccessBlockConfiguration', () => {
  const stack = new cdk.Stack();

  deploy(stack, {
    bucketProps: {
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: true,
        ignorePublicAcls: false,
        restrictPublicBuckets: true
      }
    }
  });

  expect(stack).toHaveResource("AWS::S3::Bucket", {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: false,
      BlockPublicPolicy: true,
      IgnorePublicAcls: false,
      RestrictPublicBuckets: true
    },
  });
});

test('test kinesisFirehose override ', () => {
  const stack = new cdk.Stack();

  deploy(stack, {
    kinesisFirehoseProps: {
      extendedS3DestinationConfiguration: {
        bufferingHints: {
          intervalInSeconds: 600,
          sizeInMBs: 55
        },
      }
    }
  });

  expect(stack).toHaveResourceLike("AWS::KinesisFirehose::DeliveryStream", {
    ExtendedS3DestinationConfiguration: {
      BufferingHints: {
        IntervalInSeconds: 600,
        SizeInMBs: 55
      }
    }});
});

test('check default properties', () => {
  const stack = new cdk.Stack();
  const construct: KinesisFirehoseToS3 = deploy(stack);

  expect(construct.kinesisFirehose).not.toEqual(undefined);
  expect(construct.kinesisFirehoseRole).not.toEqual(undefined);
  expect(construct.kinesisFirehoseLogGroup).not.toEqual(undefined);
  expect(construct.s3Bucket).not.toEqual(undefined);
  expect(construct.s3LoggingBucket).not.toEqual(undefined);
});

test('check properties with existing S3 bucket', () => {
  const stack = new cdk.Stack();
  const existingBucket = CreateScrapBucket(stack, {});
  const mybucket: s3.IBucket = s3.Bucket.fromBucketName(stack, 'mybucket', existingBucket.bucketName);
  const construct: KinesisFirehoseToS3 = deploy(stack, {
    existingBucketObj: mybucket
  });

  expect(construct.kinesisFirehose).not.toEqual(undefined);
  expect(construct.kinesisFirehoseRole).not.toEqual(undefined);
  expect(construct.kinesisFirehoseLogGroup).not.toEqual(undefined);
  expect(construct.s3Bucket).toEqual(undefined);
  expect(construct.s3LoggingBucket).toEqual(undefined);
});

test('check properties with existing logging S3 bucket', () => {
  const stack = new cdk.Stack();
  const existingBucket = CreateScrapBucket(stack, {});
  const myLoggingBucket: s3.IBucket = s3.Bucket.fromBucketName(stack, 'myLoggingBucket', existingBucket.bucketName);
  const construct: KinesisFirehoseToS3 = deploy(stack, {
    existingLoggingBucketObj: myLoggingBucket
  });

  expect(construct.kinesisFirehose).not.toEqual(undefined);
  expect(construct.kinesisFirehoseRole).not.toEqual(undefined);
  expect(construct.kinesisFirehoseLogGroup).not.toEqual(undefined);
  expect(construct.s3Bucket).not.toEqual(undefined);
  expect(construct.s3LoggingBucket).toEqual(undefined);
});

test('check properties with existing logging S3 bucket and S3 bucket props', () => {
  const stack = new cdk.Stack();
  const existingBucket = CreateScrapBucket(stack, {});
  const myLoggingBucket: s3.IBucket = s3.Bucket.fromBucketName(stack, 'myLoggingBucket', existingBucket.bucketName);
  const construct: KinesisFirehoseToS3 = deploy(stack, {
    bucketProps: {
      serverAccessLogsPrefix: 'prefix/'
    },
    existingLoggingBucketObj: myLoggingBucket
  });

  expect(construct.kinesisFirehose).not.toEqual(undefined);
  expect(construct.kinesisFirehoseRole).not.toEqual(undefined);
  expect(construct.kinesisFirehoseLogGroup).not.toEqual(undefined);
  expect(construct.s3Bucket).not.toEqual(undefined);
  expect(construct.s3LoggingBucket).toEqual(undefined);
});

test('check for SSE encryption for Direct put', () => {
  const stack = new cdk.Stack();

  new KinesisFirehoseToS3(stack, 'test-firehose-s3', {
    kinesisFirehoseProps: {
      deliveryStreamType: 'direct-put'
    }
  });

  expect(stack).toHaveResource("AWS::KinesisFirehose::DeliveryStream", {
    DeliveryStreamEncryptionConfigurationInput: {
      KeyType: "AWS_OWNED_CMK"
    },
  });
});

test('check for no SSE encryption for KinesisFirehoseToS3', () => {
  const stack = new cdk.Stack();

  new KinesisFirehoseToS3(stack, 'test-firehose-s3', {
    kinesisFirehoseProps: {
      deliveryStreamType: 'KinesisStreamAsSource'
    }
  });

  expect(stack).not.toHaveResource("AWS::KinesisFirehose::DeliveryStream", {
    DeliveryStreamEncryptionConfigurationInput: {
      KeyType: "AWS_OWNED_CMK"
    },
  });
});

// --------------------------------------------------------------
// Test bad call with existingBucket and bucketProps
// --------------------------------------------------------------
test("Test bad call with existingBucket and bucketProps", () => {
  // Stack
  const stack = new cdk.Stack();

  const testBucket = new s3.Bucket(stack, 'test-bucket', {});

  const app = () => {
    // Helper declaration
    new KinesisFirehoseToS3(stack, "bad-s3-args", {
      existingBucketObj: testBucket,
      bucketProps: {
        removalPolicy: cdk.RemovalPolicy.DESTROY
      },
    });
  };
  // Assertion
  expect(app).toThrowError();
});