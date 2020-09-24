/**
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { LambdaToDynamoDB } from "../lib";
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
const app = new App();

// Change the billing mode to PROVISIONED
const stack = new Stack(app, 'test-lambda-dynamodb-stack');

const construct: LambdaToDynamoDB = new LambdaToDynamoDB(stack, 'test-lambda-dynamodb-stack', {
    lambdaFunctionProps: {
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
        runtime: lambda.Runtime.NODEJS_10_X,
        handler: 'index.handler'
    },
});

const props: dynamodb.GlobalSecondaryIndexProps = {
    partitionKey: {
        name: 'id2',
        type: dynamodb.AttributeType.STRING
    },
    indexName: 'test_id2'
};
construct.dynamoTable.addGlobalSecondaryIndex(props);

app.synth();