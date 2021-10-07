/**
 *  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { App, Stack } from "@aws-cdk/core";
import { LambdaToElasticSearchAndKibana } from "../lib";
import * as lambda from '@aws-cdk/aws-lambda';
import { generateIntegStackName } from '@aws-solutions-constructs/core';

// Setup
// Be aware that environment-agnostic stacks will be created with access to only 2 AZs,
// so to use more than 2 AZs, be sure to specify the account and region on your stack.
// https://docs.aws.amazon.com/cdk/api/latest/python/aws_cdk.aws_ec2/VpcProps.html
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename), {
  env: {
    region: process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  }
});

const lambdaProps: lambda.FunctionProps = {
  code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  runtime: lambda.Runtime.NODEJS_12_X,
  handler: 'index.handler',
};

new LambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-kibana3', {
  lambdaFunctionProps: lambdaProps,
  domainName: "deploywithvpctest",
  deployVpc: true,
  vpcProps: {
    maxAzs: 3,
  }
});

// Synth
app.synth();
