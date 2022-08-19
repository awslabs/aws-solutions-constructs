/**
 *  Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import {RemovalPolicy, Stack} from 'aws-cdk-lib';
import * as defaults from '../';
import {ResourcePart} from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';

const DESCRIPTION = 'test secret description';
const SECRET_NAME = 'test secret name';

// --------------------------------------------------------------
// Test minimal deployment with no properties
// --------------------------------------------------------------
test('Test minimal deployment with no properties', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  defaults.buildSecretsManagerSecret(stack, 'secret', {});

  expect(stack).toHaveResourceLike('AWS::SecretsManager::Secret', {
    Type: 'AWS::SecretsManager::Secret',
    UpdateReplacePolicy: 'Retain',
    DeletionPolicy: 'Retain'
  }, ResourcePart.CompleteDefinition);
});

// --------------------------------------------------------------
// Test deployment w/ custom properties
// --------------------------------------------------------------
test('Test deployment with custom properties', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  defaults.buildSecretsManagerSecret(stack, 'secret', {
    secretName: SECRET_NAME,
    description: DESCRIPTION,
    removalPolicy: RemovalPolicy.DESTROY,
  });
  // Assertion 1
  expect(stack).toHaveResourceLike('AWS::SecretsManager::Secret', {
    Type: 'AWS::SecretsManager::Secret',
    UpdateReplacePolicy: 'Delete',
    DeletionPolicy: 'Delete',
    Properties: {
      Name: SECRET_NAME,
      Description: DESCRIPTION
    }
  }, ResourcePart.CompleteDefinition);
});
