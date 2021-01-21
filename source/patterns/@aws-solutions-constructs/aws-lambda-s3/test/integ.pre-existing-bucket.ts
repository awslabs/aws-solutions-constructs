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
import { App, Stack } from "@aws-cdk/core";
import { LambdaToS3, LambdaToS3Props } from "../lib";
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';

// Setup
const app = new App();
const stack = new Stack(app, 'test-lambda-s3-pre-existing-bucket');
stack.templateOptions.description = 'Integration Test for aws-lambda-s3';
const mybucket: s3.IBucket = s3.Bucket.fromBucketName(stack, 'mybucket', 'cdktoolkit-stagingbucket-1cjqz1mn5psg3');

// Definitions
const props: LambdaToS3Props = {
  existingBucketObj: mybucket,
  lambdaFunctionProps: {
    runtime: lambda.Runtime.NODEJS_10_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`)
  }
};

new LambdaToS3(stack, 'test-lambda-s3-pre-existing-bucket', props);

// Synth
app.synth();