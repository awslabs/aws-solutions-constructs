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

// Imports
import { App, Stack } from "aws-cdk-lib";
import { ApiGatewayToSqs, ApiGatewayToSqsProps } from "../lib";
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as api from 'aws-cdk-lib/aws-apigateway';
// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-apigateway-sqs';

// Definitions
const props: ApiGatewayToSqsProps = {
  allowCreateOperation: true,
  messageSchema: {
    "application/json": {
      schema: api.JsonSchemaVersion.DRAFT4,
      title: 'pollResponse',
      type: api.JsonSchemaType.OBJECT,
      required: ['state', 'greeting'],
      additionalProperties: false,
      properties: {
        state: { type: api.JsonSchemaType.STRING },
        greeting: { type: api.JsonSchemaType.STRING }
      }
    },
    "application/text": {
      schema: api.JsonSchemaVersion.DRAFT4,
      title: 'pollResponse',
      type: api.JsonSchemaType.OBJECT,
      additionalProperties: false,
      properties: {
        textstate: { type: api.JsonSchemaType.STRING },
        textgreeting: { type: api.JsonSchemaType.STRING }
      }
    }
  }
};

new ApiGatewayToSqs(stack, 'test-api-gateway-sqs', props);

// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });