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
import { Stack, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import * as cfg from './config';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import {
  CognitoToApiGatewayToLambda
} from '@aws-solutions-constructs/aws-cognito-apigateway-lambda';
import {
  LambdaToDynamoDB
} from '@aws-solutions-constructs/aws-lambda-dynamodb';

// Properties for the service-staff-stack
export interface ServiceStaffStackProps {
  // The main database created in the shared-stack
  readonly db: ddb.Table,
}

// Stack
export class ServiceStaffStack extends Stack {

  // Constructor
  constructor(scope: Construct, id: string, props: ServiceStaffStackProps) {
    super(scope, id);

    // Create a Lambda function that adds a new order to the database
    const createOrder = new LambdaToDynamoDB(this, 'create-order', {
      lambdaFunctionProps: {
        runtime: cfg.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        code: lambda.Code.fromAsset(`${__dirname}/lambda/service-staff/create-order`),
        handler: 'index.handler',
        timeout: Duration.seconds(15)
      },
      existingTableObj: props.db
    });

    // Create a Lambda function that closes out an order in the table
    const processPayment = new LambdaToDynamoDB(this, 'process-payment', {
      lambdaFunctionProps: {
        runtime: cfg.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        code: lambda.Code.fromAsset(`${__dirname}/lambda/service-staff/process-payment`),
        handler: 'index.handler',
        timeout: Duration.seconds(15)
      },
      existingTableObj: props.db
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