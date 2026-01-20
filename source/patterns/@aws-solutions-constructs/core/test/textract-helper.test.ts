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

import * as defaults from "../index";
import { CreateScrapBucket } from "./test-helper";
import { App, Stack } from "aws-cdk-lib";
import { Match, Template } from 'aws-cdk-lib/assertions';


test('Test deployment with asyncJobs enabled', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const configuration = defaults.ConfigureTextractSupport(stack, 'test', { asyncJobs: true });

  expect(configuration.sourceBucket).toBeDefined();
  expect(configuration.sourceBucket?.bucket).toBeDefined();
  expect(configuration.sourceBucket?.bucketInterface).toBeDefined();
  expect(configuration.sourceBucket?.loggingBucket).toBeDefined();
  expect(configuration.destinationBucket).toBeDefined();
  expect(configuration.destinationBucket?.bucket).toBeDefined();
  expect(configuration.destinationBucket?.bucketInterface).toBeDefined();
  expect(configuration.destinationBucket?.loggingBucket).toBeDefined();
  expect(configuration.textractRole).toBeDefined();
  expect(configuration.snsTopic).toBeDefined();

  expect(configuration.lambdaIamActionsRequired).toEqual(expect.arrayContaining([
    'textract:DetectDocumentText',
    'textract:AnalyzeDocument',
    'textract:AnalyzeExpense',
    'textract:AnalyzeID',
    'texttract:StartDocumentTextDetection',
    'texttract:GetDocumentTextDetection',
    'textract:StartDocumentAnalysis',
    'textract:GetDocumentAnalysis',
    'textract:StartExpenseAnalysis',
    'textract:GetExpenseAnalysis',
    'textract:StartLendingAnalysis',
    'textract:GetLendingAnalysis'
  ]));
  expect(configuration.lambdaIamActionsRequired).toHaveLength(12);

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::S3::Bucket', 4); // 2 main buckets + 2 logging buckets
  template.resourceCountIs('AWS::SNS::Topic', 1); // SNS topic for async job notifications

  // Check textract service permissions
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Effect: 'Allow',
          Action: Match.arrayWith([
            "s3:GetObject*",
            "s3:GetBucket*",
            "s3:List*",
            "s3:DeleteObject*",
            "s3:PutObject",
            "s3:PutObjectLegalHold",
            "s3:PutObjectRetention",
            "s3:PutObjectTagging",
            "s3:PutObjectVersionTagging",
            "s3:Abort*"
          ]),
          Resource: [
            {
              "Fn::GetAtt": [
                Match.stringLikeRegexp("testdestinationbucketS3Bucket*."),
                "Arn"
              ]
            },
            {
              "Fn::Join": [
                "",
                [
                  {
                    "Fn::GetAtt": [
                      Match.stringLikeRegexp("testdestinationbucketS3Bucket*."),
                      "Arn"
                    ]
                  },
                  "/*"
                ]
              ]
            }
          ]
        }),
        Match.objectLike({
          Effect: 'Allow',
          Action: Match.arrayWith([
            "s3:GetObject*",
            "s3:GetBucket*",
            "s3:List*",
          ]),
          Resource: [
            {
              "Fn::GetAtt": [
                Match.stringLikeRegexp("testsourcebucketS3Bucket.*"),
                "Arn"
              ]
            },
            {
              "Fn::Join": [
                "",
                [
                  {
                    "Fn::GetAtt": [
                      Match.stringLikeRegexp("testsourcebucketS3Bucket.*"),
                      "Arn"
                    ]
                  },
                  "/*"
                ]
              ]
            }
          ]
        }),
        Match.objectLike({
          Effect: 'Allow',
          Action: "sns:Publish",
          Resource: {
            Ref: Match.stringLikeRegexp("SnsTopic")
          }
        })
      ])
    },
    Roles: [
      {
        Ref: Match.stringLikeRegexp("testtextractservicerole.*")
      }
    ]
  });

  template.hasResourceProperties("AWS::IAM::Role", {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: "sts:AssumeRole",
          Effect: "Allow",
          Principal: {
            Service: "textract.amazonaws.com"
          }
        }
      ],
      Version: "2012-10-17"
    }
  });

  // Check that there just 1 policy and Role
  template.resourceCountIs("AWS::IAM::Policy", 1);
  template.resourceCountIs("AWS::IAM::Role", 1);
});

test('Test deployment without asyncJobs enabled', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const configuration = defaults.ConfigureTextractSupport(stack, 'test', {});

  expect(configuration.sourceBucket).not.toBeDefined();
  expect(configuration.destinationBucket).not.toBeDefined();
  expect(configuration.textractRole).not.toBeDefined();
  expect(configuration.snsTopic).not.toBeDefined();
  expect(configuration.lambdaIamActionsRequired).toEqual(expect.arrayContaining([
    'textract:DetectDocumentText',
    'textract:AnalyzeDocument',
    'textract:AnalyzeExpense',
    'textract:AnalyzeID'
  ]));
  expect(configuration.lambdaIamActionsRequired).toHaveLength(4);

  const template = Template.fromStack(stack);

  // No SNS notifications for synchronous calls
  template.resourceCountIs('AWS::SNS::Topic', 0);
  template.resourceCountIs('AWS::S3::Bucket', 0);
});

test('Test deployment with useSameBucket', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const configuration = defaults.ConfigureTextractSupport(stack, 'test', { asyncJobs: true, useSameBucket: true });

  expect(configuration.sourceBucket).toBeDefined();
  expect(configuration.sourceBucket?.bucket).toBeDefined();
  expect(configuration.sourceBucket?.bucketInterface).toBeDefined();
  expect(configuration.sourceBucket?.loggingBucket).toBeDefined();
  expect(configuration.destinationBucket).toBeDefined();
  expect(configuration.destinationBucket?.bucket).toBeDefined();
  expect(configuration.destinationBucket?.bucketInterface).toBeDefined();
  expect(configuration.destinationBucket?.loggingBucket).toBeDefined();
  expect(configuration.textractRole).toBeDefined();
  expect(configuration.snsTopic).toBeDefined();

  expect(configuration.lambdaIamActionsRequired).toEqual(expect.arrayContaining([
    'textract:DetectDocumentText',
    'textract:AnalyzeDocument',
    'textract:AnalyzeExpense',
    'textract:AnalyzeID',
    'texttract:StartDocumentTextDetection',
    'texttract:GetDocumentTextDetection',
    'textract:StartDocumentAnalysis',
    'textract:GetDocumentAnalysis',
    'textract:StartExpenseAnalysis',
    'textract:GetExpenseAnalysis',
    'textract:StartLendingAnalysis',
    'textract:GetLendingAnalysis'
  ]));
  expect(configuration.lambdaIamActionsRequired).toHaveLength(12);
  expect(configuration.sourceBucket?.bucket).toBe(configuration.destinationBucket?.bucket);
  expect(configuration.sourceBucket?.bucketInterface).toBe(configuration.destinationBucket?.bucketInterface);
  expect(configuration.sourceBucket?.loggingBucket).toBe(configuration.destinationBucket?.loggingBucket);

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::S3::Bucket', 2); // 1 main bucket + 1 logging bucket
  template.resourceCountIs('AWS::SNS::Topic', 1); // SNS topic for async job notifications

  // Check textract service permissions
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Effect: 'Allow',
          Action: Match.arrayWith([
            "s3:GetObject*",
            "s3:GetBucket*",
            "s3:List*",
            "s3:DeleteObject*",
            "s3:PutObject",
            "s3:PutObjectLegalHold",
            "s3:PutObjectRetention",
            "s3:PutObjectTagging",
            "s3:PutObjectVersionTagging",
            "s3:Abort*"
          ]),
          Resource: [
            {
              "Fn::GetAtt": [
                Match.stringLikeRegexp("testsourcebucketS3Bucket*."),
                "Arn"
              ]
            },
            {
              "Fn::Join": [
                "",
                [
                  {
                    "Fn::GetAtt": [
                      Match.stringLikeRegexp("testsourcebucketS3Bucket*."),
                      "Arn"
                    ]
                  },
                  "/*"
                ]
              ]
            }
          ]
        }),
        Match.objectLike({
          Effect: 'Allow',
          Action: Match.arrayWith([
            "s3:GetObject*",
            "s3:GetBucket*",
            "s3:List*",
          ]),
          Resource: [
            {
              "Fn::GetAtt": [
                Match.stringLikeRegexp("testsourcebucketS3Bucket.*"),
                "Arn"
              ]
            },
            {
              "Fn::Join": [
                "",
                [
                  {
                    "Fn::GetAtt": [
                      Match.stringLikeRegexp("testsourcebucketS3Bucket.*"),
                      "Arn"
                    ]
                  },
                  "/*"
                ]
              ]
            }
          ]
        })])
    },
    Roles: [
      {
        Ref: Match.stringLikeRegexp("testtextractservicerole.*")
      }
    ]
  });

  // Check that there just 1 policy
  template.resourceCountIs("AWS::IAM::Policy", 1);
});

test('Test deployment with source, destination and logging bucket Props', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  defaults.ConfigureTextractSupport(stack, 'test', {
    asyncJobs: true,
    sourceBucketProps: {
      bucketName: "source-bucket"
    },
    sourceLoggingBucketProps: {
      bucketName: "source-logging-bucket"
    },
    destinationBucketProps: {
      bucketName: "destination-bucket"
    },
    destinationLoggingBucketProps: {
      bucketName: "destination-logging-bucket"
    },
  });

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::S3::Bucket", 4);
  template.hasResourceProperties("AWS::S3::Bucket", {
    BucketName: "source-bucket",
    LoggingConfiguration: {
      DestinationBucketName: {
        Ref: Match.stringLikeRegexp("testsourcebucketS3LoggingBucket.*")
      }
    },
  });
  template.hasResourceProperties("AWS::S3::Bucket", {
    BucketName: "source-logging-bucket",
    AccessControl: "LogDeliveryWrite"
  });
  template.hasResourceProperties("AWS::S3::Bucket", {
    BucketName: "destination-bucket",
    LoggingConfiguration: {
      DestinationBucketName: {
        Ref: Match.stringLikeRegexp("testdestinationbucketS3LoggingBucket.*")
      }
    },
  });
  template.hasResourceProperties("AWS::S3::Bucket", {
    BucketName: "destination-logging-bucket",
    AccessControl: "LogDeliveryWrite"
  });
});

test('Test deployment with existing Source bucket and useSameBucket', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const existingSourceBucket = defaults.CreateScrapBucket(stack, "scrap", {});
  const configuration = defaults.ConfigureTextractSupport(stack, 'test', {
    asyncJobs: true,
    existingSourceBucketObj: existingSourceBucket,
    useSameBucket: true,
  });

  expect(configuration.sourceBucket).toBeDefined();
  expect(configuration.sourceBucket?.bucket).not.toBeDefined();
  expect(configuration.sourceBucket?.bucketInterface).toBeDefined();
  expect(configuration.sourceBucket?.loggingBucket).not.toBeDefined();
  expect(configuration.destinationBucket).toBeDefined();
  expect(configuration.destinationBucket?.bucket).not.toBeDefined();
  expect(configuration.destinationBucket?.bucketInterface).toBeDefined();
  expect(configuration.destinationBucket?.loggingBucket).not.toBeDefined();
  expect(configuration.destinationBucket?.bucketInterface).toBe(existingSourceBucket);
  expect(configuration.sourceBucket?.bucketInterface).toBe(existingSourceBucket);
  expect(configuration.snsTopic).toBeDefined();

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::S3::Bucket", 2);

});

test('Test deployment with existing Destination bucket', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const existingDestinationBucket = defaults.CreateScrapBucket(stack, "scrap", {});
  const configuration = defaults.ConfigureTextractSupport(stack, 'test', {
    asyncJobs: true,
    existingDestinationBucketObj: existingDestinationBucket
  });

  expect(configuration.sourceBucket).toBeDefined();
  expect(configuration.sourceBucket?.bucket).toBeDefined();
  expect(configuration.sourceBucket?.bucketInterface).toBeDefined();
  expect(configuration.sourceBucket?.loggingBucket).toBeDefined();
  expect(configuration.destinationBucket).toBeDefined();
  expect(configuration.destinationBucket?.bucket).not.toBeDefined();
  expect(configuration.destinationBucket?.bucketInterface).toBeDefined();
  expect(configuration.destinationBucket?.loggingBucket).not.toBeDefined();
  expect(configuration.destinationBucket?.bucketInterface).toBe(existingDestinationBucket);
  expect(configuration.snsTopic).toBeDefined();

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::S3::Bucket', 4); // 2 main buckets + 2 logging buckets

  // Check textract service permissions
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Effect: 'Allow',
          Action: Match.arrayWith([
            "s3:GetObject*",
            "s3:GetBucket*",
            "s3:List*",
            "s3:DeleteObject*",
            "s3:PutObject",
            "s3:PutObjectLegalHold",
            "s3:PutObjectRetention",
            "s3:PutObjectTagging",
            "s3:PutObjectVersionTagging",
            "s3:Abort*"
          ])
        })
      ])
    },
    Roles: [
      {
        Ref: Match.stringLikeRegexp("testtextractservicerole.*")
      }
    ]
  });

  // Check that there just 1 policy
  template.resourceCountIs("AWS::IAM::Policy", 1);
});

test('Test SNS topic is created for async architectures', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const configuration = defaults.ConfigureTextractSupport(stack, 'test', { asyncJobs: true });

  expect(configuration.snsTopic).toBeDefined();
  expect(configuration.snsTopic!.topicArn).toBeDefined();

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::SNS::Topic', 1);

  // Verify SNS topic has encryption enabled
  template.hasResourceProperties('AWS::SNS::Topic', {
    KmsMasterKeyId: {
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
          ":alias/aws/sns"
        ]
      ]
    }
  });
});

test('Test SNS topic is NOT created for synchronous architectures', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const configuration = defaults.ConfigureTextractSupport(stack, 'test', {});

  expect(configuration.snsTopic).not.toBeDefined();

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::SNS::Topic', 0);

});

// =============================================
// Test CheckTextractProps()
// =============================================
test("CheckTextractProps with valid asyncJobs true", () => {
  const props = {
    asyncJobs: true,
    sourceBucketProps: {}
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).not.toThrow();
});

test("CheckTextractProps with valid asyncJobs false", () => {
  const props = {
    asyncJobs: false
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).not.toThrow();
});

test("CheckTextractProps throws error when asyncJobs is false and existingSourceBucketObj is provided", () => {
  const stack = new Stack();
  const props = {
    asyncJobs: false,
    existingSourceBucketObj: CreateScrapBucket(stack, "testbucket")
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTextractProps throws error when asyncJobs is false and sourceBucketProps is provided", () => {
  const props = {
    asyncJobs: false,
    sourceBucketProps: {}
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTextractProps throws error when asyncJobs is false and existingDestinationBucketObj is provided", () => {
  const stack = new Stack();
  const props = {
    asyncJobs: false,
    existingDestinationBucketObj: CreateScrapBucket(stack, "testbucket")
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTextractProps throws error when asyncJobs is false and destinationBucketProps is provided", () => {
  const props = {
    asyncJobs: false,
    destinationBucketProps: {}
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTextractProps throws error when asyncJobs is false and sourceLoggingBucketProps is provided", () => {
  const props = {
    asyncJobs: false,
    sourceLoggingBucketProps: {}
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTextractProps throws error when asyncJobs is false and destinationLoggingBucketProps is provided", () => {
  const props = {
    asyncJobs: false,
    destinationLoggingBucketProps: {}
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTextractProps throws error when asyncJobs is false and logSourceS3AccessLogs is provided", () => {
  const props = {
    asyncJobs: false,
    logSourceS3AccessLogs: true
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTextractProps throws error when asyncJobs is false and logDestinationS3AccessLogs is provided", () => {
  const props = {
    asyncJobs: false,
    logDestinationS3AccessLogs: true
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTextractProps throws error when asyncJobs is false and sourceBucketEnvironmentVariableName is provided", () => {
  const props = {
    asyncJobs: false,
    sourceBucketEnvironmentVariableName: 'MY_SOURCE_BUCKET'
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTextractProps throws error when asyncJobs is false and destinationBucketEnvironmentVariableName is provided", () => {
  const props = {
    asyncJobs: false,
    destinationBucketEnvironmentVariableName: 'MY_DEST_BUCKET'
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTextractProps throws error when asyncJobs is false and dataAccessRoleArnEnvironmentVariableName is provided", () => {
  const props = {
    asyncJobs: false,
    dataAccessRoleArnEnvironmentVariableName: 'MY_ROLE_NAME'
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTextractProps throws error when asyncJobs is false and useSameBucket is provided", () => {
  const props = {
    asyncJobs: false,
    useSameBucket: true
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTextractProps throws error when useSameBucket is true and existingDestinationBucketObj is provided", () => {
  const stack = new Stack();
  const props = {
    asyncJobs: true,
    useSameBucket: true,
    existingDestinationBucketObj: CreateScrapBucket(stack, "testbucket")
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).toThrow('Destination bucket properties cannot be provided when useSameBucket is true');
});

test("CheckTextractProps throws error when useSameBucket is true and destinationBucketProps is provided", () => {
  const props = {
    asyncJobs: true,
    useSameBucket: true,
    destinationBucketProps: {}
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).toThrow('Destination bucket properties cannot be provided when useSameBucket is true');
});

test("CheckTextractProps throws error when useSameBucket is true and destinationLoggingBucketProps is provided", () => {
  const props = {
    asyncJobs: true,
    useSameBucket: true,
    destinationLoggingBucketProps: {}
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).toThrow('Destination bucket properties cannot be provided when useSameBucket is true');
});

test("CheckTextractProps throws error when useSameBucket is true and logDestinationS3AccessLogs is provided", () => {
  const props = {
    asyncJobs: true,
    useSameBucket: true,
    logDestinationS3AccessLogs: true
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).toThrow('Destination bucket properties cannot be provided when useSameBucket is true');
});

test("CheckTextractProps with valid useSameBucket true and source bucket props", () => {
  const props = {
    asyncJobs: true,
    useSameBucket: true,
    sourceBucketProps: {}
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).not.toThrow();
});

test("CheckTextractProps calls CheckS3Props() for source bucket", () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const props = {
    asyncJobs: true,
    sourceBucketProps: {},
    existingSourceBucketObj: CreateScrapBucket(stack, 'test')
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).toThrow('Error - Either provide bucketProps or existingBucketObj, but not both.\n');
});

test("CheckTextractProps calls CheckS3Props() for destination bucket", () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const props = {
    asyncJobs: true,
    destinationBucketProps: {},
    existingDestinationBucketObj: CreateScrapBucket(stack, 'test')
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).toThrow('Error - Either provide bucketProps or existingBucketObj, but not both.\n');
});

test("CheckTextractProps throws error when asyncJobs is false and existingTopicObj is provided", () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");
  const topic = defaults.buildTopic(stack, 'test-topic', {}).topic;

  const props = {
    asyncJobs: false,
    existingTopicObj: topic
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).toThrow('SNS topic properties can only be provided when asyncJobs is true');
});

test("CheckTextractProps throws error when asyncJobs is false and existingTopicEncryptionKey is provided", () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");
  const key = defaults.buildEncryptionKey(stack, 'test-key');

  const props = {
    asyncJobs: false,
    existingTopicEncryptionKey: key
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).toThrow('SNS topic properties can only be provided when asyncJobs is true');
});

test("CheckTextractProps throws error when asyncJobs is false and topicProps is provided", () => {
  const props = {
    asyncJobs: false,
    topicProps: {}
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).toThrow('SNS topic properties can only be provided when asyncJobs is true');
});

test("CheckTextractProps throws error when asyncJobs is false and encryptionKey is provided", () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");
  const key = defaults.buildEncryptionKey(stack, 'test-key');

  const props = {
    asyncJobs: false,
    encryptionKey: key
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).toThrow('SNS topic properties can only be provided when asyncJobs is true');
});

test("CheckTextractProps throws error when asyncJobs is false and encryptionKeyProps is provided", () => {
  const props = {
    asyncJobs: false,
    encryptionKeyProps: {}
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).toThrow('SNS topic properties can only be provided when asyncJobs is true');
});

test("CheckTextractProps throws error when asyncJobs is false and enableEncryptionWithCustomerManagedKey is provided", () => {
  const props = {
    asyncJobs: false,
    enableEncryptionWithCustomerManagedKey: true
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).toThrow('SNS topic properties can only be provided when asyncJobs is true');
});

test("CheckTextractProps calls CheckSnsProps() for SNS topic", () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");
  const topic = defaults.buildTopic(stack, 'test-topic', {}).topic;

  const props = {
    asyncJobs: true,
    topicProps: {},
    existingTopicObj: topic
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).toThrow('Error - Either provide topicProps or existingTopicObj, but not both.\n');
});

test("CheckTextractProps accepts SNS properties when asyncJobs is true", () => {
  const props = {
    asyncJobs: true,
    topicProps: {
      topicName: 'my-topic'
    }
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).not.toThrow();
});

test("CheckTextractProps accepts existingTopicObj when asyncJobs is true", () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");
  const topic = defaults.buildTopic(stack, 'test-topic', {}).topic;

  const props = {
    asyncJobs: true,
    existingTopicObj: topic
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).not.toThrow();
});

test("CheckTextractProps accepts encryption properties when asyncJobs is true", () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");
  const key = defaults.buildEncryptionKey(stack, 'test-key');

  const props = {
    asyncJobs: true,
    encryptionKey: key,
    enableEncryptionWithCustomerManagedKey: true
  };

  expect(() => {
    defaults.CheckTextractProps(props);
  }).not.toThrow();
});

// =============================================
// Test ConfigureTextractSupport() with SNS properties
// =============================================

test('Test ConfigureTextractSupport with custom SNS topic properties', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  // Create a custom KMS key for encryption
  const customKey = defaults.buildEncryptionKey(stack, 'custom-key', {
    description: 'Custom encryption key for SNS topic'
  });

  const configuration = defaults.ConfigureTextractSupport(stack, 'test', {
    asyncJobs: true,
    topicProps: {
      topicName: 'custom-textract-topic',
      displayName: 'Custom Textract Notifications'
    },
    encryptionKey: customKey,
    enableEncryptionWithCustomerManagedKey: true
  });

  // Verify SNS topic was created
  expect(configuration.snsTopic).toBeDefined();

  const template = Template.fromStack(stack);

  // Verify exactly 1 SNS topic was created
  template.resourceCountIs('AWS::SNS::Topic', 1);

  // Verify the topic has the custom properties
  template.hasResourceProperties('AWS::SNS::Topic', {
    TopicName: 'custom-textract-topic',
    DisplayName: 'Custom Textract Notifications',
    KmsMasterKeyId: {
      'Fn::GetAtt': [
        Match.stringLikeRegexp('customkey.*'),
        'Arn'
      ]
    }
  });

  // Verify the custom KMS key was created
  template.resourceCountIs('AWS::KMS::Key', 1);
  template.hasResourceProperties('AWS::KMS::Key', {
    Description: 'Custom encryption key for SNS topic'
  });
});

test('Test ConfigureTextractSupport with existing SNS topic', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  // Create an existing SNS topic
  const existingTopic = defaults.buildTopic(stack, 'existing-topic', {
    topicProps: {
      topicName: 'pre-existing-topic',
      displayName: 'Pre-existing Topic'
    }
  }).topic;

  const configuration = defaults.ConfigureTextractSupport(stack, 'test', {
    asyncJobs: true,
    existingTopicObj: existingTopic
  });

  // Verify the existing topic is used
  expect(configuration.snsTopic).toBeDefined();
  expect(configuration.snsTopic).toBe(existingTopic);

  const template = Template.fromStack(stack);

  // Verify exactly 1 SNS topic exists (the pre-existing one, no new topic created)
  template.resourceCountIs('AWS::SNS::Topic', 1);

  // Verify it's the pre-existing topic with the correct properties
  template.hasResourceProperties('AWS::SNS::Topic', {
    TopicName: 'pre-existing-topic',
    DisplayName: 'Pre-existing Topic'
  });

  // Verify no additional topics were created by ConfigureTextractSupport
  const topics = template.findResources('AWS::SNS::Topic');
  expect(Object.keys(topics).length).toBe(1);
});
