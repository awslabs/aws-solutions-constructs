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
import { App, Stack, RemovalPolicy } from "aws-cdk-lib";
import { CloudFrontToApiGatewayToLambda } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { BucketEncryption } from "aws-cdk-lib/aws-s3";
import { generateIntegStackName, suppressAutoDeleteHandlerWarnings } from '@aws-solutions-constructs/core';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-cloudfront-apigateway-lambda custom Cloudfront Logging Bucket';

new CloudFrontToApiGatewayToLambda(stack, 'cf-apigw-lambda', {
  lambdaFunctionProps: {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: 'index.handler'
  },
  cloudFrontLoggingBucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
    encryption: BucketEncryption.S3_MANAGED,
    versioned: true
  }
});
suppressAutoDeleteHandlerWarnings(stack);

// Synth
app.synth();
