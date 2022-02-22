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

 import * as cdk from '@aws-cdk/core';
 import { SharedStack } from '../lib/shared-stack';
 import { SynthUtils } from '@aws-cdk/assert';
 import '@aws-cdk/assert/jest';
 
 // Environment configuration
 const config = { 
   env: {
     account: 'ACCOUNT_NUMBER_HERE', 
     region: 'us-east-1' // default region selection
   }
 };
 
 test('test-shared-stack', () => {
   const app = new cdk.App();
   const stack = new SharedStack(app, `SharedStack`, config);
   expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
 });