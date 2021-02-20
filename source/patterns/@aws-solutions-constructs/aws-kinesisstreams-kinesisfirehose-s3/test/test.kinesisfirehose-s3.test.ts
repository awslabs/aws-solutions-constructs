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

import '@aws-cdk/assert/jest';
import { SynthUtils } from '@aws-cdk/assert';
import { Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import { Bucket, IBucket } from '@aws-cdk/aws-s3';
import { Stack } from '@aws-cdk/core';
import { buildKinesisStream } from '@aws-solutions-constructs/core';
import { KinesisStreamsToKinesisFirehoseToS3, KinesisStreamsToKinesisFirehoseToS3Props } from '../lib';

function deploy(stack: Stack, props: KinesisStreamsToKinesisFirehoseToS3Props = {}) {
  return new KinesisStreamsToKinesisFirehoseToS3(stack, 'test-stream-firehose-s3', props);
}

test('snapshot test KinesisStreamsToKinesisFirehoseToS3 default params', () => {
  const stack = new Stack();
  deploy(stack);
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('test kinesisFirehose override ', () => {
  const stack = new Stack();
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

test('test kinesisFirehose.deliveryStreamType override ', () => {
  const stack = new Stack();
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
  const stack = new Stack();

  const kinesisStream = buildKinesisStream(stack, {
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
  const stack = new Stack();

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
  const stack = new Stack();
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
  const stack = new Stack();
  const construct: KinesisStreamsToKinesisFirehoseToS3  = deploy(stack, {
    createCloudWatchAlarms: false
  });

  expect(construct.cloudwatchAlarms).toEqual(undefined);
});

test('Test properties with existing S3 bucket', () => {
  const stack = new Stack();
  const mybucket: IBucket = Bucket.fromBucketName(stack, 'mybucket', 'mybucket');
  const construct: KinesisStreamsToKinesisFirehoseToS3 = deploy(stack, {
    existingBucketObj: mybucket
  });

  expect(construct.s3Bucket).toEqual(undefined);
  expect(construct.s3LoggingBucket).toEqual(undefined);
});

test('Test properties with existing logging S3 bucket', () => {
  const stack = new Stack();
  const myLoggingBucket: IBucket = Bucket.fromBucketName(stack, 'myLoggingBucket', 'myLoggingBucket');
  const construct: KinesisStreamsToKinesisFirehoseToS3  = deploy(stack, {
    existingLoggingBucketObj: myLoggingBucket
  });

  expect(construct.s3Bucket).not.toEqual(undefined);
  expect(construct.s3LoggingBucket).toEqual(undefined);
});