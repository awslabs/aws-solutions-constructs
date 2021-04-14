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

// Imports
import { App, Stack, RemovalPolicy } from "@aws-cdk/core";
import { KinesisFirehoseToS3 } from "../lib";

// Setup
const app = new App();
const stack = new Stack(app, 'test-firehose-s3-stack');
stack.templateOptions.description = 'Integration Test for aws-cdk-apl-kinesisfirehose-s3';

new KinesisFirehoseToS3(stack, 'test-firehose-s3', {
  bucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
  }
});

// Synth
app.synth();
