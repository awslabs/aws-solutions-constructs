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

// =============================================
// Test ConfigurePollySupport()
// =============================================

test('Test deployment with asyncJobs enabled', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const configuration = defaults.ConfigurePollySupport(stack, 'test', { asyncJobs: true });

  expect(configuration.destinationBucket).toBeDefined();
  expect(configuration.destinationBucket?.bucket).toBeDefined();
  expect(configuration.destinationBucket?.bucketInterface).toBeDefined();
  expect(configuration.destinationBucket?.loggingBucket).toBeDefined();
  expect(configuration.snsNotificationTopic).toBeDefined();
  expect(configuration.notificationTopicEncryptionKey).toBeDefined();

  expect(configuration.lambdaIamActionsRequired).toEqual(expect.arrayContaining([
    'polly:SynthesizeSpeech',
    'polly:StartSpeechSynthesisTask',
    'polly:GetSpeechSynthesisTask',
    'polly:ListSpeechSynthesisTasks'
  ]));
  expect(configuration.lambdaIamActionsRequired).toHaveLength(4);

  // Check environment variables
  expect(configuration.environmentVariables).toHaveLength(2);
  expect(configuration.environmentVariables[0].defaultName).toBe('OUTPUT_BUCKET_NAME');
  expect(configuration.environmentVariables[0].value).toBe(configuration.destinationBucket!.bucketInterface.bucketName);
  expect(configuration.environmentVariables[1].defaultName).toBe('SNS_TOPIC_ARN');
  expect(configuration.environmentVariables[1].value).toBe(configuration.snsNotificationTopic!.topicArn);

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::S3::Bucket', 2); // 1 main bucket + 1 logging bucket
  template.resourceCountIs('AWS::SNS::Topic', 1); // SNS topic for async job notifications
});

test('Test deployment without asyncJobs enabled', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const configuration = defaults.ConfigurePollySupport(stack, 'test', {});

  expect(configuration.destinationBucket).not.toBeDefined();
  expect(configuration.snsNotificationTopic).not.toBeDefined();
  expect(configuration.notificationTopicEncryptionKey).not.toBeDefined();
  expect(configuration.lambdaIamActionsRequired).toEqual(expect.arrayContaining([
    'polly:SynthesizeSpeech'
  ]));
  expect(configuration.lambdaIamActionsRequired).toHaveLength(1);
  expect(configuration.environmentVariables).toHaveLength(0);

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::SNS::Topic', 0);
  template.resourceCountIs('AWS::S3::Bucket', 0);
});

test('Test deployment with asyncJobs false', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const configuration = defaults.ConfigurePollySupport(stack, 'test', { asyncJobs: false });

  expect(configuration.destinationBucket).not.toBeDefined();
  expect(configuration.snsNotificationTopic).not.toBeDefined();
  expect(configuration.notificationTopicEncryptionKey).not.toBeDefined();
  expect(configuration.lambdaIamActionsRequired).toEqual(expect.arrayContaining([
    'polly:SynthesizeSpeech'
  ]));
  expect(configuration.lambdaIamActionsRequired).toHaveLength(1);
  expect(configuration.environmentVariables).toHaveLength(0);

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::SNS::Topic', 0);
  template.resourceCountIs('AWS::S3::Bucket', 0);
});

test('Test deployment with existing bucket', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const existingBucket = CreateScrapBucket(stack, "scrap", {});
  const configuration = defaults.ConfigurePollySupport(stack, 'test', {
    asyncJobs: true,
    existingBucketObj: existingBucket
  });

  expect(configuration.destinationBucket).toBeDefined();
  expect(configuration.destinationBucket?.bucket).not.toBeDefined();
  expect(configuration.destinationBucket?.bucketInterface).toBeDefined();
  expect(configuration.destinationBucket?.loggingBucket).not.toBeDefined();
  expect(configuration.destinationBucket?.bucketInterface).toBe(existingBucket);
  expect(configuration.snsNotificationTopic).toBeDefined();

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::S3::Bucket', 2); // existing bucket + 1 new bucket (scrap bucket)
});

test('Test deployment with existing topic', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const existingTopic = defaults.buildTopic(stack, 'existing-topic', {
    topicProps: {
      topicName: 'pre-existing-topic'
    }
  }).topic;

  const configuration = defaults.ConfigurePollySupport(stack, 'test', {
    asyncJobs: true,
    existingTopicObj: existingTopic
  });

  expect(configuration.snsNotificationTopic).toBeDefined();
  expect(configuration.snsNotificationTopic).toBe(existingTopic);
  expect(configuration.destinationBucket).toBeDefined();

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::SNS::Topic', 1);
  template.hasResourceProperties('AWS::SNS::Topic', {
    TopicName: 'pre-existing-topic'
  });
});

test('Test deployment with custom bucket props', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  defaults.ConfigurePollySupport(stack, 'test', {
    asyncJobs: true,
    bucketProps: {
      bucketName: "custom-polly-bucket"
    },
    loggingBucketProps: {
      bucketName: "custom-logging-bucket"
    }
  });

  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::S3::Bucket", 2);
  template.hasResourceProperties("AWS::S3::Bucket", {
    BucketName: "custom-polly-bucket",
    LoggingConfiguration: {
      DestinationBucketName: {
        Ref: Match.stringLikeRegexp("testoutputbucketS3LoggingBucket.*")
      }
    }
  });
  template.hasResourceProperties("AWS::S3::Bucket", {
    BucketName: "custom-logging-bucket",
    AccessControl: "LogDeliveryWrite"
  });
});

test('Test deployment with custom topic props', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  defaults.ConfigurePollySupport(stack, 'test', {
    asyncJobs: true,
    topicProps: {
      topicName: 'custom-polly-topic',
      displayName: 'Custom Polly Notifications'
    }
  });

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::SNS::Topic', 1);
  template.hasResourceProperties('AWS::SNS::Topic', {
    TopicName: 'custom-polly-topic',
    DisplayName: 'Custom Polly Notifications'
  });
});

test('Test environment variable generation with default names', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const configuration = defaults.ConfigurePollySupport(stack, 'test', { asyncJobs: true });

  expect(configuration.environmentVariables).toHaveLength(2);
  
  const bucketEnvVar = configuration.environmentVariables.find(v => v.defaultName === 'OUTPUT_BUCKET_NAME');
  expect(bucketEnvVar).toBeDefined();
  expect(bucketEnvVar?.clientNameOverride).toBeUndefined();
  expect(bucketEnvVar?.value).toBe(configuration.destinationBucket!.bucketInterface.bucketName);

  const topicEnvVar = configuration.environmentVariables.find(v => v.defaultName === 'SNS_TOPIC_ARN');
  expect(topicEnvVar).toBeDefined();
  expect(topicEnvVar?.clientNameOverride).toBeUndefined();
  expect(topicEnvVar?.value).toBe(configuration.snsNotificationTopic!.topicArn);
});

test('Test environment variable generation with custom names', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const configuration = defaults.ConfigurePollySupport(stack, 'test', {
    asyncJobs: true,
    bucketEnvironmentVariableName: 'MY_CUSTOM_BUCKET',
    topicEnvironmentVariableName: 'MY_CUSTOM_TOPIC'
  });

  expect(configuration.environmentVariables).toHaveLength(2);
  
  const bucketEnvVar = configuration.environmentVariables.find(v => v.defaultName === 'OUTPUT_BUCKET_NAME');
  expect(bucketEnvVar).toBeDefined();
  expect(bucketEnvVar?.clientNameOverride).toBe('MY_CUSTOM_BUCKET');
  expect(bucketEnvVar?.value).toBe(configuration.destinationBucket!.bucketInterface.bucketName);

  const topicEnvVar = configuration.environmentVariables.find(v => v.defaultName === 'SNS_TOPIC_ARN');
  expect(topicEnvVar).toBeDefined();
  expect(topicEnvVar?.clientNameOverride).toBe('MY_CUSTOM_TOPIC');
  expect(topicEnvVar?.value).toBe(configuration.snsNotificationTopic!.topicArn);
});

test('Test SNS topic encryption with AWS managed key', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const configuration = defaults.ConfigurePollySupport(stack, 'test', { asyncJobs: true });

  expect(configuration.snsNotificationTopic).toBeDefined();
  expect(configuration.notificationTopicEncryptionKey).toBeDefined();

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::SNS::Topic', 1);

  // Verify SNS topic has encryption enabled with AWS managed key
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

test('Test SNS topic encryption with customer managed key', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const configuration = defaults.ConfigurePollySupport(stack, 'test', {
    asyncJobs: true,
    enableTopicEncryptionWithCustomerManagedKey: true
  });

  expect(configuration.snsNotificationTopic).toBeDefined();
  expect(configuration.notificationTopicEncryptionKey).toBeDefined();

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::SNS::Topic', 1);
  template.resourceCountIs('AWS::KMS::Key', 1);
});

test('Test SNS topic encryption with custom key props', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const customKey = defaults.buildEncryptionKey(stack, 'custom-key', {
    description: 'Custom encryption key for Polly SNS topic'
  });

  const configuration = defaults.ConfigurePollySupport(stack, 'test', {
    asyncJobs: true,
    topicEncryptionKey: customKey
  });

  expect(configuration.snsNotificationTopic).toBeDefined();
  expect(configuration.notificationTopicEncryptionKey).toBe(customKey);

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::KMS::Key', 1);
  template.hasResourceProperties('AWS::KMS::Key', {
    Description: 'Custom encryption key for Polly SNS topic'
  });
});

test('Test IAM action list for synchronous mode', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const configuration = defaults.ConfigurePollySupport(stack, 'test', {});

  expect(configuration.lambdaIamActionsRequired).toEqual(['polly:SynthesizeSpeech']);
});

test('Test IAM action list for asynchronous mode', () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");

  const configuration = defaults.ConfigurePollySupport(stack, 'test', { asyncJobs: true });

  expect(configuration.lambdaIamActionsRequired).toEqual([
    'polly:SynthesizeSpeech',
    'polly:StartSpeechSynthesisTask',
    'polly:GetSpeechSynthesisTask',
    'polly:ListSpeechSynthesisTasks'
  ]);
});

// =============================================
// Test CheckPollyProps()
// =============================================

test("CheckPollyProps with valid asyncJobs true", () => {
  const props = {
    asyncJobs: true,
    bucketProps: {}
  };

  expect(() => {
    defaults.CheckPollyProps(props);
  }).not.toThrow();
});

test("CheckPollyProps with valid asyncJobs false", () => {
  const props = {
    asyncJobs: false
  };

  expect(() => {
    defaults.CheckPollyProps(props);
  }).not.toThrow();
});

test("CheckPollyProps throws error when asyncJobs is false and existingBucketObj is provided", () => {
  const stack = new Stack();
  const props = {
    asyncJobs: false,
    existingBucketObj: CreateScrapBucket(stack, "testbucket")
  };

  expect(() => {
    defaults.CheckPollyProps(props);
  }).toThrow('Error - Bucket properties can only be provided when asyncJobs is true.');
});

test("CheckPollyProps throws error when asyncJobs is false and bucketProps is provided", () => {
  const props = {
    asyncJobs: false,
    bucketProps: {}
  };

  expect(() => {
    defaults.CheckPollyProps(props);
  }).toThrow('Error - Bucket properties can only be provided when asyncJobs is true.');
});

test("CheckPollyProps throws error when asyncJobs is false and loggingBucketProps is provided", () => {
  const props = {
    asyncJobs: false,
    loggingBucketProps: {}
  };

  expect(() => {
    defaults.CheckPollyProps(props);
  }).toThrow('Error - Bucket properties can only be provided when asyncJobs is true.');
});

test("CheckPollyProps throws error when asyncJobs is false and logS3AccessLogs is provided", () => {
  const props = {
    asyncJobs: false,
    logS3AccessLogs: true
  };

  expect(() => {
    defaults.CheckPollyProps(props);
  }).toThrow('Error - Bucket properties can only be provided when asyncJobs is true.');
});

test("CheckPollyProps throws error when asyncJobs is false and bucketEnvironmentVariableName is provided", () => {
  const props = {
    asyncJobs: false,
    bucketEnvironmentVariableName: 'MY_BUCKET'
  };

  expect(() => {
    defaults.CheckPollyProps(props);
  }).toThrow('Error - Bucket properties can only be provided when asyncJobs is true.');
});

test("CheckPollyProps throws error when asyncJobs is false and existingTopicObj is provided", () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");
  const topic = defaults.buildTopic(stack, 'test-topic', {}).topic;

  const props = {
    asyncJobs: false,
    existingTopicObj: topic
  };

  expect(() => {
    defaults.CheckPollyProps(props);
  }).toThrow('Error - Topic properties can only be provided when asyncJobs is true.');
});

test("CheckPollyProps throws error when asyncJobs is false and topicProps is provided", () => {
  const props = {
    asyncJobs: false,
    topicProps: {}
  };

  expect(() => {
    defaults.CheckPollyProps(props);
  }).toThrow('Error - Topic properties can only be provided when asyncJobs is true.');
});

test("CheckPollyProps throws error when asyncJobs is false and existingTopicEncryptionKey is provided", () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");
  const key = defaults.buildEncryptionKey(stack, 'test-key');

  const props: defaults.PollyProps = {
    asyncJobs: false,
    existingTopicEncryptionKey: key
  };

  expect(() => {
    defaults.CheckPollyProps(props);
  }).toThrow('Error - Topic properties can only be provided when asyncJobs is true.');
});

test("CheckPollyProps throws error when asyncJobs is false and topicEncryptionKey is provided", () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");
  const key = defaults.buildEncryptionKey(stack, 'test-key');

  const props: defaults.PollyProps = {
    asyncJobs: false,
    topicEncryptionKey: key
  };

  expect(() => {
    defaults.CheckPollyProps(props);
  }).toThrow('Error - Topic properties can only be provided when asyncJobs is true.');
});

test("CheckPollyProps throws error when asyncJobs is false and topicEncryptionKeyProps is provided", () => {
  const props: defaults.PollyProps = {
    asyncJobs: false,
    topicEncryptionKeyProps: {}
  };

  expect(() => {
    defaults.CheckPollyProps(props);
  }).toThrow('Error - Topic properties can only be provided when asyncJobs is true.');
});

test("CheckPollyProps throws error when asyncJobs is false and enableTopicEncryptionWithCustomerManagedKey is provided", () => {
  const props = {
    asyncJobs: false,
    enableTopicEncryptionWithCustomerManagedKey: true
  };

  expect(() => {
    defaults.CheckPollyProps(props);
  }).toThrow('Error - Topic properties can only be provided when asyncJobs is true.');
});

test("CheckPollyProps throws error when asyncJobs is false and topicEnvironmentVariableName is provided", () => {
  const props = {
    asyncJobs: false,
    topicEnvironmentVariableName: 'MY_TOPIC'
  };

  expect(() => {
    defaults.CheckPollyProps(props);
  }).toThrow('Error - Topic properties can only be provided when asyncJobs is true.');
});

test("CheckPollyProps throws error when asyncJobs is true and both existingBucketObj and bucketProps are provided", () => {
  const stack = new Stack();
  const props = {
    asyncJobs: true,
    existingBucketObj: CreateScrapBucket(stack, "testbucket"),
    bucketProps: {}
  };

  expect(() => {
    defaults.CheckPollyProps(props);
  }).toThrow('Error - Either provide bucketProps or existingBucketObj, but not both.');
});

test("CheckPollyProps throws error when asyncJobs is true and both existingTopicObj and topicProps are provided", () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");
  const topic = defaults.buildTopic(stack, 'test-topic', {}).topic;

  const props = {
    asyncJobs: true,
    existingTopicObj: topic,
    topicProps: {}
  };

  expect(() => {
    defaults.CheckPollyProps(props);
  }).toThrow('Error - Either provide topicProps or existingTopicObj, but not both.');
});

test("CheckPollyProps throws error when topicProps.masterKey and topicEncryptionKey are both provided", () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");
  const key = defaults.buildEncryptionKey(stack, 'test-key');

  const props: defaults.PollyProps = {
    asyncJobs: true,
    topicProps: {
      masterKey: key
    },
    topicEncryptionKey: key
  };

  expect(() => {
    defaults.CheckPollyProps(props);
  }).toThrow('Error - Either provide topicProps.masterKey or topicEncryptionKey, but not both.');
});

test("CheckPollyProps throws error when topicProps.masterKey and topicEncryptionKeyProps are both provided", () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");
  const key = defaults.buildEncryptionKey(stack, 'test-key');

  const props: defaults.PollyProps = {
    asyncJobs: true,
    topicProps: {
      masterKey: key
    },
    topicEncryptionKeyProps: {}
  };

  expect(() => {
    defaults.CheckPollyProps(props);
  }).toThrow('Error - Either provide topicProps.masterKey or topicEncryptionKeyProps, but not both.');
});

test("CheckPollyProps throws error when topicEncryptionKey and topicEncryptionKeyProps are both provided", () => {
  const app = new App();
  const stack = new Stack(app, "test-stack");
  const key = defaults.buildEncryptionKey(stack, 'test-key');

  const props: defaults.PollyProps = {
    asyncJobs: true,
    topicEncryptionKey: key,
    topicEncryptionKeyProps: {}
  };

  expect(() => {
    defaults.CheckPollyProps(props);
  }).toThrow('Error - Either provide topicEncryptionKey or topicEncryptionKeyProps, but not both.');
});

test("CheckPollyProps accepts all valid asyncJobs true properties", () => {
  const props = {
    asyncJobs: true,
    bucketProps: {},
    loggingBucketProps: {},
    logS3AccessLogs: true,
    bucketEnvironmentVariableName: 'MY_BUCKET',
    topicProps: {},
    topicEnvironmentVariableName: 'MY_TOPIC',
    enableTopicEncryptionWithCustomerManagedKey: true
  };

  expect(() => {
    defaults.CheckPollyProps(props);
  }).not.toThrow();
});
