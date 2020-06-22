/**
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { SynthUtils } from '@aws-cdk/assert';
import { Stack } from '@aws-cdk/core';
import { KinesisFirehoseToAnalyticsAndS3, KinesisFirehoseToAnalyticsAndS3Props } from '../lib';
import '@aws-cdk/assert/jest';

// --------------------------------------------------------------
// Test Case 1 - Pattern deployment w/ default properties
// --------------------------------------------------------------
test('Pattern deployment w/ default properties', () => {
    // Initial Setup
    const stack = new Stack();
    const props: KinesisFirehoseToAnalyticsAndS3Props = {
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
    };
    new KinesisFirehoseToAnalyticsAndS3(stack, 'test-firehose-s3-and-analytics-stack', props);
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test Case 2 - Test the getter methods
// --------------------------------------------------------------
test('Test properties', () => {
    // Initial Setup
    const stack = new Stack();
    const props: KinesisFirehoseToAnalyticsAndS3Props = {
        kinesisFirehoseProps: {
            deploy: true,
            props: {
                deliveryStreamName: "myDeliveryStream"
            }
        },
        kinesisAnalyticsProps: {
            inputs: [{
                inputSchema: {
                    recordColumns: [{
                        name: 'ts',
                        sqlType: 'TIMESTAMP',
                        mapping: '$.timestamp'
                    }, {
                        name: 'trip_id',
                        sqlType: 'VARCHAR(64)',
                        mapping: '$.trip_id'
                    }],
                    recordFormat: {
                        recordFormatType: 'JSON'
                    },
                    recordEncoding: 'UTF-8'
                },
                namePrefix: 'SOURCE_SQL_STREAM'
            }]
        }
    };
    const app = new KinesisFirehoseToAnalyticsAndS3(stack, 'test-kinesis-firehose-kinesis-analytics', props);
    // Assertions
    expect(app.kinesisAnalytics !== null);
    expect(app.kinesisFirehose !== null);
    expect(app.s3Bucket !== null);
});