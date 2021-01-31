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
import { Stack } from '@aws-cdk/core';
import * as kinesisfirehose from '@aws-cdk/aws-kinesisfirehose';
import * as defaults from '../index';
import { overrideProps } from '../lib/utils';
import '@aws-cdk/assert/jest';
import * as kms from '@aws-cdk/aws-kms';

test('snapshot test kinesisfirehose default params', () => {
  const stack = new Stack();

  const awsManagedKey: kms.IKey = kms.Alias.fromAliasName(stack, 'aws-managed-key', 'alias/aws/s3');

  new kinesisfirehose.CfnDeliveryStream(stack, 'KinesisFirehose',
    defaults.DefaultCfnDeliveryStreamProps('bucket_arn', 'role_arn', 'log_group', 'log_stream', awsManagedKey));
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('test kinesisanalytics override buffer conditions', () => {
  const stack = new Stack();

  const inProps = {
    extendedS3DestinationConfiguration: {
      bufferingHints: {
        intervalInSeconds: 600,
        sizeInMBs: 10
      },
    }
  };
  const awsManagedKey: kms.IKey = kms.Alias.fromAliasName(stack, 'aws-managed-key', 'alias/aws/s3');

  const defaultProps = defaults.DefaultCfnDeliveryStreamProps('bucket_arn', 'role_arn', 'log_group', 'log_stream', awsManagedKey);

  const outProps = overrideProps(defaultProps, inProps);

  new kinesisfirehose.CfnDeliveryStream(stack, 'KinesisFirehose', outProps);

  expect(stack).toHaveResource("AWS::KinesisFirehose::DeliveryStream", {
    ExtendedS3DestinationConfiguration: {
      BucketARN: "bucket_arn",
      BufferingHints: {
        IntervalInSeconds: 600,
        SizeInMBs: 10
      },
      CloudWatchLoggingOptions: {
        Enabled: true,
        LogGroupName: "log_group",
        LogStreamName: "log_stream"
      },
      CompressionFormat: "GZIP",
      EncryptionConfiguration: {
        KMSEncryptionConfig: {
          AWSKMSKeyARN: {
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
                ":alias/aws/s3"
              ]
            ]
          }
        }
      },
      RoleARN: "role_arn"
    }
  });
});
