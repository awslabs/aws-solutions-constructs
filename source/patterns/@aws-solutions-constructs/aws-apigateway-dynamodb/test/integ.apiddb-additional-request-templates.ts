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
import { ApiGatewayToDynamoDB } from "../lib";
import { addCfnGuardSuppressRules, generateIntegStackName, SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
SetConsistentFeatureFlags(stack);
stack.templateOptions.description = 'Integration Test for aws-apigateway-dynamodb';

const partitionKeyName = 'id';

const existingTableObj = new dynamodb.Table(stack, 'existing-table', {
  partitionKey: {
    name: partitionKeyName,
    type: dynamodb.AttributeType.STRING,
  },
  pointInTimeRecovery: true,
  encryption: dynamodb.TableEncryption.AWS_MANAGED,
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
});
addCfnGuardSuppressRules(existingTableObj, ["DYNAMODB_TABLE_ENCRYPTED_KMS"]);

new ApiGatewayToDynamoDB(stack, 'test-api-gateway-dynamodb-additional-request-templates', {
  existingTableObj,
  additionalReadRequestTemplates: {
    'text/plain': `{ \
      "TableName": "${existingTableObj.tableName}", \
      "KeyConditionExpression": "${partitionKeyName} = :v1", \
      "ExpressionAttributeValues": { \
        ":v1": { \
          "S": "$input.params('${partitionKeyName}')" \
        } \
      } \
    }`
  }
});

// Synth
new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
