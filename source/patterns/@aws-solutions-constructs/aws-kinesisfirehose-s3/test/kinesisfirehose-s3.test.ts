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

import { KinesisFirehoseToS3, KinesisFirehoseToS3Props } from "../lib";
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Template } from 'aws-cdk-lib/assertions';
import { CreateScrapBucket } from '@aws-solutions-constructs/core';
import * as defaults from '@aws-solutions-constructs/core';

function deploy(stack: cdk.Stack, props: KinesisFirehoseToS3Props = {}) {
  return new KinesisFirehoseToS3(stack, 'test-firehose-s3', props);
}

test('check s3Bucket default encryption', () => {
  const stack = new cdk.Stack();
  deploy(stack);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::S3::Bucket', {
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [{
        ServerSideEncryptionByDefault: {
          SSEAlgorithm: "AES256"
        }
      }]
    }
  });
});

test('check s3Bucket public access block configuration', () => {
  const stack = new cdk.Stack();
  deploy(stack);
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::S3::Bucket', {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true
    }
  });
});

test('test s3Bucket override publicAccessBlockConfiguration', () => {
  const stack = new cdk.Stack();

  deploy(stack, {
    bucketProps: {
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: true,
        ignorePublicAcls: false,
        restrictPublicBuckets: true
      }
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::S3::Bucket", {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: false,
      BlockPublicPolicy: true,
      IgnorePublicAcls: false,
      RestrictPublicBuckets: true
    },
  });
});

test('test kinesisFirehose override ', () => {
  const stack = new cdk.Stack();

  deploy(stack, {
    kinesisFirehoseProps: {
      extendedS3DestinationConfiguration: {
        bufferingHints: {
          intervalInSeconds: 600,
          sizeInMBs: 55
        },
      }
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::KinesisFirehose::DeliveryStream", {
    ExtendedS3DestinationConfiguration: {
      BufferingHints: {
        IntervalInSeconds: 600,
        SizeInMBs: 55
      }
    }
  });
});

test('check default properties', () => {
  const stack = new cdk.Stack();
  const construct: KinesisFirehoseToS3 = deploy(stack);

  expect(construct.kinesisFirehose).not.toEqual(undefined);
  expect(construct.kinesisFirehoseRole).not.toEqual(undefined);
  expect(construct.kinesisFirehoseLogGroup).not.toEqual(undefined);
  expect(construct.s3Bucket).not.toEqual(undefined);
  expect(construct.s3LoggingBucket).not.toEqual(undefined);
});

test('check properties with existing S3 bucket', () => {
  const stack = new cdk.Stack();
  const existingBucket = CreateScrapBucket(stack, "scrapBucket");
  const mybucket: s3.IBucket = s3.Bucket.fromBucketName(stack, 'mybucket', existingBucket.bucketName);
  const construct: KinesisFirehoseToS3 = deploy(stack, {
    existingBucketObj: mybucket
  });

  expect(construct.kinesisFirehose).not.toEqual(undefined);
  expect(construct.kinesisFirehoseRole).not.toEqual(undefined);
  expect(construct.kinesisFirehoseLogGroup).not.toEqual(undefined);
  expect(construct.s3Bucket).toEqual(undefined);
  expect(construct.s3LoggingBucket).toEqual(undefined);
});

test('check properties with existing logging S3 bucket', () => {
  const stack = new cdk.Stack();
  const existingBucket = CreateScrapBucket(stack, "scrapBucket");
  const myLoggingBucket: s3.IBucket = s3.Bucket.fromBucketName(stack, 'myLoggingBucket', existingBucket.bucketName);
  const construct: KinesisFirehoseToS3 = deploy(stack, {
    existingLoggingBucketObj: myLoggingBucket
  });

  expect(construct.kinesisFirehose).not.toEqual(undefined);
  expect(construct.kinesisFirehoseRole).not.toEqual(undefined);
  expect(construct.kinesisFirehoseLogGroup).not.toEqual(undefined);
  expect(construct.s3Bucket).not.toEqual(undefined);
  expect(construct.s3LoggingBucket).toEqual(undefined);
});

test('check properties with existing logging S3 bucket and S3 bucket props', () => {
  const stack = new cdk.Stack();
  const existingBucket = CreateScrapBucket(stack, "scrapBucket");
  const myLoggingBucket: s3.IBucket = s3.Bucket.fromBucketName(stack, 'myLoggingBucket', existingBucket.bucketName);
  const construct: KinesisFirehoseToS3 = deploy(stack, {
    bucketProps: {
      serverAccessLogsPrefix: 'prefix/'
    },
    existingLoggingBucketObj: myLoggingBucket
  });

  expect(construct.kinesisFirehose).not.toEqual(undefined);
  expect(construct.kinesisFirehoseRole).not.toEqual(undefined);
  expect(construct.kinesisFirehoseLogGroup).not.toEqual(undefined);
  expect(construct.s3Bucket).not.toEqual(undefined);
  expect(construct.s3LoggingBucket).toEqual(undefined);
});

test('check for SSE encryption for Direct put', () => {
  const stack = new cdk.Stack();

  new KinesisFirehoseToS3(stack, 'test-firehose-s3', {
    kinesisFirehoseProps: {
      deliveryStreamType: 'direct-put'
    }
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::KinesisFirehose::DeliveryStream", {
    DeliveryStreamEncryptionConfigurationInput: {
      KeyType: "AWS_OWNED_CMK"
    },
  });
});

test('check for no SSE encryption for KinesisFirehoseToS3', () => {
  const stack = new cdk.Stack();

  new KinesisFirehoseToS3(stack, 'test-firehose-s3', {
    kinesisFirehoseProps: {
      deliveryStreamType: 'KinesisStreamAsSource'
    }
  });

  defaults.expectNonexistence(stack, "AWS::KinesisFirehose::DeliveryStream", {
    DeliveryStreamEncryptionConfigurationInput: {
      KeyType: "AWS_OWNED_CMK"
    },
  });
});

test("Confirm that CheckS3Props is being called", () => {
  // Stack
  const stack = new cdk.Stack();

  const testBucket = new s3.Bucket(stack, 'test-bucket', {});

  const app = () => {
    // Helper declaration
    new KinesisFirehoseToS3(stack, "bad-s3-args", {
      existingBucketObj: testBucket,
      bucketProps: {
        removalPolicy: cdk.RemovalPolicy.DESTROY
      },
    });
  };
  // Assertion
  expect(app).toThrowError("Error - Either provide bucketProps or existingBucketObj, but not both.\n");
});

test('s3 bucket with bucket, loggingBucket, and auto delete objects', () => {
  const stack = new cdk.Stack();

  new KinesisFirehoseToS3(stack, 'kinsisfirehose-s3', {
    kinesisFirehoseProps: {
      deliveryStreamType: 'KinesisStreamAsSource'
    },
    bucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    },
    loggingBucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    }
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::S3::Bucket", 2);

  template.hasResourceProperties("Custom::S3AutoDeleteObjects", {
    ServiceToken: {
      "Fn::GetAtt": [
        "CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F",
        "Arn"
      ]
    },
    BucketName: {
      Ref: "kinsisfirehoses3S3LoggingBucket81EC2970"
    }
  });
});

test("Test bad call with existingLoggingBucketObj and loggingBucketProps", () => {
  // Stack
  const stack = new cdk.Stack();

  const testBucket = new s3.Bucket(stack, 'test-bucket', {});

  const app = () => {
    // Helper declaration
    new KinesisFirehoseToS3(stack, "bad-s3-args", {
      existingLoggingBucketObj: testBucket,
      loggingBucketProps: {
        removalPolicy: cdk.RemovalPolicy.DESTROY
      },
    });
  };
  // Assertion
  expect(app).toThrowError('Error - Either provide existingLoggingBucketObj or loggingBucketProps, but not both.\n');
});

test("Test bad call with logS3AccessLogs as false and bucketProps", () => {
  // Stack
  const stack = new cdk.Stack();

  const app = () => {
    // Helper declaration
    new KinesisFirehoseToS3(stack, "bad-s3-args", {
      loggingBucketProps: {
        removalPolicy: cdk.RemovalPolicy.DESTROY
      },
      logS3AccessLogs: false
    });
  };
  // Assertion
  expect(app).toThrowError('Error - If logS3AccessLogs is false, supplying loggingBucketProps or existingLoggingBucketObj is invalid.\n');
});

test('s3 bucket with one content bucket and no logging bucket', () => {
  const stack = new cdk.Stack();

  new KinesisFirehoseToS3(stack, 'kinsisfirehose-s3', {
    kinesisFirehoseProps: {
      deliveryStreamType: 'KinesisStreamAsSource'
    },
    bucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    },
    logS3AccessLogs: false
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::S3::Bucket", 1);
});

test('check client provided name overrides default DeliveryStreamName', () => {
  const stack = new cdk.Stack();
  const testName = 'client-name';

  deploy(stack, {
    kinesisFirehoseProps: {
      deliveryStreamName: testName
    }
  });
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::KinesisFirehose::DeliveryStream", {
    DeliveryStreamName: testName
  });
});

test('check DeliveryStreamName is populated', () => {
  const stack = new cdk.Stack(undefined, 'test-stack');

  deploy(stack);
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::KinesisFirehose::DeliveryStream", {
    DeliveryStreamName: "KinesisFirehoseteststacktestfirehoses3F50DF0E1"
  });
});

test('check resource names allow multiple instances in 1 stack', () => {
  const stack = new cdk.Stack();
  new KinesisFirehoseToS3(stack, 'first-construct', {});
  new KinesisFirehoseToS3(stack, 'second-construct', {});

  // Nothing to check, the above lines shouldn't throw an error
});
