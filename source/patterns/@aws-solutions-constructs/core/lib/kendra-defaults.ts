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

import * as kendra from 'aws-cdk-lib/aws-kendra';
import { generatePhysicalName } from "./utils";

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function DefaultKendraIndexProps(id: string, roleArn?: string): kendra.CfnIndexProps {
  return {
    name: generatePhysicalName("", ["KendraIndex", id], 1000),
    roleArn,
    edition: 'DEVELOPER_EDITION',
  } as kendra.CfnIndexProps;
}
