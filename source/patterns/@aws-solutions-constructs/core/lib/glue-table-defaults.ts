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

import { CfnDatabase, CfnTable, CfnTableProps } from "@aws-cdk/aws-glue";
import { Aws } from "@aws-cdk/core";

export function DefaultGlueTableProps(database: CfnDatabase, fieldSchema: CfnTable.ColumnProperty [],
  sourceType?: string, parameters?: any): CfnTableProps | any {
  let _tableProps: CfnTableProps;

  if (sourceType === 'kinesis') {
    const kinesisStreamName = parameters.STREAM_NAME;

    const _paths: string = fieldSchema.map((item) => {
      return item.name;
    }).join(',');

    _tableProps = {
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
    };

    return _tableProps;
  } else {
    throw Error('Source Type not Supported. Valid Source Type not provided');
  }
}