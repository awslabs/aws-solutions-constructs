/**
 *  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

 import * as cdk from '@aws-cdk/core';
 import { ExistingResources } from '../lib/existing-resources';
 import { SharedStack } from '../lib/shared-stack';
 import { ManagerStack } from '../lib/manager-stack';
 import { SynthUtils } from '@aws-cdk/assert';
 import '@aws-cdk/assert/jest';
 
 test('test-manager-stack', () => {
  const app = new cdk.App();
  // Dependent stacks
  const existingResources = new ExistingResources(app, `ExistingResourcesStack`);
  const sharedStack = new SharedStack(app, `SharedStack`);
  // ----
  const stack = new ManagerStack(app, 'ManagerStack', {
    db: sharedStack.database,
    archiveBucket: existingResources.archiveBucket,
    layer: sharedStack.layer
  });
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
 });