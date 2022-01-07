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
import { App, Stack, RemovalPolicy } from "@aws-cdk/core";
import { CloudFrontToApiGateway } from "../lib";
import { BucketEncryption } from "@aws-cdk/aws-s3";
import * as lambda from '@aws-cdk/aws-lambda';
import * as defaults from '@aws-solutions-constructs/core';
import * as api from '@aws-cdk/aws-apigateway';
import { generateIntegStackName } from '@aws-solutions-constructs/core';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-cloudfront-apigateway custom Cloudfront Logging Bucket';

const inProps: lambda.FunctionProps = {
  code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  runtime: lambda.Runtime.NODEJS_14_X,
  handler: 'index.handler'
};

const func = defaults.deployLambdaFunction(stack, inProps);

const [_api] = defaults.RegionalLambdaRestApi(stack, func);

_api.methods.forEach((apiMethod) => {
  // Override the API Gateway Authorization Type from AWS_IAM to NONE
  const child = apiMethod.node.findChild('Resource') as api.CfnMethod;
  if (child.authorizationType === 'AWS_IAM') {
    child.addPropertyOverride('AuthorizationType', 'NONE');

    defaults.addCfnSuppressRules(apiMethod, [
      {
        id: "W59",
        reason: `AWS::ApiGateway::Method AuthorizationType is set to 'NONE' because API Gateway behind CloudFront does not support AWS_IAM authentication`,
      },
    ]);

  }
});

new CloudFrontToApiGateway(stack, 'cf-apigw', {
  existingApiGatewayObj: _api,
  cloudFrontLoggingBucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    encryption: BucketEncryption.S3_MANAGED,
    versioned: true
  }
});

// Synth
app.synth();
