/**
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import { SynthUtils, expect as expectCDK, haveResource } from '@aws-cdk/assert';
import { Stack } from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as defaults from '../index';
import '@aws-cdk/assert/jest';
import { Bucket } from '@aws-cdk/aws-s3';

test('s3 bucket with default params', () => {
  const stack = new Stack();
  defaults.buildS3Bucket(stack, {});
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('s3 bucket with default params and bucket names', () => {
  const stack = new Stack();
  const s3BucketProps: s3.BucketProps = {
      bucketName: 'my-bucket'
  };
  defaults.buildS3Bucket(stack, {
    bucketProps: s3BucketProps
  });
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('s3 bucket with existingBucketObj', () => {
  const stack = new Stack();

  defaults.buildS3Bucket(stack, {
    existingBucketObj: new s3.Bucket(stack, 'my-bucket', {})
  });
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('check exception for Missing existingBucketObj from props for deploy = false', () => {
  const stack = new Stack();

  try {
    defaults.buildS3Bucket(stack, {});
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
  }
});

test('s3 bucket with bucketId', () => {
  const stack = new Stack();

  defaults.buildS3Bucket(stack, {}, 'my');

  expectCDK(stack).to(haveResource("AWS::S3::Bucket", {
    LoggingConfiguration: {
      DestinationBucketName: {
        Ref: "myS3LoggingBucketDE461344"
      }
    },
  }));
});

test('s3 bucket with bucketProps', () => {
  const stack = new Stack();

  defaults.buildS3Bucket(stack, {
    bucketProps: {
      bucketName: 'mybucket'
    }
  });

  expectCDK(stack).to(haveResource("AWS::S3::Bucket", {
    BucketName: "mybucket"
  }));
});

test('s3 bucket with existingBucketObj with access logging configured', () => {
    const stack = new Stack();
    const mybucket = new Bucket(stack, 'mybucket', {
      serverAccessLogsBucket: new Bucket(stack, 'myaccesslogbucket', {})
    });

    defaults.buildS3Bucket(stack, {
      bucketProps: {
        serverAccessLogsBucket: mybucket
      }
    });

    expectCDK(stack).to(haveResource("AWS::S3::Bucket", {
      LoggingConfiguration: {
        DestinationBucketName: {
          Ref: "mybucket160F8132"
        }
      },
    }));
});