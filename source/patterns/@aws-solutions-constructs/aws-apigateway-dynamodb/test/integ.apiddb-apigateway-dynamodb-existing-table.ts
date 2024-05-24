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
import { ApiGatewayToDynamoDBProps, ApiGatewayToDynamoDB } from "../lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { BillingMode } from "aws-cdk-lib/aws-dynamodb";
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-apigateway-dynamodb';

const oddPartitionKeyName = 'oddName';

const table = new dynamodb.Table(stack, 'existing-table', {
  partitionKey: {
    name: oddPartitionKeyName,
    type: dynamodb.AttributeType.STRING,
  },
  pointInTimeRecovery: true,
  encryption: dynamodb.TableEncryption.AWS_MANAGED,
  billingMode: BillingMode.PAY_PER_REQUEST
});

// Definitions
const props: ApiGatewayToDynamoDBProps = {
  existingTableObj: table,
};

new ApiGatewayToDynamoDB(stack, 'test-api-gateway-dynamodb-default', props);

// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
