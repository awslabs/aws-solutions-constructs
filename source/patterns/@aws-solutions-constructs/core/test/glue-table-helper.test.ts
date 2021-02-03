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

import { SynthUtils } from '@aws-cdk/assert';
import { Stack } from '@aws-cdk/core';
import * as defaults from '../';

const _fieldSchema = [{
  name: "id",
  type: "int",
  comment: "Identifier for the record"
}, {
  name: "name",
  type: "string",
  comment: "The name of the record"
}, {
  name: "type",
  type: "string",
  comment: "The type of the record"
}, {
  name: "numericvalue",
  type: "int",
  comment: "Some value associated with the record"
}];

test('create default CfnTable', () => {
  const stack = new Stack();
  defaults.DefaultGlueTable(stack, defaults.DefaultGlueTableProps(defaults.DefaultGlueDatabase(stack, defaults.DefaultGlueDatabaseProps()),
    _fieldSchema, 'kinesis', {
      STREAM_NAME: 'testStream'
    }));

  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('error condition', () => {
  const stack = new Stack();
  try {
    const _database = defaults.DefaultGlueDatabase(stack, defaults.DefaultGlueDatabaseProps());
    defaults.DefaultGlueTable(_database, defaults.DefaultGlueTableProps(_database, _fieldSchema, 'SomeSource', {STREAM_NAME: 'somefakestream'}));
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
  }
});