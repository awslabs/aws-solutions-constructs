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

import { SynthUtils } from '@aws-cdk/assert';
import { Stack } from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as defaults from '../index';
import { overrideProps } from '../lib/utils';
import '@aws-cdk/assert/jest';

test('s3 bucket with default params', () => {
  const stack = new Stack();
  new s3.Bucket(stack, 'test-s3-defaults', defaults.DefaultS3Props());
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('test s3Bucket override versioningConfiguration', () => {
  const stack = new Stack();
  const defaultProps: s3.CfnBucketProps = defaults.DefaultS3Props();

  const inProps: s3.CfnBucketProps = {
    versioningConfiguration: {
      status: 'Disabled'
    },
  };

  const outProps = overrideProps(defaultProps, inProps);
  new s3.CfnBucket(stack, 'test-s3-verioning', outProps);

  expect(stack).toHaveResource("AWS::S3::Bucket", {
    VersioningConfiguration: {
      Status: 'Disabled'
    }
  });
});

test('test s3Bucket override bucketEncryption', () => {
  const stack = new Stack();
  const defaultProps: s3.CfnBucketProps = defaults.DefaultS3Props();

  const inProps: s3.CfnBucketProps = {
    bucketEncryption: {
      serverSideEncryptionConfiguration : [{
          serverSideEncryptionByDefault: {
              kmsMasterKeyId: 'mykeyid',
              sseAlgorithm: 'aws:kms'
          }
      }]
    },
  };

  const outProps = overrideProps(defaultProps, inProps);
  new s3.CfnBucket(stack, 'test-s3-encryption', outProps);

  expect(stack).toHaveResource("AWS::S3::Bucket", {
    BucketEncryption: {
      ServerSideEncryptionConfiguration : [{
          ServerSideEncryptionByDefault: {
            KMSMasterKeyID: 'mykeyid',
            SSEAlgorithm: 'aws:kms'
          }
      }]
    },
  });
});

test('test s3Bucket override publicAccessBlockConfiguration', () => {
  const stack = new Stack();
  const defaultProps: s3.CfnBucketProps = defaults.DefaultS3Props();

  const inProps: s3.CfnBucketProps = {
    publicAccessBlockConfiguration: {
      blockPublicAcls: false,
      blockPublicPolicy: true,
      ignorePublicAcls: false,
      restrictPublicBuckets: true
    },
  };

  const outProps = overrideProps(defaultProps, inProps);
  new s3.CfnBucket(stack, 'test-s3-publicAccessBlock', outProps);

  expect(stack).toHaveResource("AWS::S3::Bucket", {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: false,
      BlockPublicPolicy: true,
      IgnorePublicAcls: false,
      RestrictPublicBuckets: true
    },
  });
});

test('test s3Bucket add lifecycleConfiguration', () => {
  const stack = new Stack();
  const defaultProps: s3.CfnBucketProps = defaults.DefaultS3Props();

  const inProps: s3.CfnBucketProps = {
    lifecycleConfiguration: {
      rules: [
        {
          status: 'Enabled',
          expirationInDays: 365,
        }
      ]
    }
  };

  const outProps = overrideProps(defaultProps, inProps);
  new s3.CfnBucket(stack, 'test-s3-lifecycle', outProps);

  expect(stack).toHaveResource("AWS::S3::Bucket", {
    LifecycleConfiguration: {
      Rules: [
        {
          Status: 'Enabled',
          ExpirationInDays: 365,
        }
      ]
    }
  });
});

test('test s3Bucket add objectLock', () => {
  const stack = new Stack();
  const defaultProps: s3.CfnBucketProps = defaults.DefaultS3Props();

  const inProps: s3.CfnBucketProps = {
    objectLockConfiguration: {
      objectLockEnabled: 'Enabled',
      rule: {
        defaultRetention: {
          days: 365
        }
      }
    },
    objectLockEnabled: true,
  };

  const outProps = overrideProps(defaultProps, inProps);
  new s3.CfnBucket(stack, 'test-s3-objlock', outProps);

  expect(stack).toHaveResource("AWS::S3::Bucket", {
    ObjectLockConfiguration: {
      ObjectLockEnabled: 'Enabled',
      Rule: {
        DefaultRetention: {
          Days: 365
        }
      }
    },
    ObjectLockEnabled: true
  });
});

test('test s3Bucket override serverAccessLogsBucket', () => {
  const stack = new Stack();

  const myLoggingBucket: s3.Bucket = new s3.Bucket(stack, 'MyS3LoggingBucket', defaults.DefaultS3Props());

  const myS3Props: s3.BucketProps = defaults.DefaultS3Props(myLoggingBucket);

  defaults.buildS3Bucket(stack, {
    deployBucket: true,
    bucketProps: myS3Props
  });

  expect(stack).toHaveResource("AWS::S3::Bucket", {
    LoggingConfiguration: {
      DestinationBucketName: {
        Ref: "MyS3LoggingBucket119BE896"
      }
    }
  });
});