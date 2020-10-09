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

// Imports
import { Stack } from "@aws-cdk/core";
import * as kinesisFirehose from "@aws-cdk/aws-kinesisfirehose";
import * as defaults from '../';
import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';

// --------------------------------------------------------------
// Test default functionality
// --------------------------------------------------------------
test('Test default functionality', () => {
    // Setup the stack
    const stack = new Stack();
    const firehose = new kinesisFirehose.CfnDeliveryStream(stack, 'KinesisFirehose');
    // Setup the Kinesis Analytics application
    defaults.buildKinesisAnalyticsApp(stack, {
        kinesisFirehose: firehose,
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
        }
    });
    // Assertions
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});