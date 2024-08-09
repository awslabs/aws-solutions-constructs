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
import * as ec2 from 'aws-cdk-lib/aws-ec2';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));

const destination = GetTestFirehoseDestination(stack, 'destination-firehose');

new LambdaToKinesisFirehose(stack, 'test-construct', {
  lambdaFunctionProps: {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: "index.handler",
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  },
  existingKinesisFirehose: destination.kinesisFirehose,
  deployVpc: true,
  vpcProps: {
    ipAddresses: ec2.IpAddresses.cidr('10.100.0.0/16')
  }
});

defaults.suppressCustomHandlerCfnNagWarnings(stack, 'Custom::S3AutoDeleteObjectsCustomResourceProvider');
defaults.suppressCustomHandlerCfnNagWarnings(stack, 'Custom::VpcRestrictDefaultSGCustomResourceProvider');

// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
