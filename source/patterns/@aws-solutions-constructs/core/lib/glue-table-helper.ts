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

import { CfnTable, CfnTableProps } from "aws-cdk-lib/aws-glue";
import { Construct } from "constructs";

/**
 * Method to build the default table props
 *
 * @param scope
 * @param database
 * @param fieldSchema
 * @param sourceType
 * @param parameters - Key value pairs of parameters. If source type is 'Kinesis', pass Kinesis Data Stream name with key
 *  as 'STREAM_NAME'. Example: {STREAM_NAME: 'KinesisStreamConstrct.streamName'}
 */
export function DefaultGlueTable(scope: Construct, tableProps: CfnTableProps): CfnTable {
  return new CfnTable(scope, 'GlueTable', tableProps);
}