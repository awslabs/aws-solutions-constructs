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
import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import { CfnJobProps } from '@aws-cdk/aws-glue';
import { Stack } from "@aws-cdk/core";
import { DefaultGlueJobProps } from '../../core/lib/gluejob-defaults';
import { buildGlueJob } from '../../core/lib/gluejob-helper';

// --------------------------------------------------------------
// Test minimal deployment with no properties
// --------------------------------------------------------------
test('Test minimal deployment with no properties', () => {
    // Stack
    const stack = new Stack();

    const _jobID = 'testETLJob';

    const cfnJobProps: CfnJobProps = DefaultGlueJobProps('jobRole', {
        name: _jobID,
        pythonVersion: '3',
        scriptLocation: 's3://fakelocation/script'
    }, _jobID);

    buildGlueJob(stack, { glueJobProps: cfnJobProps });
    // Assertion 1
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    // Assertion 2
    // expect(stack).toHaveResourceLike('AWS::Glue::Job', {
    //     Properties: {
    //         Command: {
    //             Name : 'testETLJob',
    //             PythonVersion : '3',
    //             ScriptLocation : 's3://fakelocation/script'
    //         },
    //         Role: "jobRole",
    //         SecurityConfiguration: 'testETLJob'
    //     },
    //     Type: "AWS::Glue::Job",
    // });
});