/**
 *  Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { App, Stack, Aws } from "@aws-cdk/core";
import { LambdaToElasticSearchAndKibana } from "../lib";
import * as lambda from '@aws-cdk/aws-lambda';
import { generateIntegStackName } from '@aws-solutions-constructs/core';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));

const lambdaProps: lambda.FunctionProps = {
  code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  runtime: lambda.Runtime.NODEJS_14_X,
  handler: 'index.handler'
};

const esDomain = 'domain-' + Aws.ACCOUNT_ID;
const cognitoDomain = 'mydomainfortesting';

new LambdaToElasticSearchAndKibana(stack, 'test-lambda-elasticsearch-kibana2', {
  lambdaFunctionProps: lambdaProps,
  domainName: esDomain,
  cognitoDomainName: cognitoDomain
});

// Synth
app.synth();
