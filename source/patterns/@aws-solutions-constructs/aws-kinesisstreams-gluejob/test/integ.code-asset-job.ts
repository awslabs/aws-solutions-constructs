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

// Imports
import * as path from "path";
import { CfnTable } from 'aws-cdk-lib/aws-glue';
import { App, Stack } from 'aws-cdk-lib';
import { KinesisstreamsToGluejob } from '../lib';
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-kinesisstream-gluejob';

const fieldSchema: CfnTable.ColumnProperty [] = [{
  name: "id",
  type: "int",
  comment: "Identifier for the record"
}, {
  name: "name",
  type: "string",
  comment: "The name of the record"
}, {
  name: "type",
  type: "string",
  comment: "The type of the record"
}, {
  name: "numericvalue",
  type: "int",
  comment: "Some value associated with the record"
}];

new KinesisstreamsToGluejob(stack, 'test-kinesisstreams-lambda', {
  glueJobProps: {
    command: {
      name: 'gluestreaming',
      pythonVersion: '3'
    }
  },
  fieldSchema,
  etlCodeAsset: new Asset(stack, 'ETL', {
    path: path.join(__dirname, 'fakefile.py')
  })
});

// Synth
app.synth();