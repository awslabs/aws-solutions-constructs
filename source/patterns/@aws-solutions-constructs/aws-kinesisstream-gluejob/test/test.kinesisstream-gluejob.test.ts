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

import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import { Stack } from "@aws-cdk/core";
import { KinesisStreamGlueJob, KinesisStreamGlueJobProps } from '../lib';

// --------------------------------------------------------------
// Pattern minimal deployment
// --------------------------------------------------------------
test('Pattern minimal deployment', () => {
    // Initial setup
    const stack = new Stack();
    const props: KinesisStreamGlueJobProps = {
    glueJobProps: {
        command: {
            name: 'testCommand',
            pythonVersion: '3',
            scriptLocation: 's3://fakelocation/script'
        },
        role: 'testGlueJobRole',
        securityConfiguration: 'testSecConfig'
    }

    };
    new KinesisStreamGlueJob(stack, 'test-kinesisstreams-lambda', props);
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});