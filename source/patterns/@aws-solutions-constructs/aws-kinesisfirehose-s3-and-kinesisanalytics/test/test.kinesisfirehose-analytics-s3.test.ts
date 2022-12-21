/**
 *  CopyrightAmazon.com, Inc. or its affiliates. All Rights Reserved.
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

// Imports
import { Stack, RemovalPolicy } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { KinesisFirehoseToAnalyticsAndS3, KinesisFirehoseToAnalyticsAndS3Props } from '../lib';
import '@aws-cdk/assert/jest';

// --------------------------------------------------------------
// Test Case 2 - Test the getter methods
// --------------------------------------------------------------
test('Test properties', () => {
  // Initial Setup
  const stack = new Stack();
  const props: KinesisFirehoseToAnalyticsAndS3Props = {
    kinesisAnalyticsProps: {
      inputs: [{
        inputSchema: {
          recordColumns: [{
            name: 'ts',
            sqlType: 'TIMESTAMP',
            mapping: '$.timestamp'
          }, {
            name: 'trip_id',
            sqlType: 'VARCHAR(64)',
            mapping: '$.trip_id'
          }],
          recordFormat: {
            recordFormatType: 'JSON'
          },
          recordEncoding: 'UTF-8'
        },
        namePrefix: 'SOURCE_SQL_STREAM'
      }]
    }
  };
  const app = new KinesisFirehoseToAnalyticsAndS3(stack, 'test-kinesis-firehose-kinesis-analytics', props);
  // Assertions
  expect(app.kinesisAnalytics !== null);
  expect(app.kinesisFirehose !== null);
  expect(app.kinesisFirehoseRole !== null);
  expect(app.kinesisFirehoseLogGroup !== null);
  expect(app.s3Bucket !== null);
  expect(app.s3LoggingBucket !== null);
});

// --------------------------------------------------------------
// Test Case 3 - Override kinesisFirehose props
// --------------------------------------------------------------
test('test kinesisFirehose override ', () => {
  const stack = new Stack();

  new KinesisFirehoseToAnalyticsAndS3(stack, 'test-firehose-s3', {
    kinesisFirehoseProps: {
      extendedS3DestinationConfiguration: {
        bufferingHints: {
          intervalInSeconds: 600,
          sizeInMBs: 55
        },
      }
    },
    kinesisAnalyticsProps: {
      inputs: [{
        inputSchema: {
          recordColumns: [{
            name: 'ts',
            sqlType: 'TIMESTAMP',
            mapping: '$.timestamp'
          }, {
            name: 'trip_id',
            sqlType: 'VARCHAR(64)',
            mapping: '$.trip_id'
          }],
          recordFormat: {
            recordFormatType: 'JSON'
          },
          recordEncoding: 'UTF-8'
        },
        namePrefix: 'SOURCE_SQL_STREAM'
      }]
    }
  });

  expect(stack).toHaveResourceLike("AWS::KinesisFirehose::DeliveryStream", {
    ExtendedS3DestinationConfiguration: {
      BufferingHints: {
        IntervalInSeconds: 600,
        SizeInMBs: 55
      }
    }
  });
});

// --------------------------------------------------------------
// Test bad call with existingBucket and bucketProps
// --------------------------------------------------------------
test("Test bad call with existingBucket and bucketProps", () => {
  // Stack
  const stack = new Stack();

  const testBucket = new s3.Bucket(stack, 'test-bucket', {});

  const app = () => {
    // Helper declaration
    new KinesisFirehoseToAnalyticsAndS3(stack, "bad-s3-args", {
      existingBucketObj: testBucket,
      bucketProps: {
        removalPolicy: RemovalPolicy.DESTROY
      },
    });
  };
  // Assertion
  expect(app).toThrowError();
});

// --------------------------------------------------------------
// s3 bucket with bucket, loggingBucket, and auto delete objects
// --------------------------------------------------------------
test('s3 bucket with bucket, loggingBucket, and auto delete objects', () => {
  const stack = new Stack();

  new KinesisFirehoseToAnalyticsAndS3(stack, 'kinsisfirehose-s3-analytics', {
    kinesisAnalyticsProps: {
      inputs: [{
        inputSchema: {
          recordColumns: [{
            name: 'ts',
            sqlType: 'TIMESTAMP',
            mapping: '$.timestamp'
          }, {
            name: 'trip_id',
            sqlType: 'VARCHAR(64)',
            mapping: '$.trip_id'
          }],
          recordFormat: {
            recordFormatType: 'JSON'
          },
          recordEncoding: 'UTF-8'
        },
        namePrefix: 'SOURCE_SQL_STREAM'
      }]
    },
    loggingBucketProps: {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    }
  });

  expect(stack).toHaveResource("AWS::S3::Bucket", {
    AccessControl: "LogDeliveryWrite"
  });

  expect(stack).toHaveResource("Custom::S3AutoDeleteObjects", {
    ServiceToken: {
      "Fn::GetAtt": [
        "CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F",
        "Arn"
      ]
    },
    BucketName: {
      Ref: "kinsisfirehoses3analyticsKinesisFirehoseToS3S3LoggingBucket6EE455EF"
    }
  });
});

// --------------------------------------------------------------
// s3 bucket with one content bucket and no logging bucket
// --------------------------------------------------------------
test('s3 bucket with one content bucket and no logging bucket', () => {
  const stack = new Stack();

  new KinesisFirehoseToAnalyticsAndS3(stack, 'kinsisfirehose-s3-analytics', {
    kinesisAnalyticsProps: {
      inputs: [{
        inputSchema: {
          recordColumns: [{
            name: 'ts',
            sqlType: 'TIMESTAMP',
            mapping: '$.timestamp'
          }, {
            name: 'trip_id',
            sqlType: 'VARCHAR(64)',
            mapping: '$.trip_id'
          }],
          recordFormat: {
            recordFormatType: 'JSON'
          },
          recordEncoding: 'UTF-8'
        },
        namePrefix: 'SOURCE_SQL_STREAM'
      }]
    },
    kinesisFirehoseProps: {
      deliveryStreamType: 'KinesisStreamAsSource'
    },
    bucketProps: {
      removalPolicy: RemovalPolicy.DESTROY,
    },
    logS3AccessLogs: false
  });

  expect(stack).toCountResources("AWS::S3::Bucket", 1);
});