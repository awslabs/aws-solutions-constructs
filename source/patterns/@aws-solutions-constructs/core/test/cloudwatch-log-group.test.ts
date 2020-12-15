/**
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import { SynthUtils } from '@aws-cdk/assert';
import { Stack } from '@aws-cdk/core';
import * as defaults from '../index';
import '@aws-cdk/assert/jest';
import * as logs from '@aws-cdk/aws-logs';

test('cw log group with default params', () => {
  const stack = new Stack();
  new logs.LogGroup(stack, 'test-cw-logs-default', defaults.DefaultLogGroupProps());
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('cw log group with log group name', () => {
  const stack = new Stack();
  new logs.LogGroup(stack, 'test-cw-logs-default', defaults.DefaultLogGroupProps('lambda-log-group'));
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});