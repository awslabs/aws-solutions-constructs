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
import { Stack, Duration } from '@aws-cdk/core';
import { ApiGatewayToKinesisStreams } from '../lib';
import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import * as kinesis from '@aws-cdk/aws-kinesis';

// --------------------------------------------------------------
// Test minimal deployment snapshot
// --------------------------------------------------------------
test('Test minimal deployment snapshot', () => {
    const stack = new Stack();
    new ApiGatewayToKinesisStreams(stack, 'api-gateway-kinesis', {});
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test construct properties
// --------------------------------------------------------------
test('Test construct properties', () => {
    const stack = new Stack();
    const pattern = new ApiGatewayToKinesisStreams(stack, 'api-gateway-kinesis', {});

    expect(pattern.apiGateway !== null);
    expect(pattern.apiGatewayRole !== null);
    expect(pattern.apiGatewayCloudWatchRole !== null);
    expect(pattern.apiGatewayLogGroup !== null);
    expect(pattern.kinesisStream !== null);
});

// --------------------------------------------------------------
// Test deployment w/ overwritten properties
// --------------------------------------------------------------
test('Test deployment w/ overwritten properties', () => {
    const stack = new Stack();

    new ApiGatewayToKinesisStreams(stack, 'api-gateway-kinesis', {
        apiGatewayProps: {
            restApiName: 'my-api',
            deployOptions: {
                methodOptions: {
                    '/*/*': {
                        throttlingRateLimit: 100,
                        throttlingBurstLimit: 25
                    }
                }
            }
        },
        kinesisStreamProps: {
            shardCount: 1,
            streamName: 'my-stream'
        },
        putRecordRequestTemplate: `{ "Data": "$util.base64Encode($input.json('$.foo'))", "PartitionKey": "$input.path('$.bar')" }`,
        putRecordRequestModel: { schema: {} },
        putRecordsRequestTemplate: `{ "Records": [ #foreach($elem in $input.path('$.records')) { "Data": "$util.base64Encode($elem.foo)", "PartitionKey": "$elem.bar"}#if($foreach.hasNext),#end #end ] }`,
        putRecordsRequestModel: { schema: {} }
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();

    expect(stack).toHaveResourceLike('AWS::ApiGateway::Stage', {
        MethodSettings: [
            {
                DataTraceEnabled: true,
                HttpMethod: '*',
                LoggingLevel: 'INFO',
                ResourcePath: '/*'
            },
            {
                HttpMethod: '*',
                ResourcePath: '/*',
                ThrottlingRateLimit: 100,
                ThrottlingBurstLimit: 25
            }
        ]
    });

    expect(stack).toHaveResource('AWS::Kinesis::Stream', {
        ShardCount: 1,
        Name: 'my-stream'
    });
});

// --------------------------------------------------------------
// Test deployment w/ existing stream
// --------------------------------------------------------------
test('Test deployment w/ existing stream', () => {
    const stack = new Stack();

    new ApiGatewayToKinesisStreams(stack, 'api-gateway-kinesis', {
        apiGatewayProps: {},
        existingStreamObj: new kinesis.Stream(stack, 'ExistingStream', {
            shardCount: 5,
            retentionPeriod: Duration.days(4)
        })
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();

    expect(stack).toHaveResource('AWS::Kinesis::Stream', {
        ShardCount: 5,
        RetentionPeriodHours: 96
    });
});
