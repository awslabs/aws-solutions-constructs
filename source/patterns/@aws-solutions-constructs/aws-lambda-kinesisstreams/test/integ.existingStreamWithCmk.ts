/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

/// !cdk-integ *
import { App, Stack } from "aws-cdk-lib";
import { LambdaToKinesisStreams } from "../lib";
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));

const encryptionKey = new kms.Key(stack, 'test-key', {
  enableKeyRotation: true
});

const existingStreamObj = new kinesis.Stream(stack, 'test-stream', {
  encryptionKey
});

new LambdaToKinesisStreams(stack, 'test-lambda-kinesisstreams', {
  lambdaFunctionProps: {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_18_X,
    handler: 'index.handler'
  },
  existingStreamObj
});

app.synth();
