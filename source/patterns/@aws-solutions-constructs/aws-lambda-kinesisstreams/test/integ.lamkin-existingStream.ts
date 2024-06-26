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
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { StreamEncryption, StreamMode } from "aws-cdk-lib/aws-kinesis";

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));

const existingStreamObj = new kinesis.Stream(stack, 'test-stream', {
  streamMode: StreamMode.ON_DEMAND,
  encryption: StreamEncryption.MANAGED
});

new LambdaToKinesisStreams(stack, 'test-lambda-kinesisstreams', {
  lambdaFunctionProps: {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_18_X,
    handler: 'index.handler'
  },
  existingStreamObj
});

new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
