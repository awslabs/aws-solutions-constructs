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

import { CfnJobProps } from 'aws-cdk-lib/aws-glue';
import { IRole } from 'aws-cdk-lib/aws-iam';
import * as s3assets from "aws-cdk-lib/aws-s3-assets";

export function DefaultGlueJobProps(jobRole: IRole, userProvidedGlueJobProps: CfnJobProps | any,
  glueSecurityConfigName: string, defaultArguments: {}, etlCodeAsset?: s3assets.Asset): CfnJobProps {
  const glueVersion: string | undefined = userProvidedGlueJobProps.glueVersion;

  // setting default to 2 to reduce cost
  const maxCapacity = glueVersion === "1.0" && !(userProvidedGlueJobProps.workerType
    || userProvidedGlueJobProps.numberOfWorkers) ? 2 : undefined;

  if (etlCodeAsset) {
    userProvidedGlueJobProps.command.scriptLocation = etlCodeAsset.s3ObjectUrl;
  }

  const defaultGlueJobProps: CfnJobProps = {
    command: userProvidedGlueJobProps.command!,
    role: jobRole.roleArn,
    securityConfiguration: glueSecurityConfigName,
    defaultArguments,
    maxCapacity,
    numberOfWorkers: (!glueVersion || glueVersion === "2.0") ? 2 : undefined, // defaulting to 2 workers,
    workerType: (!glueVersion || glueVersion === "2.0") ? 'G.1X' : undefined, // defaulting to G.1X as it is preferred with glue version 2.0
    // glue version though optional is required for streaming etl jobs otherwise it throws an error that 'command not found'
    glueVersion: glueVersion ? glueVersion : '2.0'
  };

  return defaultGlueJobProps;
}