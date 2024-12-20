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

/*
 *  The functions found here in the core library are for internal use and can be changed
 *  or removed outside of a major release. We recommend against calling them directly from client code.
 */

import { DefaultLogGroupProps } from './cloudwatch-log-group-defaults';
import * as logs from 'aws-cdk-lib/aws-logs';
import { addL2CfnSuppressRules, consolidateProps } from './utils';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function buildLogGroup(scope: Construct, logGroupId?: string, logGroupProps?: logs.LogGroupProps): logs.LogGroup {
  let consolidatedLogGroupProps: logs.LogGroupProps;

  // Override user provided CW LogGroup props with the DefaultLogGroupProps
  consolidatedLogGroupProps = consolidateProps(DefaultLogGroupProps(), logGroupProps);

  // Set the LogGroup Id
  const adjustedLogGroupId = logGroupId ? logGroupId : 'CloudWatchLogGroup';

  // Create the CW Log Group
  const logGroup = new logs.LogGroup(scope, adjustedLogGroupId, consolidatedLogGroupProps);

  // If required, suppress the Cfn Nag WARNINGS
  if (consolidatedLogGroupProps.retention === logs.RetentionDays.INFINITE) {
    addL2CfnSuppressRules( logGroup, [
      {
        id: 'W86',
        reason: 'Retention period for CloudWatchLogs LogGroups are set to \'Never Expire\' to preserve customer data indefinitely'
      }
    ]);
  }

  if (!consolidatedLogGroupProps.encryptionKey) {
    addL2CfnSuppressRules( logGroup, [
      {
        id: 'W84',
        reason: 'By default CloudWatchLogs LogGroups data is encrypted using the CloudWatch server-side encryption keys (AWS Managed Keys)'
      }
    ]);
  }

  return logGroup;
}