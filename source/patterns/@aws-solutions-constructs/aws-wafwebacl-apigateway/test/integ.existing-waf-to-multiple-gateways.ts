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
import { WafwebaclToApiGateway } from "../lib";
import * as waf from "@aws-cdk/aws-wafv2";
import * as lambda from '@aws-cdk/aws-lambda';
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import { ApiGatewayToLambda, ApiGatewayToLambdaProps } from '@aws-solutions-constructs/aws-apigateway-lambda';
import * as defaults from '@aws-solutions-constructs/core';

const app = new App();

// Empty arguments
const stack = new Stack(app, generateIntegStackName(__filename));

const props: ApiGatewayToLambdaProps = {
  lambdaFunctionProps: {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_12_X,
    handler: 'index.handler'
  },
};

const gatewayToLambda = new ApiGatewayToLambda(stack, 'ApiGatewayToLambda', props);

const lambdaFunction = defaults.buildLambdaFunction(stack, {
  existingLambdaObj: props.existingLambdaObj,
  lambdaFunctionProps: props.lambdaFunctionProps
});

let apiGateway;

const aclTest = new waf.CfnWebACL(stack, 'test-waf', {
  defaultAction: {
    allow: {}
  },
  scope: 'REGIONAL',
  visibilityConfig: {
    cloudWatchMetricsEnabled: true,
    metricName: 'webACL',
    sampledRequestsEnabled: true
  },
});

[apiGateway] = defaults.GlobalLambdaRestApi(stack, lambdaFunction, props.apiGatewayProps, props.logGroupProps);

const resourceArn = `arn:aws:apigateway:${Stack.of(stack).region}::/restapis/${apiGateway.restApiId}/stages/${apiGateway.deploymentStage.stageName}`;

new waf.CfnWebACLAssociation(stack, `test-WebACLAssociation`, {
  webAclArn: aclTest.attrArn,
  resourceArn
});

new WafwebaclToApiGateway(stack, 'test-wafwebacl-apigateway-lambda', {
  existingApiGatewayInterface: gatewayToLambda.apiGateway,
  existingWebaclObj: aclTest
});

app.synth();