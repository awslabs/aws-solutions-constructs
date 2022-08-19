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

import { Stack, Duration } from 'aws-cdk-lib';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as defaults from '../index';
import { overrideProps } from '../lib/utils';
import '@aws-cdk/assert/jest';

test('test kinesisstream override RetentionPeriodHours', () => {
  const stack = new Stack();

  const defaultProps = defaults.DefaultStreamProps;

  const inProps: kinesis.StreamProps = {
    retentionPeriod: Duration.hours(48)
  };

  const outProps = overrideProps(defaultProps, inProps);

  new kinesis.Stream(stack, 'KinesisStream', outProps);

  expect(stack).toHaveResource("AWS::Kinesis::Stream", {
    RetentionPeriodHours: 48
  });
});