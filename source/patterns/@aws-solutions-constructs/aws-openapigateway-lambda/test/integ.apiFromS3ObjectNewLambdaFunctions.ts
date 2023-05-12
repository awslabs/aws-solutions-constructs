/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import { App, Stack } from "aws-cdk-lib";
import { OpenApiGatewayToLambda } from "../lib";
import * as defaults from '@aws-solutions-constructs/core';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import * as s3deployment from "aws-cdk-lib/aws-s3-deployment";

const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-openapigateway-lambda';

const apiDefinitionBucket = defaults.CreateScrapBucket(stack, {
  autoDeleteObjects: true
});

new s3deployment.BucketDeployment(stack, 'ApiDefinitionBucket', {
  sources: [ s3deployment.Source.asset('./openapi') ],
  destinationBucket: apiDefinitionBucket
});

new OpenApiGatewayToLambda(stack, 'OpenApiGatewayToLambda', {
  apiDefinitionBucket,
  apiDefinitionKey: 'apiDefinition.yaml',
  apiIntegrations: [
    {
      id: 'MessagesHandler',
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(`${__dirname}/messages-lambda`),
      }
    },
    {
      id: 'PhotosHandler',
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(`${__dirname}/photos-lambda`),
      }
    }
  ]
});

defaults.SuppressCfnNagLambdaWarnings(stack);

app.synth();
