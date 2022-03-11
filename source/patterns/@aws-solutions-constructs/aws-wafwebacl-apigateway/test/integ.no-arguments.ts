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
import { App, Stack } from "@aws-cdk/core";
import { WafwebaclToApiGateway } from "../lib";
import * as lambda from "@aws-cdk/aws-lambda";
import { generateIntegStackName } from "@aws-solutions-constructs/core";
import * as api from "@aws-cdk/aws-apigateway";
const app = new App();

// Empty arguments
const stack = new Stack(app, generateIntegStackName(__filename));

var lamdaFunction = new lambda.Function(stack, "testFunction", {
  code: lambda.Code.fromAsset(`${__dirname}/lambda`),
  runtime: lambda.Runtime.NODEJS_14_X,
  handler: ".handler",
});
const restApi = new api.LambdaRestApi(stack, "testApi", {
  handler: lamdaFunction,
});

new WafwebaclToApiGateway(stack, "test-wafwebacl-apigateway-lambda", {
  existingApiGatewayInterface: restApi,
});

app.synth();
