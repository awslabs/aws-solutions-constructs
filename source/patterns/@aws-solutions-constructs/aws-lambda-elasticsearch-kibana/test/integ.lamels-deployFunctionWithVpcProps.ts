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

/*
 * This test is incompatible with integ-runner in some way. In order to complete
 * the transition, it's disabled and we will dig deeper into it in the future
 */

/// !cdk-integ *
import { App, Aws, Stack } from "aws-cdk-lib";
import { LambdaToElasticSearchAndKibana } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as defaults from '@aws-solutions-constructs/core';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import { suppressCustomHandlerCfnNagWarnings } from "@aws-solutions-constructs/core";

// Setup
const app = new App();
const stack = new Stack(app, defaults.generateIntegStackName(__filename), {
  env: { account: Aws.ACCOUNT_ID, region: 'us-east-1' },
});

const lambdaProps: lambda.FunctionProps = {
  code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
  handler: 'index.handler',
};

new LambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-kibana3', {
  lambdaFunctionProps: lambdaProps,
  domainName: defaults.CreateShortUniqueTestName("dmn"),
  deployVpc: true,
  vpcProps: {
    ipAddresses: ec2.IpAddresses.cidr('172.168.0.0/16'),
  }
});
suppressCustomHandlerCfnNagWarnings(stack, 'Custom::VpcRestrictDefaultSGCustomResourceProvider');

// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
