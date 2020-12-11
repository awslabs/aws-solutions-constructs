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
import { App, CfnOutput, Stack } from '@aws-cdk/core';
import { KinesisStreamGlueJob, KinesisStreamGlueJobProps } from '../lib';

// Setup
const app = new App();
const stack = new Stack(app, 'test-kinesisstream-gluejob');
stack.templateOptions.description = 'Integration Test for aws-kinesisstream-gluejob';

const createJobCommand = KinesisStreamGlueJob.createGlueJobCommand(stack, 'testETLJob', '3', undefined, `${__dirname}/transform.py`);

// Definitions
const props: KinesisStreamGlueJobProps = {
    glueJobProps: {
        command: createJobCommand[0],
        role: KinesisStreamGlueJob.createGlueJobRole(stack).roleArn,
        securityConfiguration: 'testSecConfig'
    }
};

new KinesisStreamGlueJob(stack, 'test-kinesisstreams-lambda', props);
new CfnOutput(stack, 'ScriptLocation', {
    value: createJobCommand[1]!.s3ObjectUrl
});

// Synth
app.synth();