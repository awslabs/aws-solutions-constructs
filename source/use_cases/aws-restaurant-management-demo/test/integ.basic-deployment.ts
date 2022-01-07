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

// Imports
import * as cdk from '@aws-cdk/core';
import { ExistingResources } from '../lib/existing-resources';
import { SharedStack } from '../lib/shared-stack';
import { ServiceStaffStack } from '../lib/service-staff-stack';
import { KitchenStaffStack } from '../lib/kitchen-staff-stack';
import { ManagerStack } from '../lib/manager-stack';

// App
const app = new cdk.App();

// Stack containing shared resources across all functions
const existingResources = new ExistingResources(app, `ExistingResourcesStack`);

// Stack containing shared resources across all functions
const sharedStack = new SharedStack(app, `SharedStack`);

// Stack containing resources that enable Service Staff functions
new ServiceStaffStack(app, `ServiceStaffStack`, {
  db: sharedStack.database
});

// Stack containing resources that enable Kitchen Staff functions
new KitchenStaffStack(app, `KitchenStaffStack`, {
  db: sharedStack.database
});

// Stack containing resources that enable Manager functions
new ManagerStack(app, 'ManagerStack', {
  db: sharedStack.database,
  archiveBucket: existingResources.archiveBucket,
  layer: sharedStack.layer
});
