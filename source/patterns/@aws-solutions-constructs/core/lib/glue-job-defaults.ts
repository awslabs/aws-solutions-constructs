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

import * as glue from '@aws-cdk/aws-glue';
import * as iam from '@aws-cdk/aws-iam';

export function DefaultGlueJobProps(jobRole: iam.IRole, userProvidedGlueJobProps: Partial<glue.CfnJobProps>,
  glueSecurityConfigName: string, _defaultArguments: {} ): glue.CfnJobProps {
  const _glueVersion: string | undefined = userProvidedGlueJobProps.glueVersion;

  let defaultGlueJobProps: glue.CfnJobProps;

  if (userProvidedGlueJobProps.workerType !== undefined && userProvidedGlueJobProps.numberOfWorkers !== undefined) {
    defaultGlueJobProps = {
      command: userProvidedGlueJobProps.command!,
      role: jobRole.roleArn,
      securityConfiguration: glueSecurityConfigName,
      defaultArguments: _defaultArguments,
      maxCapacity: 2, // setting default to 2 to ensure customers don't pay for something they don't need
      // glue version though optional is required for streaming etl jobs otherwise it throws an error that 'command not found'
      ...(_glueVersion !== undefined ? { glueVersion: _glueVersion } : { glueVersion: '2.0' })
    };
  } else {
    defaultGlueJobProps = {
      command: userProvidedGlueJobProps.command!,
      role: jobRole.roleArn,
      securityConfiguration: glueSecurityConfigName,
      defaultArguments: _defaultArguments,
      // glue version though optional is required for streaming etl jobs otherwise it throws an error that 'command not found'
      ...(_glueVersion !== undefined ? { glueVersion: _glueVersion } : { glueVersion: '2.0' })
    };
  }

  return defaultGlueJobProps;
}