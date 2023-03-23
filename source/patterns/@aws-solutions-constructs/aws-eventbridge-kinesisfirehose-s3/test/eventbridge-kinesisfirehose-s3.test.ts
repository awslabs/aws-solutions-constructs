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

import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as events from "aws-cdk-lib/aws-events";
import { Template } from 'aws-cdk-lib/assertions';
import { EventbridgeToKinesisFirehoseToS3, EventbridgeToKinesisFirehoseToS3Props } from '../lib';

// --------------------------------------------------------------
// Test snapshot match with default parameters
// --------------------------------------------------------------
function deployNewStack(stack: cdk.Stack) {
  const props: EventbridgeToKinesisFirehoseToS3Props = {
    eventRuleProps: {
      description: 'event rule props',
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    }
  };
  return new EventbridgeToKinesisFirehoseToS3(stack, 'test-eventbridge-kinesis-firehose-s3-default-parameters', props);
}

// --------------------------------------------------------------
// Test properties
// --------------------------------------------------------------
test('Test properties', () => {
  const stack = new cdk.Stack();
  const construct: EventbridgeToKinesisFirehoseToS3 = deployNewStack(stack);

  // Assertions
  expect(construct.eventsRule !== null);
  expect(construct.eventsRole !== null);
  expect(construct.kinesisFirehose !== null);
  expect(construct.kinesisFirehoseRole !== null);
  expect(construct.kinesisFirehoseLogGroup !== null);
  expect(construct.s3Bucket !== null);
  expect(construct.s3LoggingBucket !== null);
});

// --------------------------------------------------------------
// Test default server side s3 bucket encryption
// --------------------------------------------------------------
test('Test default server side s3 bucket encryption', () => {
  const stack = new cdk.Stack();
  deployNewStack(stack);

  // Assertions
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::S3::Bucket', {
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [
        {
          ServerSideEncryptionByDefault: {
            SSEAlgorithm: "AES256"
          }
        }
      ]
    }
  });
});

// --------------------------------------------------------------
// Test property override
// --------------------------------------------------------------
test('Test property override', () => {
  const stack = new cdk.Stack();

  // create properties
  const props: EventbridgeToKinesisFirehoseToS3Props = {
    eventRuleProps: {
      description: 'event rule props',
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    },
    kinesisFirehoseProps: {
      extendedS3DestinationConfiguration: {
        bufferingHints: {
          intervalInSeconds: 600,
          sizeInMBs: 55
        },
      }
    },
    bucketProps: {
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: true,
        ignorePublicAcls: false,
        restrictPublicBuckets: true
      }
    }
  };
  new EventbridgeToKinesisFirehoseToS3(stack, 'test-eventbridge-firehose-s3', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::S3::Bucket", {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: false,
      BlockPublicPolicy: true,
      IgnorePublicAcls: false,
      RestrictPublicBuckets: true
    },
  });

  template.hasResourceProperties("AWS::KinesisFirehose::DeliveryStream", {
    ExtendedS3DestinationConfiguration: {
      BufferingHints: {
        IntervalInSeconds: 600,
        SizeInMBs: 55
      }
    }});
});

// --------------------------------------------------------------
// Test bad call with existingBucket and bucketProps
// --------------------------------------------------------------
test("Test bad call with existingBucket and bucketProps", () => {
  // Stack
  const stack = new cdk.Stack();

  const testBucket = new s3.Bucket(stack, 'test-bucket', {});

  const app = () => {
    // Helper declaration
    new EventbridgeToKinesisFirehoseToS3(stack, "bad-s3-args", {
      eventRuleProps: {
        description: 'event rule props',
        schedule: events.Schedule.rate(cdk.Duration.minutes(5))
      },
      existingBucketObj: testBucket,
      bucketProps: {
        removalPolicy: cdk.RemovalPolicy.DESTROY
      },
    });
  };
  // Assertion
  expect(app).toThrowError();
});

test('check eventbus property, snapshot & eventbus exists', () => {
  const stack = new cdk.Stack();

  const props: EventbridgeToKinesisFirehoseToS3Props = {
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    },
    eventBusProps: { eventBusName: 'test' }
  };
  const construct = new EventbridgeToKinesisFirehoseToS3(stack, 'test-eventbridge-kinesis-firehose-default-parameters', props);

  expect(construct.eventsRule !== null);
  expect(construct.eventsRole !== null);
  expect(construct.kinesisFirehose !== null);
  expect(construct.kinesisFirehoseRole !== null);
  expect(construct.kinesisFirehoseLogGroup !== null);
  expect(construct.s3Bucket !== null);
  expect(construct.s3LoggingBucket !== null);
  expect(construct.eventBus !== null);
  // Check whether eventbus exists
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Events::EventBus', 1);
});

test('check exception while passing existingEventBus & eventBusProps', () => {
  const stack = new cdk.Stack();

  const props: EventbridgeToKinesisFirehoseToS3Props = {
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    },
    eventBusProps: { eventBusName: 'test' },
    existingEventBusInterface: new events.EventBus(stack, `test-existing-eventbus`, { eventBusName: 'test' })
  };

  const app = () => {
    new EventbridgeToKinesisFirehoseToS3(stack, 'test-eventbridge-firehose', props);
  };
  expect(app).toThrowError();
});

test('check custom event bus resource with props when deploy:true', () => {
  const stack = new cdk.Stack();

  const props: EventbridgeToKinesisFirehoseToS3Props = {
    eventBusProps: {
      eventBusName: `testeventbus`
    },
    eventRuleProps: {
      eventPattern: {
        source: ['solutionsconstructs']
      }
    }
  };
  new EventbridgeToKinesisFirehoseToS3(stack, 'test-new-eventbridge-with-props-kinsesisfirehose', props);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Events::EventBus', {
    Name: `testeventbus`
  });
});

// --------------------------------------------------------------
// s3 bucket with bucket, loggingBucket, and auto delete objects
// --------------------------------------------------------------
test('s3 bucket with bucket, loggingBucket, and auto delete objects', () => {
  const stack = new cdk.Stack();

  new EventbridgeToKinesisFirehoseToS3(stack, 'kinsisfirehose-s3', {
    eventRuleProps: {
      description: 'event rule props',
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
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
      Ref: "kinsisfirehoses3KinesisFirehoseToS3S3LoggingBucket1CC9C6B7"
    }
  });
});

// --------------------------------------------------------------
// s3 bucket with one content bucket and no logging bucket
// --------------------------------------------------------------
test('s3 bucket with one content bucket and no logging bucket', () => {
  const stack = new cdk.Stack();

  new EventbridgeToKinesisFirehoseToS3(stack, 'kinsisfirehose-s3', {
    eventRuleProps: {
      description: 'event rule props',
      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
    },
    bucketProps: {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    },
    logS3AccessLogs: false
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::S3::Bucket", 1);
});