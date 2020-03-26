/**
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { CloudFrontToApiGatewayToLambda } from "../lib";
import * as lambda from '@aws-cdk/aws-lambda';

// Setup
const app = new App();
const stack = new Stack(app, 'test-cloudfront-apigateway-lambda-stack');
stack.templateOptions.description = 'Integration Test for aws-cloudfront-apigateway-lambda';

const lambdaProps: lambda.FunctionProps = {
    code: lambda.Code.asset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_10_X,
    handler: 'index.handler'
};

new CloudFrontToApiGatewayToLambda(stack, 'test-cloudfront-apigateway-lambda', {
    lambdaFunctionProps: lambdaProps,
    deployLambda: true
});

// Synth
app.synth();
