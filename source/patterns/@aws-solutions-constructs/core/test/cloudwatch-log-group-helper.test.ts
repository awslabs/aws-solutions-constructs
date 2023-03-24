/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import { Template } from 'aws-cdk-lib/assertions';
import { Stack } from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import { buildLogGroup } from '../lib/cloudwatch-log-group-helper';
import * as kms from 'aws-cdk-lib/aws-kms';

test('override cw log group props with encryptionKey only', () => {
  const stack = new Stack();

  const key = new kms.Key(stack, 'mykey');

  buildLogGroup(stack, 'test-cw-logs-default', {
    encryptionKey: key
  });

  const template = Template.fromStack(stack);
  template.hasResource('AWS::Logs::LogGroup', {
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
  });
});

test('override cw log group props with retention period only', () => {
  const stack = new Stack();

  buildLogGroup(stack, 'test-cw-logs-default', {
    retention: logs.RetentionDays.FIVE_DAYS
  });

  const template = Template.fromStack(stack);
  template.hasResource('AWS::Logs::LogGroup', {
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
  });
});