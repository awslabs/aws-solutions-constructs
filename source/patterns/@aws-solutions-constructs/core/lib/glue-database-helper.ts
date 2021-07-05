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

import * as glue from "@aws-cdk/aws-glue";
import * as cdk from "@aws-cdk/core";

/**
 * Create an AWS Glue database with the properties provided
 *
 * @param scope
 * @param databaseProps
 */
export function DefaultGlueDatabase(scope: cdk.Construct, databaseProps: glue.CfnDatabaseProps): glue.CfnDatabase {
  return new glue.CfnDatabase(scope, 'GlueDatabase', databaseProps);
}