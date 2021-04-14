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

import { SynthUtils } from '@aws-cdk/assert';
import { KinesisStreamsToKinesisFirehoseToS3, KinesisStreamsToKinesisFirehoseToS3Props } from '../lib';
import * as cdk from '@aws-cdk/core';
import '@aws-cdk/assert/jest';
import * as defaults from '@aws-solutions-constructs/core';
import { Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';

function deploy(stack: cdk.Stack, props: KinesisStreamsToKinesisFirehoseToS3Props = {}) {
  return new KinesisStreamsToKinesisFirehoseToS3(stack, 'test-stream-firehose-s3', props);
}

test('snapshot test KinesisStreamsToKinesisFirehoseToS3 default params', () => {
  const stack = new cdk.Stack();
  deploy(stack);
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
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
    },
    bucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
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

test('test kinesisFirehose.deliveryStreamType override ', () => {
  const stack = new cdk.Stack();
  deploy(stack, {
    kinesisFirehoseProps: {
      deliveryStreamType: 'DirectPut'
    }
  });

  expect(stack).toHaveResourceLike("AWS::KinesisFirehose::DeliveryStream", {
    DeliveryStreamType: 'KinesisStreamAsSource'
  });
});

test('test kinesisFirehose.kinesisStreamSourceConfiguration override ', () => {
  const stack = new cdk.Stack();

  const kinesisStream = defaults.buildKinesisStream(stack, {
    existingStreamObj: undefined,
    kinesisStreamProps: undefined
  });

  deploy(stack, {
    kinesisFirehoseProps: {
      kinesisStreamSourceConfiguration: {
        kinesisStreamArn: kinesisStream.streamArn,
        roleArn: new Role(stack, 'myRole', {
          assumedBy: new ServicePrincipal('firehose.amazonaws.com')
        }).roleArn
      }
    }
  });

  expect(stack).toHaveResourceLike("AWS::KinesisFirehose::DeliveryStream", {
    KinesisStreamSourceConfiguration: {
      KinesisStreamARN: {
        "Fn::GetAtt": [
          "teststreamfirehoses3KinesisStream3165E68E",
          "Arn"
        ]
      },
      RoleARN: {
        "Fn::GetAtt": [
          "KinesisStreamsRole2BFD39A5",
          "Arn"
        ]
      }
    }
  });
});

test('test kinesisStreamProps override ', () => {
  const stack = new cdk.Stack();

  deploy(stack, {
    kinesisStreamProps: {
      shardCount: 3
    }
  });

  expect(stack).toHaveResourceLike("AWS::Kinesis::Stream", {
    ShardCount: 3
  });
});

test('Test All properties', () => {
  const stack = new cdk.Stack();
  const construct: KinesisStreamsToKinesisFirehoseToS3 = deploy(stack);

  expect(construct.cloudwatchAlarms).not.toEqual(undefined);
  expect(construct.kinesisFirehose).not.toEqual(undefined);
  expect(construct.kinesisFirehoseRole).not.toEqual(undefined);
  expect(construct.kinesisFirehoseLogGroup).not.toEqual(undefined);
  expect(construct.kinesisStream).not.toEqual(undefined);
  expect(construct.kinesisStreamRole).not.toEqual(undefined);
  expect(construct.s3Bucket).not.toEqual(undefined);
  expect(construct.s3LoggingBucket).not.toEqual(undefined);
});

test('Test properties with no CW Alarms', () => {
  const stack = new cdk.Stack();
  const construct: KinesisStreamsToKinesisFirehoseToS3  = deploy(stack, {
    createCloudWatchAlarms: false
  });

  expect(construct.cloudwatchAlarms).toEqual(undefined);
});

test('Test properties with existing S3 bucket', () => {
  const stack = new cdk.Stack();
  const existingBucket = defaults.CreateScrapBucket(stack, {});
  const mybucket: s3.IBucket = s3.Bucket.fromBucketName(stack, 'mybucket', existingBucket.bucketName);
  const construct: KinesisStreamsToKinesisFirehoseToS3 = deploy(stack, {
    existingBucketObj: mybucket
  });

  expect(construct.s3Bucket).toEqual(undefined);
  expect(construct.s3LoggingBucket).toEqual(undefined);
});

test('Test properties with existing logging S3 bucket', () => {
  const stack = new cdk.Stack();
  const existingBucket = defaults.CreateScrapBucket(stack, {});
  const myLoggingBucket: s3.IBucket = s3.Bucket.fromBucketName(stack, 'myLoggingBucket', existingBucket.bucketName);
  const construct: KinesisStreamsToKinesisFirehoseToS3  = deploy(stack, {
    existingLoggingBucketObj: myLoggingBucket
  });

  expect(construct.s3Bucket).not.toEqual(undefined);
  expect(construct.s3LoggingBucket).toEqual(undefined);
});