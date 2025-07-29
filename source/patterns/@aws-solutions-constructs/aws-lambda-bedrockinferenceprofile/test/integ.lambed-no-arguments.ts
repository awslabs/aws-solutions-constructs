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
import { LambdaToBedrockinferenceprofile, LambdaToBedrockinferenceprofileProps } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as defaults from '@aws-solutions-constructs/core';
import { generateIntegStackName, SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
SetConsistentFeatureFlags(stack);
// We need to set the flag to true for this construct because of this issue - https://github.com/aws/aws-cdk/issues/34894
stack.node.setContext("@aws-cdk/aws-lambda:createNewPoliciesWithAddToRolePolicy", true);

stack.templateOptions.description = 'Integration Test for aws-lambda-sns';

const props: LambdaToBedrockinferenceprofileProps = {
  lambdaFunctionProps: {
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler',
    code: lambda.Code.fromAsset(`${__dirname}/lambda`)
  },
  bedrockModelId: "amazon.nova-lite-v1:0"
};

new LambdaToBedrockinferenceprofile(stack, 'test-lambda-inferenceprops', props);

// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
