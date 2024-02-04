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
import {App, Stack} from "aws-cdk-lib";
import {LambdaToSsmstringparameter, LambdaToSsmstringparameterProps} from '../lib';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as defaults from '@aws-solutions-constructs/core';
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = "Integration Test for test-lambda-ssmstringparameter";

// Create VPC
const vpc = defaults.buildVpc(stack, {
  defaultVpcProps: defaults.DefaultPublicPrivateVpcProps(),
  constructVpcProps: {
    enableDnsHostnames: true,
    enableDnsSupport: true,
  },
});

// Definitions
const props: LambdaToSsmstringparameterProps = {
  lambdaFunctionProps: {
    runtime: lambda.Runtime.NODEJS_16_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`)
  },
  stringParameterProps: { stringValue: "test-string-value" },
  existingVpc: vpc
};

new LambdaToSsmstringparameter(stack, 'test-lambda-ssmstringparameter', props);

defaults.suppressCustomHandlerCfnNagWarnings(stack, 'Custom::VpcRestrictDefaultSGCustomResourceProvider');

// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
