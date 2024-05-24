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

// --------------------------------------------------------------
// Test minimal deployment with no properties
// --------------------------------------------------------------
test('Test minimal deployment with no properties', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  defaults.buildEncryptionKey(stack, 'key-test');

  Template.fromStack(stack).hasResource('AWS::KMS::Key', {
    Type: "AWS::KMS::Key",
    Properties: {
      EnableKeyRotation: true
    }
  });
});

// --------------------------------------------------------------
// Test deployment w/ custom properties
// --------------------------------------------------------------
test('Test minimal deployment with custom properties', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  defaults.buildEncryptionKey(stack, 'key-test', {
    enableKeyRotation: false
  });

  Template.fromStack(stack).hasResource('AWS::KMS::Key', {
    Type: "AWS::KMS::Key",
    Properties: {
      EnableKeyRotation: false
    }
  });
});