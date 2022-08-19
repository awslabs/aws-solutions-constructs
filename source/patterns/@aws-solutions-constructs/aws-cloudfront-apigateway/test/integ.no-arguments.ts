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
import { App, RemovalPolicy, Stack } from "aws-cdk-lib";
import { CloudFrontToApiGateway } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as defaults from '@aws-solutions-constructs/core';
import * as api from 'aws-cdk-lib/aws-apigateway';
import { generateIntegStackName } from '@aws-solutions-constructs/core';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-cloudfront-apigateway';

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

new CloudFrontToApiGateway(stack, 'test-cloudfront-apigateway', {
  existingApiGatewayObj: _api,
  cloudFrontLoggingBucketProps: {
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true
  },
});

defaults.suppressAutoDeleteHandlerWarnings(stack);
// Synth
app.synth();
