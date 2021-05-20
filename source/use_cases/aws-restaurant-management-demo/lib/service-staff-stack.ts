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

// Properties for the service-staff-stack
export interface Resources {
  // The main database created in the shared-stack
  readonly db: dynamodb.Table,
}

// Stack
export class ServiceStaffStack extends cdk.Stack {
  
  // Constructor
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps, resources: Resources) {
    super(scope, id, props);

    // Create a Lambda function that adds a new order to the database
    const createOrder = new LambdaToDynamoDB(this, 'create-order', {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_14_X,
        code: lambda.Code.fromAsset(`${__dirname}/lambda/service-staff/create-order`),
        handler: 'index.handler',
        timeout: cdk.Duration.seconds(15)
      },
      existingTableObj: resources.db
    });

    // Create a Lambda function that marks orders as paid in the database
    const processPayment = new LambdaToDynamoDB(this, 'process-payment', {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_14_X,
        code: lambda.Code.fromAsset(`${__dirname}/lambda/service-staff/process-payment`),
        handler: 'index.handler',
        timeout: cdk.Duration.seconds(15)
      },
      existingTableObj: resources.db
    });

    // Setup the service staff API with Cognito user pool
    const serviceStaffApi = new CognitoToApiGatewayToLambda(this, 'service-staff-api', {
    	existingLambdaObj: createOrder.lambdaFunction,
		  apiGatewayProps: {
	      proxy: false,
        description: 'Demo: Service staff API'
	    }
    });
    
    // Add a resource to the API for creating a new order
    const createOrderResource = serviceStaffApi.apiGateway.root.addResource('create-order');
    createOrderResource.addProxy({
    	defaultIntegration: new apigateway.LambdaIntegration(serviceStaffApi.lambdaFunction),
    	anyMethod: true
    });
    
    // Add a resource to the API for handling payments and marking orders as paid
    const processPaymentResource = serviceStaffApi.apiGateway.root.addResource('process-payment');
    processPaymentResource.addProxy({
    	defaultIntegration: new apigateway.LambdaIntegration(processPayment.lambdaFunction),
    	anyMethod: true
    });
    
    // Add the authorizers to the API
    serviceStaffApi.addAuthorizers();
  }
}