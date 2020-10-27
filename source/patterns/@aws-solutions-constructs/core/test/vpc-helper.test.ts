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

import { Stack } from "@aws-cdk/core";
import * as defaults from '../';
import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';

// --------------------------------------------------------------
// Test minimal deployment with no properties
// --------------------------------------------------------------
test('Test minimal deployment with no properties', () => {
    // Stack
    const stack = new Stack();
    // Build VPC
    defaults.buildVpc(stack);
    // Assertion
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test deployment w/ custom CIDR
// --------------------------------------------------------------
test('Test deployment w/ custom CIDR', () => {
    // Stack
    const stack = new Stack();
    // Build VPC
    defaults.buildVpc(stack, {
        vpcProps: {
            cidr: '172.168.0.0/16'
        }
    });
    // Assertion
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test deployment w/ custom properties
// --------------------------------------------------------------
test('Test deployment w/ custom properties', () => {
    // Stack
    const stack = new Stack();
    // Build VPC
    defaults.buildVpc(stack, {
        vpcProps: {
            enableDnsHostnames: false,
            enableDnsSupport: false,
            cidr: '172.168.0.0/16'
        }
    });
    expect(stack).toHaveResource("AWS::EC2::VPC", {
        CidrBlock: "172.168.0.0/16",
        EnableDnsHostnames: false,
        EnableDnsSupport: false
    });
});