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

// Imports
import { App, Stack, RemovalPolicy } from "aws-cdk-lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import {LambdaToKinesisFirehose } from "../lib";
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import { KinesisFirehoseToS3 } from '@aws-solutions-constructs/aws-kinesisfirehose-s3';
import * as defaults from '@aws-solutions-constructs/core';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));

const destination = new KinesisFirehoseToS3(stack, 'destination-firehose', {
  bucketProps: {
    autoDeleteObjects: true,
    removalPolicy: RemovalPolicy.DESTROY,
  },
  loggingBucketProps: {
    autoDeleteObjects: true,
    removalPolicy: RemovalPolicy.DESTROY
  }
});

const myVpc = defaults.getTestVpc(stack);

new LambdaToKinesisFirehose(stack, 'test-construct', {
  lambdaFunctionProps: {
    runtime: lambda.Runtime.NODEJS_18_X,
    handler: "index.handler",
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  },
  existingKinesisFirehose: destination.kinesisFirehose,
  existingVpc: myVpc
});

defaults.suppressAutoDeleteHandlerWarnings(stack);

// Synth
app.synth();
