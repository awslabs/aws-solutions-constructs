/**
 *  Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { Stack } from "aws-cdk-lib";
import { ServerlessImageHandler, ServerlessImageHandlerProps } from "../lib";
import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';

// --------------------------------------------------------------
// Minimal deployment snapshot test
// --------------------------------------------------------------
test('Minimal deployment snapshot test', () => {
    // Initial Setup
    const stack = new Stack();
    const props: ServerlessImageHandlerProps = {
        corsEnabled: true,
        corsOrigin: "*",
        sourceBuckets: "my-sample-bucket",
        logRetentionPeriod: 7
    };
    new ServerlessImageHandler(stack, 'test-serverless-image-handler', props);
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Custom deployment unit testing
// --------------------------------------------------------------
test('Custom deployment unit testing', () => {
    // Initial Setup
    const stack = new Stack();
    const props: ServerlessImageHandlerProps = {
        corsEnabled: false,
        sourceBuckets: "",
        logRetentionPeriod: 7,
        autoWebP: true,
        customProps: {
            lambdaFunctionProps: {
                environment: {
                    TEST_KEY: "TEST_VALUE"
                }
            },
            cloudFrontDistributionProps: {
                enableIpV6: true
            },
            apiGatewayProps: {
                failOnWarnings: true
            },
            bucketPermissions: ['ReadWrite']
        }
    };
    const sih = new ServerlessImageHandler(stack, 'test-serverless-image-handler', props);
    // Assertion 1
    expect(sih.lambdaFunction()).toBeDefined();
    // Assertion 2
    expect(sih.s3Bucket()).toBeDefined();
    // Assertion 3
    expect(sih.apiGateway()).toBeDefined();
    // Assertion 4
    expect(sih.cloudFrontDistribution()).toBeDefined();
    // Assertion 5
    expect(sih.lambdaFunction()).toHaveProperty('environment.TEST_KEY', {"value": "TEST_VALUE"});
});