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

import * as logs from '@aws-cdk/aws-logs';
import * as cdk from '@aws-cdk/core';

export interface BuildLogGroupProps {
  /**
   * An existing log group for the construct to use (construct will NOT create a new log group in this case)
   */
  readonly existingLogGroup?: logs.LogGroup;
  /**
   * Optional user provided props for log groups
   * 
   * @default - None
   */
  readonly logGroupProps?: logs.LogGroupProps;
}

export function buildLogGroup(scope: cdk.Construct, props: BuildLogGroupProps): logs.LogGroup {
  // Conditional Log Group creation
  if (props.existingLogGroup) return props.existingLogGroup;
  else {
    if (props.logGroupProps) {
      const logGroupProps = { ...props.logGroupProps };
      return new logs.LogGroup(scope, 'LogGroup', logGroupProps);
    }
  }
}