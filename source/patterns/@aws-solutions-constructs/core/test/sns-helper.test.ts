/**
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { Stack } from "@aws-cdk/core";
import * as defaults from '../';
import { SynthUtils, expect as expectCDK, haveResource } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';

// --------------------------------------------------------------
// Test deployment with no properties using AWS Managed KMS Key
// --------------------------------------------------------------
test('Test deployment with no properties using AWS Managed KMS Key', () => {
    // Stack
    const stack = new Stack();
    // Helper declaration
    defaults.buildTopic(stack, {});
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    // Assertion 2
    expect(stack).toHaveResource("AWS::SNS::Topic", {
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
  defaults.buildTopic(stack, {
      topicProps: {
          topicName: "custom-topic"
      },
      enableEncryptionWithCustomerManagedKey: true
  });
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  // Assertion 2
  expect(stack).toHaveResource("AWS::SNS::Topic", {
      TopicName: "custom-topic"
  });
  // Assertion 3
  expect(stack).toHaveResource("AWS::KMS::Key", {
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
  const key = defaults.buildEncryptionKey(stack);
  // Helper declaration
  defaults.buildTopic(stack, {
      topicProps: {
          topicName: "custom-topic"
      },
      enableEncryptionWithCustomerManagedKey: true,
      encryptionKey: key
  });
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  // Assertion 2
  expect(stack).toHaveResource("AWS::SNS::Topic", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "EncryptionKey1B843E66",
        "Arn"
      ]
    },
    TopicName: "custom-topic"
  });
});

test('Check SNS Topic policy', () => {
    const stack = new Stack();
    defaults.buildTopic(stack, {});

    expectCDK(stack).to(haveResource("AWS::SNS::TopicPolicy", {
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
            Principal: "*",
            Resource: {
              Ref: "SnsTopic2C1570A4"
            },
            Sid: "HttpsOnly"
          }
        ],
        Version: "2012-10-17"
      },
    }));
  });