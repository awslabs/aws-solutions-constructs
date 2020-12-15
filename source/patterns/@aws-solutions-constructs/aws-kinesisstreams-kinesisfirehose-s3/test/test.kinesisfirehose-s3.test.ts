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

import { SynthUtils } from '@aws-cdk/assert';
import { KinesisStreamsToKinesisFirehoseToS3, KinesisStreamsToKinesisFirehoseToS3Props } from '../lib';
import * as cdk from '@aws-cdk/core';
import '@aws-cdk/assert/jest';
import { Stack } from '@aws-cdk/core';
import * as defaults from '@aws-solutions-constructs/core';
import { Role, ServicePrincipal } from '@aws-cdk/aws-iam';

function deploy(stack: cdk.Stack) {
  const props = {} as KinesisStreamsToKinesisFirehoseToS3Props;

  return new KinesisStreamsToKinesisFirehoseToS3(stack, 'test-stream-firehose-s3', props);
}

test('snapshot test KinesisStreamsToKinesisFirehoseToS3 default params', () => {
  const stack = new cdk.Stack();
  deploy(stack);
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('test kinesisFirehose override ', () => {
  const stack = new cdk.Stack();

  new KinesisStreamsToKinesisFirehoseToS3(stack, 'test-stream-firehose-s3', {
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
  const stack = new cdk.Stack();

  new KinesisStreamsToKinesisFirehoseToS3(stack, 'test-stream-firehose-s3', {
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

  new KinesisStreamsToKinesisFirehoseToS3(stack, 'test-stream-firehose-s3', {
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

  new KinesisStreamsToKinesisFirehoseToS3(stack, 'test-stream-firehose-s3', {
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

  expect(construct.kinesisFirehose !== null);
  expect(construct.s3Bucket !== null);
  expect(construct.kinesisFirehoseRole !== null);
  expect(construct.kinesisFirehoseLogGroup !== null);
  expect(construct.s3LoggingBucket !== null);
  expect(construct.kinesisStream !== null);
  expect(construct.cloudwatchAlarms !== null);
});

test('Test properties with no CW Alarms', () => {
  const stack = new Stack();
  const props: KinesisStreamsToKinesisFirehoseToS3Props = {
    createCloudWatchAlarms: false
  };
  const app = new KinesisStreamsToKinesisFirehoseToS3(stack, 'test-stream-firehose-s3', props);

  expect(app.cloudwatchAlarms === null);
});
