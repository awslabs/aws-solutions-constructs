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

import { CfnJob, CfnJobProps } from '@aws-cdk/aws-glue';
import { IRole } from '@aws-cdk/aws-iam';
import { IResolvable } from '@aws-cdk/core';

export function DefaultGlueJobProps(jobRole: IRole, jobCommand: CfnJob.JobCommandProperty | IResolvable,
  glueSecurityConfigName: string, _defaultArguments: {}, _glueVersion: string | undefined ): CfnJobProps | any {
  const defaultGlueJobProps: CfnJobProps = {
    command: jobCommand,
    role: jobRole.roleArn,
    securityConfiguration: glueSecurityConfigName,
    defaultArguments: _defaultArguments,
    // glue version though optional is required for streaming etl jobs otherwise it throws an error that 'command not found'
    ...(_glueVersion !== undefined ? { glueVersion: _glueVersion } : { glueVersion: '2.0' })
  };

  return defaultGlueJobProps;
}