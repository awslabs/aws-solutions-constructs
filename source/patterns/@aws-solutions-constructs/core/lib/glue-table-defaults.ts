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

import { CfnDatabase, CfnTable } from "@aws-cdk/aws-glue";
import { Aws, Construct } from "@aws-cdk/core";

/**
 * Method to build the default table props
 *
 * @param scope
 * @param database
 * @param fieldSchema
 * @param sourceType
 * @param parameters - Key value pairs of parmaeters. If source type is 'Kinesis', pass Kinesis Data Stream name with key
 *  as 'STREAM_NAME'. Example: {STREAM_NAME: 'KinesisStreamConstrct.streamName'}
 */
export function DefaultGlueTable(scope: Construct, database: CfnDatabase, fieldSchema: CfnTable.ColumnProperty [],
  sourceType: string, parameters?: any): CfnTable {
  let _glueTable: CfnTable;
  if (sourceType === 'kinesis') {
    const kinesisStreamName = parameters.STREAM_NAME;

    let _paths: string = '';
    for (let index = 0; index < fieldSchema.length; ++index) {
      _paths = _paths + fieldSchema[index].name;
      if (index < fieldSchema.length - 1) {
        _paths = _paths + ',';
      }
    }

    _glueTable = new CfnTable(scope, 'GlueTable', {
      catalogId: database.catalogId,
      databaseName: database.ref,
      tableInput: {
        storageDescriptor: {
          columns: fieldSchema,
          location: kinesisStreamName,
          inputFormat: "org.apache.hadoop.mapred.TextInputFormat",
          outputFormat: "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat",
          compressed: false,
          numberOfBuckets: -1,
          serdeInfo: {
            serializationLibrary: "org.openx.data.jsonserde.JsonSerDe",
            parameters: {
              paths: _paths
            }
          },
          parameters: {
            endpointUrl: `https://kinesis.${Aws.REGION}.amazonaws.com`,
            streamName: kinesisStreamName,
            typeOfData: sourceType
          }
        },
        tableType: 'EXTERNAL_TABLE',
        parameters: {
          classication: 'json'
        }
      }
    });
  } else {
    throw Error('Source Type not Supported. Valid Source Type not provided');
  }

  return _glueTable!;
}