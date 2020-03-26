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
import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';

// --------------------------------------------------------------
// Test deployment with no properties
// --------------------------------------------------------------
test('Test deployment with no properties', () => {
    // Stack
    const stack = new Stack();
    // Helper declaration
    defaults.buildTopic(stack);
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test deployment w/ custom properties
// --------------------------------------------------------------
test('Test deployment w/ custom properties', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  defaults.buildTopic(stack, {
      topicProps: {
          topicName: "custom-topic"
      },
      enableEncryption: true
  });
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  // Assertion 2
  expect(stack).toHaveResource("AWS::SNS::Topic", {
      TopicName: "custom-topic"
  });
});

// --------------------------------------------------------------
// Test deployment w/ imported encryption key
// --------------------------------------------------------------
test('Test deployment w/ imported encryption key', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  defaults.buildTopic(stack, {
      topicProps: {
          topicName: "custom-topic"
      },
      enableEncryption: true,
      encryptionKey: defaults.buildEncryptionKey(stack)
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