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
import { generateIntegStackName, suppressCustomHandlerCfnNagWarnings } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as defaults from "@aws-solutions-constructs/core";

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));

new LambdaToKinesisStreams(stack, 'test-lambda-kinesisstreams', {
  lambdaFunctionProps: {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  },
  deployVpc: true
});

suppressCustomHandlerCfnNagWarnings(stack, 'Custom::VpcRestrictDefaultSGCustomResourceProvider');

new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
