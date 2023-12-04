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

import { Duration, Stack } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as defaults from '../index';
import { overrideProps } from '../lib/utils';
import { Template } from 'aws-cdk-lib/assertions';
import { expectNonexistence } from "./test-helper";
import { CreateScrapBucket } from './test-helper';

test('test s3Bucket override versioningConfiguration', () => {
  const stack = new Stack();
  const defaultProps: s3.BucketProps = defaults.DefaultS3Props();

  const inProps: s3.BucketProps = {
    versioned: false
  };

  const outProps = overrideProps(defaultProps, inProps);
  new s3.Bucket(stack, 'test-s3-verioning', outProps);

  Template.fromStack(stack).hasResourceProperties("AWS::S3::Bucket", {
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

  Template.fromStack(stack).hasResourceProperties("AWS::S3::Bucket", {
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

  Template.fromStack(stack).hasResourceProperties("AWS::S3::Bucket", {
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

  Template.fromStack(stack).hasResourceProperties("AWS::S3::Bucket", {
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

  Template.fromStack(stack).hasResourceProperties("AWS::S3::Bucket", {
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

  Template.fromStack(stack).hasResourceProperties("AWS::S3::Bucket", {
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

  Template.fromStack(stack).hasResourceProperties("AWS::S3::BucketPolicy", {
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

  expectNonexistence(stack, "AWS::S3::BucketPolicy", {
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

  Template.fromStack(stack).hasResourceProperties("AWS::S3::BucketPolicy", {
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

  Template.fromStack(stack).hasResourceProperties("AWS::S3::BucketPolicy", {
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

// ---------------------------
// Prop Tests
// ---------------------------
test('Test fail S3 check', () => {
  const stack = new Stack();

  const props: defaults.S3Props = {
    existingBucketObj: CreateScrapBucket(stack, "scrapBucket"),
    bucketProps: {},
  };

  const app = () => {
    defaults.CheckS3Props(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide bucketProps or existingBucketObj, but not both.\n');
});

test('Test fail existing log bucket and log bucket prop check', () => {
  const stack = new Stack();

  const props: defaults.S3Props = {
    existingLoggingBucketObj: new s3.Bucket(stack, 'logging-bucket'),
    loggingBucketProps: {
      autoDeleteObjects: true
    }
  };

  const app = () => {
    defaults.CheckS3Props(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide existingLoggingBucketObj or loggingBucketProps, but not both.\n');
});

test('Test fail false logS3Accesslogs and loggingBucketProps check', () => {
  const stack = new Stack();

  const props: defaults.S3Props = {
    existingLoggingBucketObj: new s3.Bucket(stack, 'logging-bucket'),
    logS3AccessLogs: false
  };

  const app = () => {
    defaults.CheckS3Props(props);
  };

  // Assertion
  expect(app).toThrowError('Error - If logS3AccessLogs is false, supplying loggingBucketProps or existingLoggingBucketObj is invalid.\n');
});

test('Test fail existingBucketObj and loggingBucketProps check', () => {
  const stack = new Stack();

  const props: defaults.S3Props = {
    existingBucketObj: new s3.Bucket(stack, 'temp-bucket'),
    loggingBucketProps: {
      autoDeleteObjects: true
    }
  };

  const app = () => {
    defaults.CheckS3Props(props);
  };

  // Assertion
  expect(app).toThrowError('Error - If existingBucketObj is provided, supplying loggingBucketProps or logS3AccessLogs is an error.\n');
});
