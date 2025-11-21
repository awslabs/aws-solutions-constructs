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

  const configuration = defaults.ConfigureTranslateSupport(stack, 'test', { asyncJobs: true });

  expect(configuration.sourceBucket).toBeDefined();
  expect(configuration.sourceBucket?.bucket).toBeDefined();
  expect(configuration.sourceBucket?.bucketInterface).toBeDefined();
  expect(configuration.sourceBucket?.loggingBucket).toBeDefined();
  expect(configuration.destinationBucket).toBeDefined();
  expect(configuration.destinationBucket?.bucket).toBeDefined();
  expect(configuration.destinationBucket?.bucketInterface).toBeDefined();
  expect(configuration.destinationBucket?.loggingBucket).toBeDefined();
  expect(configuration.translateRole).toBeDefined();

  expect(configuration.lambdaIamActionsRequired).toEqual(expect.arrayContaining([
    'translate:TranslateText',
    'translate:TranslateDocument',
    'iam:PassRole',
    'translate:DescribeTextTranslationJob',
    'translate:ListTextTranslationJobs',
    'translate:StartTextTranslationJob',
    'translate:StopTextTranslationJob'
  ]));
  expect(configuration.lambdaIamActionsRequired).toHaveLength(7);

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::S3::Bucket', 4); // 2 main buckets + 2 logging buckets

  // Check translate service permissions
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
        })])
    },
    Roles: [
      {
        Ref: Match.stringLikeRegexp("testtranslateservicerole.*")
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
            Service: "translate.amazonaws.com"
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

test('Test deployment with without asyncJobs enabled', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const configuration = defaults.ConfigureTranslateSupport(stack, 'test', {});

  expect(configuration.sourceBucket).not.toBeDefined();
  expect(configuration.destinationBucket).not.toBeDefined();
  expect(configuration.translateRole).not.toBeDefined();
  expect(configuration.lambdaIamActionsRequired).toEqual(expect.arrayContaining([
    'translate:TranslateText',
    'translate:TranslateDocument',
  ]));
  expect(configuration.lambdaIamActionsRequired).toHaveLength(2);

});

test('Test deployment with useSameBucket', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const configuration = defaults.ConfigureTranslateSupport(stack, 'test', { asyncJobs: true, useSameBucket: true });

  expect(configuration.sourceBucket).toBeDefined();
  expect(configuration.sourceBucket?.bucket).toBeDefined();
  expect(configuration.sourceBucket?.bucketInterface).toBeDefined();
  expect(configuration.sourceBucket?.loggingBucket).toBeDefined();
  expect(configuration.destinationBucket).toBeDefined();
  expect(configuration.destinationBucket?.bucket).toBeDefined();
  expect(configuration.destinationBucket?.bucketInterface).toBeDefined();
  expect(configuration.destinationBucket?.loggingBucket).toBeDefined();
  expect(configuration.translateRole).toBeDefined();

  expect(configuration.lambdaIamActionsRequired).toEqual(expect.arrayContaining([
    'translate:TranslateText',
    'translate:TranslateDocument',
    'iam:PassRole',
    'translate:DescribeTextTranslationJob',
    'translate:ListTextTranslationJobs',
    'translate:StartTextTranslationJob',
    'translate:StopTextTranslationJob'
  ]));
  expect(configuration.lambdaIamActionsRequired).toHaveLength(7);
  expect(configuration.sourceBucket?.bucket).toBe(configuration.destinationBucket?.bucket);
  expect(configuration.sourceBucket?.bucketInterface).toBe(configuration.destinationBucket?.bucketInterface);
  expect(configuration.sourceBucket?.loggingBucket).toBe(configuration.destinationBucket?.loggingBucket);

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::S3::Bucket', 2); // 1 main bucket + 1 logging bucket

  // Check translate service permissions
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
        Ref: Match.stringLikeRegexp("testtranslateservicerole.*")
      }
    ]
  });

  // Check that there just 1 policy
  template.resourceCountIs("AWS::IAM::Policy", 1);
});

test('Test deployment with source, destination and logging bucket Props', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  defaults.ConfigureTranslateSupport(stack, 'test', {
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
  const configuration = defaults.ConfigureTranslateSupport(stack, 'test', {
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
});

test('Test deployment with existing Destination bucket', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const existingDestinationBucket = defaults.CreateScrapBucket(stack, "scrap", {});
  const configuration = defaults.ConfigureTranslateSupport(stack, 'test', {
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
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::S3::Bucket', 4); // 2 main buckets + 2 logging buckets

  // Check translate service permissions
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
        Ref: Match.stringLikeRegexp("testtranslateservicerole.*")
      }
    ]
  });

  // Check that there just 1 policy
  template.resourceCountIs("AWS::IAM::Policy", 1);
});

// =============================================
// Test CheckTranslateProps()
// =============================================
test("CheckTranslateProps with valid asyncJobs true", () => {
  const props = {
    asyncJobs: true,
    sourceBucketProps: {}
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).not.toThrow();
});

test("CheckTranslateProps with valid asyncJobs false", () => {
  const props = {
    asyncJobs: false
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).not.toThrow();
});

test("CheckTranslateProps throws error when asyncJobs is false and existingSourceBucketObj is provided", () => {
  const stack = new Stack();
  const props = {
    asyncJobs: false,
    existingSourceBucketObj: CreateScrapBucket(stack, "testbucket")
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTranslateProps throws error when asyncJobs is false and sourceBucketProps is provided", () => {
  const props = {
    asyncJobs: false,
    sourceBucketProps: {}
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTranslateProps throws error when asyncJobs is false and existingDestinationBucketObj is provided", () => {
  const stack = new Stack();
  const props = {
    asyncJobs: false,
    existingDestinationBucketObj: CreateScrapBucket(stack, "testbucket")
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTranslateProps throws error when asyncJobs is false and destinationBucketProps is provided", () => {
  const props = {
    asyncJobs: false,
    destinationBucketProps: {}
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTranslateProps throws error when asyncJobs is false and sourceLoggingBucketProps is provided", () => {
  const props = {
    asyncJobs: false,
    sourceLoggingBucketProps: {}
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTranslateProps throws error when asyncJobs is false and destinationLoggingBucketProps is provided", () => {
  const props = {
    asyncJobs: false,
    destinationLoggingBucketProps: {}
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTranslateProps throws error when asyncJobs is false and logSourceS3AccessLogs is provided", () => {
  const props = {
    asyncJobs: false,
    logSourceS3AccessLogs: true
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTranslateProps throws error when asyncJobs is false and logDestinationS3AccessLogs is provided", () => {
  const props = {
    asyncJobs: false,
    logDestinationS3AccessLogs: true
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTranslateProps throws error when asyncJobs is false and sourceBucketEnvironmentVariableName is provided", () => {
  const props = {
    asyncJobs: false,
    sourceBucketEnvironmentVariableName: 'MY_SOURCE_BUCKET'
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTranslateProps throws error when asyncJobs is false and destinationBucketEnvironmentVariableName is provided", () => {
  const props = {
    asyncJobs: false,
    destinationBucketEnvironmentVariableName: 'MY_DEST_BUCKET'
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTranslateProps throws error when asyncJobs is false and dataAccessRoleArnEnvironmentVariableName is provided", () => {
  const props = {
    asyncJobs: false,
    dataAccessRoleArnEnvironmentVariableName: 'MY_ROLE_NAME'
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTranslateProps throws error when asyncJobs is false and useSameBucket is provided", () => {
  const props = {
    asyncJobs: false,
    useSameBucket: true
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('S3 bucket properties can only be provided when asyncJobs is true');
});

test("CheckTranslateProps throws error when useSameBucket is true and existingDestinationBucketObj is provided", () => {
  const stack = new Stack();
  const props = {
    asyncJobs: true,
    useSameBucket: true,
    existingDestinationBucketObj: CreateScrapBucket(stack, "testbucket")
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('Destination bucket properties cannot be provided when useSameBucket is true');
});

test("CheckTranslateProps throws error when useSameBucket is true and destinationBucketProps is provided", () => {
  const props = {
    asyncJobs: true,
    useSameBucket: true,
    destinationBucketProps: {}
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('Destination bucket properties cannot be provided when useSameBucket is true');
});

test("CheckTranslateProps throws error when useSameBucket is true and destinationLoggingBucketProps is provided", () => {
  const props = {
    asyncJobs: true,
    useSameBucket: true,
    destinationLoggingBucketProps: {}
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('Destination bucket properties cannot be provided when useSameBucket is true');
});

test("CheckTranslateProps throws error when useSameBucket is true and logDestinationS3AccessLogs is provided", () => {
  const props = {
    asyncJobs: true,
    useSameBucket: true,
    logDestinationS3AccessLogs: true
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('Destination bucket properties cannot be provided when useSameBucket is true');
});

test("CheckTranslateProps with valid useSameBucket true and source bucket props", () => {
  const props = {
    asyncJobs: true,
    useSameBucket: true,
    sourceBucketProps: {}
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).not.toThrow();
});

test("CheckTranslateProps calls CheckS3Props() for source bucket", () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const props = {
    asyncJobs: true,
    sourceBucketProps: {},
    existingSourceBucketObj: CreateScrapBucket(stack, 'test')
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('Error - Either provide bucketProps or existingBucketObj, but not both.\n');
});

test("CheckTranslateProps calls CheckS3Props() for destination bucket", () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const props = {
    asyncJobs: true,
    destinationBucketProps: {},
    existingDestinationBucketObj: CreateScrapBucket(stack, 'test')
  };

  expect(() => {
    defaults.CheckTranslateProps(props);
  }).toThrow('Error - Either provide bucketProps or existingBucketObj, but not both.\n');
});
