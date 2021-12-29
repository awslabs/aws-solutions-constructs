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

// Imports
import * as defaults from '../';

// Need 2 parts, but they can't overlap
// so we can explicitly find them in the results.
const parts = [ 'firstportionislong', 'secondsection'];
const nonAlphaParts = [ 'part-one', 'part-two'];

// --------------------------------------------------------------
// Test with a truncated part
// --------------------------------------------------------------
test('Test with a truncated part', () => {
  const result = defaults.generateResourceName(parts, 38);

  expect(result).toContain(parts[1]);
  expect(result).not.toContain(parts[0]);
  expect(result).toContain(parts[0].slice(0, 13));

});

// --------------------------------------------------------------
// Test with no truncated parts
// --------------------------------------------------------------
test('Test with no truncated parts', () => {
  const result = defaults.generateResourceName(parts, 100);

  expect(result).toContain(parts[1]);
  expect(result).toContain(parts[0]);
  expect(result.length).toEqual(parts[0].length + parts[1].length + 12);
});

// --------------------------------------------------------------
// Test with non Aphanumeric
// --------------------------------------------------------------
test('Test with non Aphanumeric', () => {
  const result = defaults.generateResourceName(nonAlphaParts, 100);

  expect(result).toContain('partoneparttwo');
});

// --------------------------------------------------------------
// Test generateIntegStackName
// --------------------------------------------------------------
test('Test generateIntegStackName', () => {
  const result = defaults.generateIntegStackName('integ.apigateway-dynamodb-CRUD.js');
  expect(result).toContain('apigateway-dynamodb-CRUD');

  const result1 = defaults.generateIntegStackName('integ.override_auth_api_keys.ts');
  expect(result1).toContain('override-auth-api-keys');
});

test('Test consolidate props with all args', () => {
  const arg1 = {
    val1: 11,
    val2: 12,
    val3: 13,
  };

  const arg2 = {
    val1: 21,
    val2: 22,
  };

  const arg3 = {
    val1: 31,
  };

  const result = defaults.consolidateProps(arg1, arg2, arg3);

  expect(result).toEqual({
    val1: 31,
    val2: 22,
    val3: 13,
  });

});

test('Test consolidate props with first and third args', () => {
  const arg1 = {
    val1: 11,
    val2: 12,
    val3: 13,
  };

  const arg3 = {
    val1: 31,
  };

  const result = defaults.consolidateProps(arg1, undefined, arg3);

  expect(result).toEqual({
    val1: 31,
    val2: 12,
    val3: 13,
  });

});

test('Test consolidate props with first and second args', () => {
  const arg1 = {
    val1: 11,
    val2: 12,
    val3: 13,
  };

  const arg2 = {
    val1: 21,
    val2: 22,
  };

  const result = defaults.consolidateProps(arg1, arg2);

  expect(result).toEqual({
    val1: 21,
    val2: 22,
    val3: 13,
  });

});

test('Test consolidate props with one arg', () => {
  const arg1 = {
    val1: 11,
    val2: 12,
    val3: 13,
  };

  const result = defaults.consolidateProps(arg1);

  expect(result).toEqual(arg1);

});