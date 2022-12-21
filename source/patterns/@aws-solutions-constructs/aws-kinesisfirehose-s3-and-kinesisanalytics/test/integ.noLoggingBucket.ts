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

/// !cdk-integ *
import { App, Stack, RemovalPolicy } from "aws-cdk-lib";
import { KinesisFirehoseToAnalyticsAndS3 } from "../lib";
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as defaults from '@aws-solutions-constructs/core';

const app = new App();

// Empty arguments
const stack = new Stack(app, generateIntegStackName(__filename));

const construct = new KinesisFirehoseToAnalyticsAndS3(stack, 'test-kinesisfirehose-analytics-s3', {
  kinesisAnalyticsProps: {
    inputs: [{
      inputSchema: {
        recordColumns: [{
          name: 'ticker_symbol',
          sqlType: 'VARCHAR(4)',
          mapping: '$.ticker_symbol'
        }, {
          name: 'sector',
          sqlType: 'VARCHAR(16)',
          mapping: '$.sector'
        }, {
          name: 'change',
          sqlType: 'REAL',
          mapping: '$.change'
        }, {
          name: 'price',
          sqlType: 'REAL',
          mapping: '$.price'
        }],
        recordFormat: {
          recordFormatType: 'JSON'
        },
        recordEncoding: 'UTF-8'
      },
      namePrefix: 'SOURCE_SQL_STREAM'
    }]
  },
  bucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
  },
  logS3AccessLogs: false
});

const s3Bucket = construct.s3Bucket as s3.Bucket;

defaults.addCfnSuppressRules(s3Bucket, [
  { id: 'W35',
    reason: 'This S3 bucket is created for unit/ integration testing purposes only.' },
]);

app.synth();