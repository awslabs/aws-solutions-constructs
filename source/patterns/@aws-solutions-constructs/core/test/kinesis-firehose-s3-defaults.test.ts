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

import { Stack } from 'aws-cdk-lib';
import * as kinesisfirehose from 'aws-cdk-lib/aws-kinesisfirehose';
import * as defaults from '../index';
import { overrideProps } from '../lib/utils';
import { Template } from 'aws-cdk-lib/assertions';
import * as kms from 'aws-cdk-lib/aws-kms';

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

  Template.fromStack(stack).hasResourceProperties("AWS::KinesisFirehose::DeliveryStream", {
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
