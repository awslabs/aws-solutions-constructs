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

import { ResourcePart, SynthUtils } from '@aws-cdk/assert';
import { Stack } from '@aws-cdk/core';
import '@aws-cdk/assert/jest';
import * as logs from '@aws-cdk/aws-logs';
import { buildLogGroup } from '../lib/cloudwatch-log-group-helper';
import * as kms from '@aws-cdk/aws-kms';

test('cw log group with default params', () => {
  const stack = new Stack();
  buildLogGroup(stack);
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('override cw log group props with encryptionKey and retention period', () => {
  const stack = new Stack();

  const key = new kms.Key(stack, 'mykey');

  buildLogGroup(stack, 'test-cw-logs-default', {
    encryptionKey: key,
    retention: logs.RetentionDays.FIVE_DAYS
  });
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('override cw log group props with encryptionKey only', () => {
  const stack = new Stack();

  const key = new kms.Key(stack, 'mykey');

  buildLogGroup(stack, 'test-cw-logs-default', {
    encryptionKey: key
  });

  expect(stack).toHaveResource('AWS::Logs::LogGroup', {
    Metadata: {
      cfn_nag: {
        rules_to_suppress: [
          {
            id: 'W86',
            reason: 'Retention period for CloudWatchLogs LogGroups are set to \'Never Expire\' to preserve customer data indefinitely'
          }
        ]
      }
    }
  }, ResourcePart.CompleteDefinition);
});

test('override cw log group props with retention period only', () => {
  const stack = new Stack();

  buildLogGroup(stack, 'test-cw-logs-default', {
    retention: logs.RetentionDays.FIVE_DAYS
  });

  expect(stack).toHaveResource('AWS::Logs::LogGroup', {
    Metadata: {
      cfn_nag: {
        rules_to_suppress: [
          {
            id: 'W84',
            reason: 'By default CloudWatchLogs LogGroups data is encrypted using the CloudWatch server-side encryption keys (AWS Managed Keys)'
          }
        ]
      }
    }
  }, ResourcePart.CompleteDefinition);
});