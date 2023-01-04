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
import { LambdaToElasticachememcached, LambdaToElasticachememcachedProps } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
// import * as ec2 from '@aws-cdk/aws-ec2';
import { generateIntegStackName, getTestVpc, CreateTestCache, addCfnSuppressRules, buildSecurityGroup } from '@aws-solutions-constructs/core';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test with existing vpc, Lambda function and cache';

const testVpc = getTestVpc(stack, false);

const testSG = buildSecurityGroup(stack, 'test-sg', { vpc: testVpc }, [], []);

const testFunction = new lambda.Function(stack, 'test-function', {
  runtime: lambda.Runtime.NODEJS_14_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  vpc: testVpc,
  securityGroups: [testSG],
});
addCfnSuppressRules(testFunction, [{ id: "W58", reason: "Test Resource" }]);
addCfnSuppressRules(testFunction, [{ id: "W92", reason: "Test Resource" }]);

const testCache = CreateTestCache(stack, 'test-cache', testVpc);

// Definitions
const props: LambdaToElasticachememcachedProps = {
  existingVpc: testVpc,
  existingLambdaObj: testFunction,
  existingCache: testCache,
};

new LambdaToElasticachememcached(stack, 'test', props);

// Synth
app.synth();