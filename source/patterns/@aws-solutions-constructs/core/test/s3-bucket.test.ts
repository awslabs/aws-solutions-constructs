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

import { Duration, Stack } from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as kms from '@aws-cdk/aws-kms';
import * as defaults from '../index';
import { overrideProps } from '../lib/utils';
import '@aws-cdk/assert/jest';

test('test s3Bucket override versioningConfiguration', () => {
  const stack = new Stack();
  const defaultProps: s3.BucketProps = defaults.DefaultS3Props();

  const inProps: s3.BucketProps = {
    versioned: false
  };

  const outProps = overrideProps(defaultProps, inProps);
  new s3.Bucket(stack, 'test-s3-verioning', outProps);

  expect(stack).toHaveResource("AWS::S3::Bucket", {
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [
        {
          ServerSideEncryptionByDefault: {
            SSEAlgorithm: "AES256"
          }
        }
      ]
    },
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true
    }
  });
});

test('test s3Bucket override bucketEncryption', () => {
  const stack = new Stack();
  const defaultProps: s3.BucketProps = defaults.DefaultS3Props();

  const inProps: s3.BucketProps = {
    encryption: s3.BucketEncryption.KMS,
    encryptionKey: new kms.Key(stack, 'mykeyid')
  };

  const outProps = overrideProps(defaultProps, inProps);
  new s3.Bucket(stack, 'test-s3-encryption', outProps);

  expect(stack).toHaveResource("AWS::S3::Bucket", {
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [
        {
          ServerSideEncryptionByDefault: {
            KMSMasterKeyID: {
              "Fn::GetAtt": [
                "mykeyidFA4203B0",
                "Arn"
              ]
            },
            SSEAlgorithm: "aws:kms"
          }
        }
      ]
    },
  });
});

test('test s3Bucket override publicAccessBlockConfiguration', () => {
  const stack = new Stack();
  const defaultProps: s3.BucketProps = defaults.DefaultS3Props();

  const inProps: s3.BucketProps = {
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS
  };

  const outProps = overrideProps(defaultProps, inProps);
  new s3.Bucket(stack, 'test-s3-publicAccessBlock', outProps);

  expect(stack).toHaveResource("AWS::S3::Bucket", {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      IgnorePublicAcls: true
    },
  });
});

test('test s3Bucket add lifecycleConfiguration', () => {
  const stack = new Stack();
  const defaultProps: s3.BucketProps = defaults.DefaultS3Props();

  const inProps: s3.BucketProps = {
    lifecycleRules: [{
      expiration: Duration.days(365)
    }]
  };

  const outProps = overrideProps(defaultProps, inProps);
  new s3.Bucket(stack, 'test-s3-lifecycle', outProps);

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

test('test s3Bucket override serverAccessLogsBucket', () => {
  const stack = new Stack();

  const myLoggingBucket: s3.Bucket = new s3.Bucket(stack, 'MyS3LoggingBucket', defaults.DefaultS3Props());

  const myS3Props: s3.BucketProps = defaults.DefaultS3Props(myLoggingBucket);

  defaults.buildS3Bucket(stack, {
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

test('test createAlbLoggingBucket()', () => {
  const stack = new Stack();

  defaults.createAlbLoggingBucket(stack, 'test-bucket', {
    bucketName: 'test-name'
  });

  expect(stack).toHaveResource("AWS::S3::Bucket", {
    BucketName: 'test-name'
  });
});

test('Test bucket policy that only accepts SSL requests only', () => {
  const stack = new Stack();

  defaults.buildS3Bucket(stack, {
    bucketProps: {
      enforceSSL: true
    }
  }, 'test-bucket');

  expect(stack).toHaveResource("AWS::S3::BucketPolicy", {
    PolicyDocument: {
      Statement: [
        {
          Action: "s3:*",
          Condition: {
            Bool: {
              "aws:SecureTransport": "false"
            }
          },
          Effect: "Deny",
          Principal: {
            AWS: "*"
          },
          Resource: [
            {
              "Fn::GetAtt": [
                "testbucketS3Bucket87F6BFFC",
                "Arn"
              ]
            },
            {
              "Fn::Join": [
                "",
                [
                  {
                    "Fn::GetAtt": [
                      "testbucketS3Bucket87F6BFFC",
                      "Arn"
                    ]
                  },
                  "/*"
                ]
              ]
            }
          ]
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test('Test bucket policy that accepts any requests', () => {
  const stack = new Stack();

  defaults.buildS3Bucket(stack, {
    bucketProps: {
      enforceSSL: false
    }
  }, 'test-bucket');

  expect(stack).not.toHaveResource("AWS::S3::BucketPolicy", {
    PolicyDocument: {
      Statement: [
        {
          Action: "s3:*",
          Condition: {
            Bool: {
              "aws:SecureTransport": "false"
            }
          },
          Effect: "Deny",
          Principal: {
            AWS: "*"
          },
          Resource: [
            {
              "Fn::GetAtt": [
                "testbucketS3Bucket87F6BFFC",
                "Arn"
              ]
            },
            {
              "Fn::Join": [
                "",
                [
                  {
                    "Fn::GetAtt": [
                      "testbucketS3Bucket87F6BFFC",
                      "Arn"
                    ]
                  },
                  "/*"
                ]
              ]
            }
          ]
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test('Test enforcing SSL when bucketProps is not provided', () => {
  const stack = new Stack();

  defaults.buildS3Bucket(stack, {}, 'test-bucket');

  expect(stack).toHaveResource("AWS::S3::BucketPolicy", {
    PolicyDocument: {
      Statement: [
        {
          Action: "s3:*",
          Condition: {
            Bool: {
              "aws:SecureTransport": "false"
            }
          },
          Effect: "Deny",
          Principal: {
            AWS: "*"
          },
          Resource: [
            {
              "Fn::GetAtt": [
                "testbucketS3Bucket87F6BFFC",
                "Arn"
              ]
            },
            {
              "Fn::Join": [
                "",
                [
                  {
                    "Fn::GetAtt": [
                      "testbucketS3Bucket87F6BFFC",
                      "Arn"
                    ]
                  },
                  "/*"
                ]
              ]
            }
          ]
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test('Test enforcing SSL when bucketProps is provided and enforceSSL is not set', () => {
  const stack = new Stack();

  defaults.buildS3Bucket(stack, {
    bucketProps: {
      versioned: false,
      publicReadAccess: false
    }
  }, 'test-bucket');

  expect(stack).toHaveResource("AWS::S3::BucketPolicy", {
    PolicyDocument: {
      Statement: [
        {
          Action: "s3:*",
          Condition: {
            Bool: {
              "aws:SecureTransport": "false"
            }
          },
          Effect: "Deny",
          Principal: {
            AWS: "*"
          },
          Resource: [
            {
              "Fn::GetAtt": [
                "testbucketS3Bucket87F6BFFC",
                "Arn"
              ]
            },
            {
              "Fn::Join": [
                "",
                [
                  {
                    "Fn::GetAtt": [
                      "testbucketS3Bucket87F6BFFC",
                      "Arn"
                    ]
                  },
                  "/*"
                ]
              ]
            }
          ]
        }
      ],
      Version: "2012-10-17"
    }
  });
});