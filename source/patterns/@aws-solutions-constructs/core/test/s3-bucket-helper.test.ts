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

import { Duration, Stack, RemovalPolicy } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as defaults from '../index';
import { Template } from 'aws-cdk-lib/assertions';
import { Bucket, StorageClass } from 'aws-cdk-lib/aws-s3';
import { expectNonexistence } from "./test-helper";

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

  const buildS3BucketResponse = defaults.buildS3Bucket(stack, {}, 'my');

  expect(buildS3BucketResponse.bucket).toBeDefined();
  expect(buildS3BucketResponse.loggingBucket).toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::S3::Bucket", {
    LoggingConfiguration: {
      DestinationBucketName: {
        Ref: "myS3LoggingBucketDE461344"
      }
    },
  });
});

test('s3 bucket with bucketProps', () => {
  const stack = new Stack();

  const buildS3BucketResponse = defaults.buildS3Bucket(stack, {
    bucketProps: {
      bucketName: 'mybucket'
    }
  });

  expect(buildS3BucketResponse.bucket).toBeDefined();
  expect(buildS3BucketResponse.loggingBucket).toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::S3::Bucket", {
    BucketName: "mybucket"
  });
});

test('s3 bucket with default props', () => {
  const stack = new Stack();

  const buildS3BucketResponse = defaults.buildS3Bucket(stack, {});

  expect(buildS3BucketResponse.bucket).toBeDefined();
  expect(buildS3BucketResponse.loggingBucket).toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::S3::Bucket", {
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
    },
    VersioningConfiguration: {
      Status: "Enabled"
    }
  });
});

test('s3 bucket with life cycle policy', () => {
  const stack = new Stack();

  const buildS3BucketResponse = defaults.buildS3Bucket(stack, {
    bucketProps: {
      lifecycleRules: [{
        expiration: Duration.days(365),
        transitions: [{
          storageClass: StorageClass.INFREQUENT_ACCESS,
          transitionAfter: Duration.days(30)
        }, {
          storageClass: StorageClass.GLACIER,
          transitionAfter: Duration.days(90)
        }]
      }]
    }
  });

  expect(buildS3BucketResponse.bucket).toBeDefined();
  expect(buildS3BucketResponse.loggingBucket).toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::S3::Bucket", {
    LifecycleConfiguration: {
      Rules: [
        {
          ExpirationInDays: 365,
          Status: "Enabled",
          Transitions: [
            {
              StorageClass: "STANDARD_IA",
              TransitionInDays: 30
            },
            {
              StorageClass: "GLACIER",
              TransitionInDays: 90
            }
          ]
        }
      ]
    }
  });
});

test('s3 bucket with access logging configured', () => {
  const stack = new Stack();
  const mybucket = new Bucket(stack, 'mybucket', {
    serverAccessLogsBucket: new Bucket(stack, 'myaccesslogbucket', {})
  });

  const buildS3BucketResponse = defaults.buildS3Bucket(stack, {
    bucketProps: {
      serverAccessLogsBucket: mybucket
    }
  });

  expect(buildS3BucketResponse.bucket).toBeDefined();
  // This value should be populated, entered Issue 907
  // expect(response.loggingBucket).toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::S3::Bucket", {
    LoggingConfiguration: {
      DestinationBucketName: {
        Ref: "mybucket160F8132"
      }
    },
  });
});

test('Check S3 Bucket policy', () => {
  const stack = new Stack();
  defaults.buildS3Bucket(stack, {});

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::S3::BucketPolicy", {
    PolicyDocument: {
      Statement: [
        {
          Action: "s3:*",
          Condition: {
            Bool: {
              "aws:SecureTransport": "false",
            },
          },
          Effect: "Deny",
          Principal: {
            AWS: "*"
          },
          Resource: [
            {
              "Fn::GetAtt": [
                "S3Bucket07682993",
                "Arn"
              ]
            },
            {
              "Fn::Join": [
                "",
                [
                  {
                    "Fn::GetAtt": [
                      "S3Bucket07682993",
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
      Version: "2012-10-17",
    },
  });
});

test('s3 bucket with LoggingBucket and versioning turned off', () => {
  const stack = new Stack();
  const mybucket = new Bucket(stack, 'mybucket', {
    serverAccessLogsBucket: new Bucket(stack, 'myaccesslogbucket', {})
  });

  const buildS3BucketResponse = defaults.buildS3Bucket(stack, {
    bucketProps: {
      serverAccessLogsBucket: mybucket,
      serverAccessLogsPrefix: 'access-logs',
      versioned: false
    }
  });

  expect(buildS3BucketResponse.bucket).toBeDefined();
  // The line below fails, this appears to be a bug. Entered Issue 906
  expect(buildS3BucketResponse.loggingBucket).toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::S3::Bucket", {
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [
        {
          ServerSideEncryptionByDefault: {
            SSEAlgorithm: "AES256"
          }
        }
      ]
    },
    LoggingConfiguration: {
      DestinationBucketName: {
        Ref: "mybucket160F8132"
      },
      LogFilePrefix: "access-logs"
    },
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true
    }
  });
});

test('s3 bucket versioning turned off', () => {
  const stack = new Stack();

  const buildS3BucketResponse = defaults.buildS3Bucket(stack, {
    bucketProps: {
      serverAccessLogsPrefix: 'access-logs',
      versioned: false
    }
  });

  expect(buildS3BucketResponse.bucket).toBeDefined();
  expect(buildS3BucketResponse.loggingBucket).toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::S3::Bucket", {
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [
        {
          ServerSideEncryptionByDefault: {
            SSEAlgorithm: "AES256"
          }
        }
      ]
    },
    LoggingConfiguration: {
      DestinationBucketName: {
        Ref: "S3LoggingBucket800A2B27"
      },
      LogFilePrefix: "access-logs"
    },
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true
    }
  });
});

test('s3 bucket with LoggingBucket and auto delete objects', () => {
  const stack = new Stack();

  const buildS3BucketResponse = defaults.buildS3Bucket(stack, {
    loggingBucketProps: {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    }
  });

  expect(buildS3BucketResponse.bucket).toBeDefined();
  expect(buildS3BucketResponse.loggingBucket).toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::S3::Bucket", {
    AccessControl: "LogDeliveryWrite"
  });

  template.hasResourceProperties("Custom::S3AutoDeleteObjects", {
    ServiceToken: {
      "Fn::GetAtt": [
        "CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F",
        "Arn"
      ]
    },
    BucketName: {
      Ref: "S3LoggingBucket800A2B27"
    }
  });
});

test('s3 bucket versioning turned on', () => {
  const stack = new Stack();

  const buildS3BucketResponse = defaults.buildS3Bucket(stack, {
    bucketProps: {
      serverAccessLogsPrefix: 'access-logs',
    }
  });

  expect(buildS3BucketResponse.bucket).toBeDefined();
  expect(buildS3BucketResponse.loggingBucket).toBeDefined();

  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::S3::Bucket", {
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [
        {
          ServerSideEncryptionByDefault: {
            SSEAlgorithm: "AES256"
          }
        }
      ]
    },
    LifecycleConfiguration: {
      Rules: [
        {
          NoncurrentVersionTransitions: [
            {
              StorageClass: "GLACIER",
              TransitionInDays: 90
            }
          ],
          Status: "Enabled"
        }
      ]
    },
    LoggingConfiguration: {
      DestinationBucketName: {
        Ref: "S3LoggingBucket800A2B27"
      },
      LogFilePrefix: "access-logs"
    },
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true
    },
    VersioningConfiguration: {
      Status: "Enabled"
    }
  });
});

test('Suppress cfn-nag warning for s3 bucket notification', () => {
  const stack = new Stack();
  const buildS3BucketResponse = defaults.buildS3Bucket(stack, {});
  const buildQueueResponse = defaults.buildQueue(stack, "S3BucketNotificationQueue", {});
  buildS3BucketResponse.bucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.SqsDestination(buildQueueResponse.queue));
  defaults.addCfnNagS3BucketNotificationRulesToSuppress(stack, "BucketNotificationsHandler050a0587b7544547bf325f094a3db834");

  const template = Template.fromStack(stack);
  template.hasResource("AWS::Lambda::Function", {
    Metadata: {
      cfn_nag: {
        rules_to_suppress: [
          {
            id: "W58",
            reason: "Lambda functions has the required permission to write CloudWatch Logs. It uses custom policy instead of arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole with tighter permissions."
          },
          {
            id: 'W89',
            reason: `This is not a rule for the general case, just for specific use cases/industries`
          },
          {
            id: 'W92',
            reason: `Impossible for us to define the correct concurrency for clients`
          }
        ]
      }
    }
  });

  template.hasResource("AWS::IAM::Policy", {
    Metadata: {
      cfn_nag: {
        rules_to_suppress: [
          {
            id: "W12",
            reason: "Bucket resource is '*' due to circular dependency with bucket and role creation at the same time"
          }
        ]
      }
    }
  });
});

test('test s3Bucket removalPolicy override', () => {
  const stack = new Stack();

  defaults.buildS3Bucket(stack, {
    bucketProps: {
      removalPolicy: RemovalPolicy.DESTROY,
    },
  }, 'test-bucket');

  Template.fromStack(stack).hasResource("AWS::S3::Bucket", {
    Type: 'AWS::S3::Bucket',
    Properties: {
      AccessControl: "LogDeliveryWrite"
    },
    UpdateReplacePolicy: "Delete",
    DeletionPolicy: "Delete"
  });
});

test('s3 bucket with logging turned off', () => {
  const stack = new Stack();

  const respbuildS3BucketResponsense = defaults.buildS3Bucket(stack, {
    logS3AccessLogs: false,
  });

  expect(respbuildS3BucketResponsense.bucket).toBeDefined();
  expect(respbuildS3BucketResponsense.loggingBucket).not.toBeDefined();

  expectNonexistence(stack, "AWS::S3::Bucket", {
    LoggingConfiguration: {
    }
  });
});

test('Confirm Log Bucket lifecycle rules persist',  () => {
  const stack = new Stack();

  defaults.buildS3Bucket(stack, {
    loggingBucketProps: {
      lifecycleRules: [
        {
          expiration: Duration.days(365),
        }],
    }
  });

  const template = Template.fromStack(stack);
  template.hasResource("AWS::S3::Bucket", {
    Properties: {
      LifecycleConfiguration: {}
    }
  });
});