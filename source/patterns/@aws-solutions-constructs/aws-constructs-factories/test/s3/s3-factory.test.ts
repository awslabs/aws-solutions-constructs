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
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Template } from 'aws-cdk-lib/assertions';
import { ConstructsFactories } from "../../lib";

test('All defaults', () => {
  const stack = new Stack();

  const factories = new ConstructsFactories(stack, 'target');

  const newBucketStructure = factories.s3BucketFactory('testBucket', {});

  expect(newBucketStructure.s3Bucket).toBeDefined();
  expect(newBucketStructure.s3LoggingBucket).toBeDefined();

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::S3::Bucket", 2);
  template.hasResourceProperties("AWS::S3::Bucket", {
    LoggingConfiguration: {
      DestinationBucketName: {
        Ref: "targettestBucketS3LoggingBucket5E4EA39A"
      }
    },
  });
});

test('With Logging off', () => {
  const stack = new Stack();

  const factories = new ConstructsFactories(stack, 'target');

  const newBucketStructure = factories.s3BucketFactory('testBucket', {
    logS3AccessLogs: false
  });

  expect(newBucketStructure.s3Bucket).toBeDefined();
  expect(newBucketStructure.s3LoggingBucket).not.toBeDefined();

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::S3::Bucket", 1);
});

test('Use log bucket props', () => {
  const testName = 'my-log-bucket';
  const stack = new Stack();

  const factories = new ConstructsFactories(stack, 'target');

  factories.s3BucketFactory('testBucket', {
    logS3AccessLogs: true,
    loggingBucketProps: {
      bucketName: testName
    }
  });

  const template = Template.fromStack(stack);
  // Did it use the name in the props?
  template.hasResourceProperties("AWS::S3::Bucket", {
    BucketName: testName
  });
});

test('Use existing log bucket props', () => {
  const testName = 'my-log-bucket';
  const stack = new Stack();

  const existingLogBucket = new s3.Bucket(stack, 'existing-log-bucket', {
    bucketName: testName
  });

  const factories = new ConstructsFactories(stack, 'target');

  factories.s3BucketFactory('testBucket', {
    bucketProps: {
      serverAccessLogsBucket: existingLogBucket
    }
  });

  const template = Template.fromStack(stack);
  // Does it have the expected number of buckets?
  template.resourceCountIs("AWS::S3::Bucket", 2);
  template.hasResourceProperties("AWS::S3::Bucket", {
    LoggingConfiguration: {
      DestinationBucketName: {
        Ref: "existinglogbucket385335A9"
      }
    },
  });
});

test('Catch Props Errors', () => {
  const testName = 'my-log-bucket';
  const stack = new Stack();

  const factories = new ConstructsFactories(stack, 'target');

  const app = () => {
    factories.s3BucketFactory('testBucket', {
      logS3AccessLogs: false,
      loggingBucketProps: {
        bucketName: testName
      }
    });
  };
  // Assertion
  expect(app).toThrowError('Error - If logS3AccessLogs is false, supplying loggingBucketProps or existingLoggingBucketObj is invalid.\n');
});
