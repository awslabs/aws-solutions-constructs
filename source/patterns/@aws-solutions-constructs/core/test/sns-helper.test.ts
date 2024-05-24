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

// Imports
import { Stack } from "aws-cdk-lib";
import * as defaults from '../';
import { Template } from 'aws-cdk-lib/assertions';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as sns from 'aws-cdk-lib/aws-sns';
import { expectKmsKeyAttachedToCorrectResource } from "../";

// --------------------------------------------------------------
// Test deployment with no properties using AWS Managed KMS Key
// --------------------------------------------------------------
test('Test deployment with no properties using AWS Managed KMS Key', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const buildTopicResponse = defaults.buildTopic(stack, 'test', {});

  expect(buildTopicResponse.topic).toBeDefined();
  expect(buildTopicResponse.key).toBeDefined();
  Template.fromStack(stack).hasResourceProperties("AWS::SNS::Topic", {
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

// --------------------------------------------------------------
// Test deployment without imported encryption key
// --------------------------------------------------------------
test('Test deployment without imported encryption key', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  defaults.buildTopic(stack, 'test', {
    topicProps: {
      topicName: "custom-topic"
    },
    enableEncryptionWithCustomerManagedKey: true
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SNS::Topic", {
    TopicName: "custom-topic"
  });
  // Assertion 3
  template.hasResourceProperties("AWS::KMS::Key", {
    EnableKeyRotation: true
  });
});

// --------------------------------------------------------------
// Test deployment w/ imported encryption key
// --------------------------------------------------------------
test('Test deployment w/ imported encryption key', () => {
  // Stack
  const stack = new Stack();
  // Generate KMS Key
  const key = defaults.buildEncryptionKey(stack, 'key-test');
  // Helper declaration
  const buildTopicResponse = defaults.buildTopic(stack, 'test', {
    topicProps: {
      topicName: "custom-topic"
    },
    enableEncryptionWithCustomerManagedKey: true,
    encryptionKey: key
  });

  expect(buildTopicResponse.topic).toBeDefined();
  expect(buildTopicResponse.key).toBeDefined();

  Template.fromStack(stack).hasResourceProperties("AWS::SNS::Topic", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "keytestKey8AE2FF0A",
        "Arn"
      ]
    },
    TopicName: "custom-topic"
  });
});

test('enableEncryptionWithCustomerManagedKey flag is ignored when encryptionKey is set', () => {
  const stack = new Stack();
  defaults.buildTopic(stack, 'test', {
    enableEncryptionWithCustomerManagedKey: false,
    encryptionKey: defaults.buildEncryptionKey(stack, 'key-test')
  });

  Template.fromStack(stack).hasResourceProperties("AWS::SNS::Topic", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "keytestKey8AE2FF0A",
        "Arn"
      ]
    }
  });
});

test('enableEncryptionWithCustomerManagedKey flag is ignored when topicProps.masterKey is set', () => {
  const stack = new Stack();
  defaults.buildTopic(stack, 'test', {
    enableEncryptionWithCustomerManagedKey: false,
    topicProps: {
      masterKey: defaults.buildEncryptionKey(stack, 'key-test')
    }
  });

  Template.fromStack(stack).hasResourceProperties("AWS::SNS::Topic", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "keytestKey8AE2FF0A",
        "Arn"
      ]
    }
  });
});

test('enableEncryptionWithCustomerManagedKey flag is ignored when encryptionKeyProps is set', () => {
  const stack = new Stack();
  const description = "custom description";
  defaults.buildTopic(stack, 'test', {
    enableEncryptionWithCustomerManagedKey: false,
    encryptionKeyProps: {
      description
    },
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SNS::Topic", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "testKey2C00E5E5",
        "Arn"
      ]
    }
  });

  template.hasResourceProperties("AWS::KMS::Key", {
    Description: description
  });
});

test('encryptionProps are set correctly on the SNS Topic', () => {
  const stack = new Stack();
  const description = "custom description";
  defaults.buildTopic(stack, 'test', {
    encryptionKeyProps: {
      description
    }
  });

  Template.fromStack(stack).hasResourceProperties("AWS::KMS::Key", {
    Description: description
  });
});

test('Check SNS Topic policy', () => {
  const stack = new Stack();
  defaults.buildTopic(stack, 'test', {});

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::SNS::TopicPolicy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "SNS:Publish",
            "SNS:RemovePermission",
            "SNS:SetTopicAttributes",
            "SNS:DeleteTopic",
            "SNS:ListSubscriptionsByTopic",
            "SNS:GetTopicAttributes",
            "SNS:Receive",
            "SNS:AddPermission",
            "SNS:Subscribe"
          ],
          Condition: {
            StringEquals: {
              "AWS:SourceOwner": {
                Ref: "AWS::AccountId"
              }
            }
          },
          Effect: "Allow",
          Principal: {
            AWS: {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition"
                  },
                  ":iam::",
                  {
                    Ref: "AWS::AccountId"
                  },
                  ":root"
                ]
              ]
            }
          },
          Resource: {
            Ref: "SnsTopic2C1570A4"
          },
          Sid: "TopicOwnerOnlyAccess"
        },
        {
          Action: [
            "SNS:Publish",
            "SNS:RemovePermission",
            "SNS:SetTopicAttributes",
            "SNS:DeleteTopic",
            "SNS:ListSubscriptionsByTopic",
            "SNS:GetTopicAttributes",
            "SNS:Receive",
            "SNS:AddPermission",
            "SNS:Subscribe"
          ],
          Condition: {
            Bool: {
              "aws:SecureTransport": "false"
            }
          },
          Effect: "Deny",
          Principal: {
            AWS: "*"
          },
          Resource: {
            Ref: "SnsTopic2C1570A4"
          },
          Sid: "HttpsOnly"
        }
      ],
      Version: "2012-10-17"
    },
  });
});

test('existing topic encrypted with CMK is not overridden by defaults', () => {
  const stack = new Stack();

  const cmk = new kms.Key(stack, 'Key', {
    description: 'new-key-description'
  });

  const topic = new sns.Topic(stack, 'Topic', {
    masterKey: cmk
  });

  defaults.buildTopic(stack, 'test', {
    existingTopicObj: topic,
    existingTopicEncryptionKey: cmk
  });

  expectKmsKeyAttachedToCorrectResource(stack, 'AWS::SNS::Topic', 'new-key-description');

  // Make sure the construct did not create any other topics or keys created
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::KMS::Key', 1);
  template.resourceCountIs('AWS::SNS::Topic', 1);
});

test('existing unencrypted topic is not overridden with defaults', () => {
  const stack = new Stack();

  const topic = new sns.Topic(stack, 'Topic');

  const buildBuildTopicResponse = defaults.buildTopic(stack, 'test', {
    existingTopicObj: topic,
  });

  expect(buildBuildTopicResponse.topic).toBeDefined();
  expect(buildBuildTopicResponse.key).not.toBeDefined();
  // Make sure the construct did not create any other topics and that no keys exist
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::KMS::Key', 0);
  template.resourceCountIs('AWS::SNS::Topic', 1);
});

// ---------------------------
// Prop Tests
// ---------------------------
test('Test fail SNS topic check', () => {
  const stack = new Stack();

  const props: defaults.SnsProps = {
    topicProps: {},
    existingTopicObj: new sns.Topic(stack, 'placeholder', {})
  };

  const app = () => {
    defaults.CheckSnsProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide topicProps or existingTopicObj, but not both.\n');
});

test('Test fail SNS topic check with bad topic attribute name', () => {
  const stack = new Stack();

  const props: defaults.SnsProps = {
    topicProps: {},
    existingTopicObj: new sns.Topic(stack, 'placeholder', {})
  };

  const app = () => {
    defaults.CheckSnsProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide topicProps or existingTopicObj, but not both.\n');
});

test('Test fail SNS topic check when both encryptionKey and encryptionKeyProps are specified', () => {
  const stack = new Stack();

  const props: defaults.SnsProps = {
    encryptionKey: new kms.Key(stack, 'key'),
    encryptionKeyProps: {
      description: 'a description'
    }
  };

  const app = () => {
    defaults.CheckSnsProps(props);
  };

  expect(app).toThrowError('Error - Either provide encryptionKey or encryptionKeyProps, but not both.\n');
});

test('Test fail SNS topic check when both topicProps.masterKey and encryptionKeyProps are specified', () => {
  const stack = new Stack();

  const props: defaults.SnsProps = {
    topicProps: {
      masterKey: new kms.Key(stack, 'key')
    },
    encryptionKeyProps: {
      description: 'a description'
    }
  };

  const app = () => {
    defaults.CheckSnsProps(props);
  };

  expect(app).toThrowError('Error - Either provide topicProps.masterKey or encryptionKeyProps, but not both.\n');
});

test('Test fail SNS topic check when both encryptionKey and topicProps.masterKey are specified', () => {
  const stack = new Stack();

  const props: defaults.SnsProps = {
    encryptionKey: new kms.Key(stack, 'key'),
    topicProps: {
      masterKey: new kms.Key(stack, 'otherkey')
    }
  };

  const app = () => {
    defaults.CheckSnsProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide topicProps.masterKey or encryptionKey, but not both.\n');
});

test('Test fail encryption key check', () => {
  const stack = new Stack();

  const key = defaults.buildEncryptionKey(stack, 'key-test', {
    enableKeyRotation: false
  });

  const props: defaults.SnsProps = {
    encryptionKey: key,
    encryptionKeyProps: {},
  };

  const app = () => {
    defaults.CheckSnsProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide encryptionKey or encryptionKeyProps, but not both.\n');
});
