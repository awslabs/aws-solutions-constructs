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
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import { ApiGatewayToSageMakerEndpoint } from '@aws-solutions-constructs/aws-apigateway-sagemakerendpoint';

const app = new App();

// Empty arguments
const stack = new Stack(app, generateIntegStackName(__filename));

const gatewayToSageMakerEndpoint = new ApiGatewayToSageMakerEndpoint(stack, 'api-gateway-sagemakerendpoint', {
  endpointName: 'my-endpoint',
  resourcePath: '{my_param}',
  requestMappingTemplate: 'my-request-vtl-template'
});

new WafwebaclToApiGateway(stack, 'test-wafwebacl-apigateway-SageMakerEndpoint', {
  existingApiGatewayInterface: gatewayToSageMakerEndpoint.apiGateway
});

app.synth();