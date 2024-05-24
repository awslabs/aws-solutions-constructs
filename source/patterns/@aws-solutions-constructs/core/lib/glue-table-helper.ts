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

import { CfnTable, CfnTableProps } from "aws-cdk-lib/aws-glue";
import { Construct } from "constructs";
import * as glue from 'aws-cdk-lib/aws-glue';
import * as s3assets from 'aws-cdk-lib/aws-s3-assets';

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 *
 * Method to build the default table props
 *
 * @param scope
 * @param database
 * @param fieldSchema
 * @param sourceType
 * @param parameters - Key value pairs of parameters. If source type is 'Kinesis', pass Kinesis Data Stream name with key
 *  as 'STREAM_NAME'. Example: {STREAM_NAME: 'KinesisStreamConstruct.streamName'}
 */
export function DefaultGlueTable(scope: Construct, tableProps: CfnTableProps): CfnTable {
  return new CfnTable(scope, 'GlueTable', tableProps);
}
export interface GlueProps {
  readonly existingGlueJob?: glue.CfnJob,
  readonly etlCodeAsset?: s3assets.Asset;
  readonly glueJobProps?: glue.CfnJobProps | any;
  readonly fieldSchema?: glue.CfnTable.ColumnProperty[];
  readonly existingTable?: glue.CfnTable;
  readonly tablePropss?: glue.CfnTableProps;
}

export function CheckGlueProps(propsObject: GlueProps | any) {
  let errorMessages = '';
  let errorFound = false;

  if (propsObject.glueJobProps && propsObject.existingGlueJob) {
    errorMessages += 'Error - Either provide glueJobProps or existingGlueJob, but not both.\n';
    errorFound = true;
  }

  if ((!propsObject.existingGlueJob) && (!propsObject.glueJobProps.command.scriptLocation && !propsObject.etlCodeAsset)) {
    errorMessages += ('Either one of CfnJob.JobCommandProperty.scriptLocation or etlCodeAsset has ' +
      'to be provided. If the ETL Job code file exists in a local filesystem, please set ' +
      'KinesisstreamsToGluejobProps.etlCodeAsset. If the ETL Job is available in an S3 bucket, set the ' +
      'CfnJob.JobCommandProperty.scriptLocation property\n');
    errorFound = true;
  }

  if (propsObject.glueJobProps?.command?.scriptLocation) {
    const s3Url: string = propsObject.glueJobProps.command.scriptLocation;
    const found = s3Url.match(/^s3:\/\/\S+\/\S+/g);
    if (!(found && found.length > 0 && found[0].length === s3Url.length)) {
      errorMessages += "Invalid S3 URL for Glue script provided\n";
      errorFound = true;
    }
  }

  if (propsObject.fieldSchema === undefined && propsObject.existingTable === undefined && propsObject.tableProps === undefined) {
    errorMessages += "Either fieldSchema or table property has to be set, both cannot be omitted";
    errorFound = true;
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }
}
