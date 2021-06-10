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

import {Stack} from '@aws-cdk/core';
import * as defaults from '../';
import {SynthUtils} from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import {ParameterType} from '@aws-cdk/aws-ssm';

// --------------------------------------------------------------
// Test minimal deployment with no properties
// --------------------------------------------------------------
test('Test minimal deployment with required properties', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const parameterValue = "test-val";
  defaults.buildSsmStringParameter(stack, 'parameterName', {stringValue: parameterValue});
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  // Assertion 2
  expect(stack).toHaveResourceLike('AWS::SSM::Parameter', {
    Type: 'String',
    Value: parameterValue
  });
});

// --------------------------------------------------------------
// Test minimal deployment overriding parameter type
// --------------------------------------------------------------
test('Test minimal deployment with required properties', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  const parameterValue = "test-val";
  defaults.buildSsmStringParameter(stack, 'parameterName',
    {
      stringValue: parameterValue,
      type: ParameterType.STRING_LIST,
    });
  // Assertion 1
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  // Assertion 2
  expect(stack).toHaveResourceLike('AWS::SSM::Parameter', {
    Type: 'String',
    Value: parameterValue
  });
});
