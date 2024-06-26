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
import { App, Stack } from "aws-cdk-lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import {LambdaToKinesisFirehose } from "../lib";
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as defaults from '@aws-solutions-constructs/core';
import { GetTestFirehoseDestination } from './test-helper';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));

const destination = GetTestFirehoseDestination(stack, 'destination-firehose');

const existingFunction = new lambda.Function(stack, 'existing-function', {
  runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
  handler: "index.handler",
  code: lambda.Code.fromAsset(`${__dirname}/lambda`),
});
defaults.addCfnSuppressRules(existingFunction, [{ id: "W58", reason: "Test Resource" }]);
defaults.addCfnSuppressRules(existingFunction, [{ id: "W89", reason: "Test Resource" }]);
defaults.addCfnSuppressRules(existingFunction, [{ id: "W92", reason: "Test Resource" }]);

new LambdaToKinesisFirehose(stack, 'test-construct', {
  existingLambdaObj: existingFunction,
  existingKinesisFirehose: destination.kinesisFirehose
});

defaults.suppressCustomHandlerCfnNagWarnings(stack, 'Custom::S3AutoDeleteObjectsCustomResourceProvider');

// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
