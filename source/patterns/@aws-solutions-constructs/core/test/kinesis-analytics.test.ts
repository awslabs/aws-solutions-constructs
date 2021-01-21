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
import * as kinesisanalytics from '@aws-cdk/aws-kinesisanalytics';
import * as defaults from '../index';
import { overrideProps } from '../lib/utils';
import '@aws-cdk/assert/jest';

test('snapshot test kinesisanalytics default params', () => {
  const stack = new Stack();
  new kinesisanalytics.CfnApplication(stack, 'KinesisAnalytics', defaults.DefaultCfnApplicationProps);
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('test kinesisanalytics override inputProperty', () => {
  const stack = new Stack();

  const inputProperty: kinesisanalytics.CfnApplication.InputProperty = {
    inputSchema: {
      recordColumns: [{name: 'x', sqlType: 'y'}],
      recordFormat: { recordFormatType: 'csv' }
    },
    namePrefix: 'zzz'
  };

  const defaultProps: kinesisanalytics.CfnApplicationProps = defaults.DefaultCfnApplicationProps;

  const inProps: kinesisanalytics.CfnApplicationProps = {
    inputs: [inputProperty]
  };

  const outProps = overrideProps(defaultProps, inProps);

  new kinesisanalytics.CfnApplication(stack, 'KinesisAnalytics', outProps);

  expect(stack).toHaveResource("AWS::KinesisAnalytics::Application", {
    Inputs: [
      {
        InputSchema: {
          RecordColumns: [
            {
              Name: "x",
              SqlType: "y"
            }
          ],
          RecordFormat: {
            RecordFormatType: "csv"
          }
        },
        NamePrefix: "zzz"
      }
    ]
  });
});