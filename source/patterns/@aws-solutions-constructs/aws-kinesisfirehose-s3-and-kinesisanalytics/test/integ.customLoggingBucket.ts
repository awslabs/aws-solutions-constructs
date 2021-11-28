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

/// !cdk-integ *
import { App, Stack, RemovalPolicy } from "@aws-cdk/core";
import { BucketEncryption } from "@aws-cdk/aws-s3";
import { KinesisFirehoseToAnalyticsAndS3 } from "../lib";
import { generateIntegStackName } from '@aws-solutions-constructs/core';

const app = new App();

// Empty arguments
const stack = new Stack(app, generateIntegStackName(__filename));

new KinesisFirehoseToAnalyticsAndS3(stack, 'test-kinesisfirehose-analytics-s3', {
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
  loggingBucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    bucketName: 'custom-logging-bucket',
    encryption: BucketEncryption.S3_MANAGED,
    versioned: true
  }
});

app.synth();