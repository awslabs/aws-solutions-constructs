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
import { CloudFrontToApiGatewayToLambda } from "../lib";
import * as lambda from '@aws-cdk/aws-lambda';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as cdk from '@aws-cdk/core';
import { Duration } from "@aws-cdk/core/lib/duration";
import * as origins from '@aws-cdk/aws-cloudfront-origins';

// Setup
const app = new App();
const stack = new Stack(app, 'test-cf-api-lambda-override-stack');
stack.templateOptions.description = 'Integration Test for aws-cloudfront-apigateway-lambda';

const lambdaProps: lambda.FunctionProps = {
  code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  runtime: lambda.Runtime.NODEJS_10_X,
  handler: 'index.handler'
};

// Some Caching for static content
const someCachePolicy = new cloudfront.CachePolicy(stack, 'SomeCachePolicy', {
  cachePolicyName: 'SomeCachePolicy',
  defaultTtl: Duration.hours(8),
  minTtl: Duration.hours(5),
  maxTtl: Duration.hours(10),
});

// Disable Caching for dynamic content
const noCachePolicy = new cloudfront.CachePolicy(stack, 'NoCachePolicy', {
  cachePolicyName: 'NoCachePolicy',
  defaultTtl: Duration.minutes(0),
  minTtl: Duration.minutes(0),
  maxTtl: Duration.minutes(0),
});

const construct = new CloudFrontToApiGatewayToLambda(stack, 'cf-api-lambda-override', {
  lambdaFunctionProps: lambdaProps,
  apiGatewayProps: {
    proxy: false,
    defaultMethodOptions: {
      authorizationType: apigateway.AuthorizationType.NONE,
    },
  },
  cloudFrontDistributionProps: {
    defaultBehavior: {
      cachePolicy: someCachePolicy
    }
  }
});

const apiEndPoint = construct.apiGateway;
const apiEndPointUrlWithoutProtocol = cdk.Fn.select(1, cdk.Fn.split("://", apiEndPoint.url));
const apiEndPointDomainName = cdk.Fn.select(0, cdk.Fn.split("/", apiEndPointUrlWithoutProtocol));

const staticResource = construct.apiGateway.root.addResource('static');
const staticMethod = staticResource.addMethod('GET', new apigateway.HttpIntegration('http://amazon.com'));

const dynamicResource = construct.apiGateway.root.addResource('dynamic');
const dynamicMethod = dynamicResource.addMethod('GET');

// Add behavior
construct.cloudFrontWebDistribution.addBehavior('/dynamic', new origins.HttpOrigin(apiEndPointDomainName, {
  originPath: `/${apiEndPoint.deploymentStage.stageName}/dynamic`
}), {
  cachePolicy: noCachePolicy
});
// Suppress CFN_NAG warnings
suppressWarnings(staticMethod);
suppressWarnings(dynamicMethod);

function suppressWarnings(method: apigateway.Method) {
  const child = method.node.findChild('Resource') as apigateway.CfnMethod;
  child.cfnOptions.metadata = {
    cfn_nag: {
      rules_to_suppress: [{
        id: 'W59',
        reason: `AWS::ApiGateway::Method AuthorizationType is set to 'NONE' because API Gateway behind CloudFront does not support AWS_IAM authentication`
      }]
    }
  };
}

// Synth
app.synth();
