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

// Imports
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as apigateway from '@aws-cdk/aws-apigateway';
import {
  CognitoToApiGatewayToLambda
} from '@aws-solutions-constructs/aws-cognito-apigateway-lambda';
import {
  LambdaToDynamoDB
} from '@aws-solutions-constructs/aws-lambda-dynamodb';

// Properties for the kitchen-staff-stack
export interface Resources {
  // The main database created in the shared-stack
  readonly db: dynamodb.Table,
}

// Stack
export class KitchenStaffStack extends cdk.Stack {

  // Constructor
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps, resources: Resources) {
    super(scope, id, props);

    // Create a Lambda function that lists all open orders in the database
    const getOpenOrders = new LambdaToDynamoDB(this, 'get-open-orders', {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_14_X,
        code: lambda.Code.fromAsset(`${__dirname}/lambda/kitchen-staff/get-open-orders`),
        handler: 'get-open-orders.handler',
        timeout: cdk.Duration.seconds(15)
      },
      existingTableObj: resources.db
    });

    // Create a Lambda function that marks an order as completed in the database
    const completeOrder = new LambdaToDynamoDB(this, 'complete-order', {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_14_X,
        code: lambda.Code.fromAsset(`${__dirname}/lambda/kitchen-staff/complete-order`),
        handler: 'complete-order.handler',
        timeout: cdk.Duration.seconds(15)
      },
      existingTableObj: resources.db
    });

    // Setup the kitchen staff API with Cognito user pool
    const kitchenStaffApi = new CognitoToApiGatewayToLambda(this, 'kitchen-staff-api', {
      existingLambdaObj: getOpenOrders.lambdaFunction,
      apiGatewayProps: {
        proxy: false,
        description: 'Demo: Kitchen staff API'
      }
    });

    // Add a resource to the API for listing all open orders
    const listOpenOrdersResource = kitchenStaffApi.apiGateway.root.addResource('get-open-orders');
    listOpenOrdersResource.addProxy({
      defaultIntegration: new apigateway.LambdaIntegration(kitchenStaffApi.lambdaFunction),
      anyMethod: true
    });

    // Add a resource to the API for completing orders
    const completeOrderResource = kitchenStaffApi.apiGateway.root.addResource('complete-order');
    completeOrderResource.addProxy({
      defaultIntegration: new apigateway.LambdaIntegration(completeOrder.lambdaFunction),
      anyMethod: true
    });

    // Add the authorizers to the API
    kitchenStaffApi.addAuthorizers();
  }
}