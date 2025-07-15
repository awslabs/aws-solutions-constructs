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
import { DynamoDBStreamsToLambdaProps, DynamoDBStreamsToLambda } from "../lib";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { addCfnGuardSuppressRules, generateIntegStackName, SetConsistentFeatureFlags } from '@aws-solutions-constructs/core';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as defaults from '@aws-solutions-constructs/core';

const app = new App();

const stack = new Stack(app, generateIntegStackName(__filename));
SetConsistentFeatureFlags(stack);

const table = new dynamodb.Table(stack, 'mytable', {
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  encryption: dynamodb.TableEncryption.AWS_MANAGED,
  pointInTimeRecovery: true,
  partitionKey: {
    name: 'id',
    type: dynamodb.AttributeType.STRING
  },
  stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
});
addCfnGuardSuppressRules(table, ["DYNAMODB_TABLE_ENCRYPTED_KMS"]);

const props: DynamoDBStreamsToLambdaProps = {
  lambdaFunctionProps: {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: defaults.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    handler: 'index.handler'
  },
  existingTableInterface: table
};

new DynamoDBStreamsToLambda(stack, 'test-dynamodbstreams-lambda', props);

new IntegTest(stack, 'Integ', { testCases: [
  stack
] });
