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
import * as cfg from './config';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as events from 'aws-cdk-lib/aws-events';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { CognitoToApiGatewayToLambda } from '@aws-solutions-constructs/aws-cognito-apigateway-lambda';
import { LambdaToDynamoDB } from '@aws-solutions-constructs/aws-lambda-dynamodb';
import { LambdaToS3 } from '@aws-solutions-constructs/aws-lambda-s3';
import { LambdaToSns } from '@aws-solutions-constructs/aws-lambda-sns';
import { EventbridgeToLambda } from '@aws-solutions-constructs/aws-eventbridge-lambda';
import { LambdaToStepfunctions } from '@aws-solutions-constructs/aws-lambda-stepfunctions';

// Properties for the manager-stack
export interface ManagerStackProps {
  // The main database created in the shared-stack
  readonly db: ddb.Table,
  // The existing S3 bucket for orders to be archived to upon close-out
  readonly archiveBucket: s3.Bucket,
  // The Lambda layer for sharing database access functions
  readonly layer: lambda.LayerVersion
}

// Stack
export class ManagerStack extends Stack {

  // Constructor
  constructor(scope: Construct, id: string, props: ManagerStackProps) {
    super(scope, id);

    // Create a Lambda function that lists all orders from the database
    const getAllOrders = new LambdaToDynamoDB(this, 'get-all-orders', {
      lambdaFunctionProps: {
        runtime: cfg.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        code: lambda.Code.fromAsset(`${__dirname}/lambda/manager/get-all-orders`),
        handler: 'index.handler',
        timeout: Duration.seconds(15),
        layers: [ props.layer ]
      },
      existingTableObj: props.db
    });

    // Create a Lambda function that will generate a report from information in the database
    // Runs as part of the close-out process
    const createReport = new LambdaToDynamoDB(this, 'create-report', {
      lambdaFunctionProps: {
        runtime: cfg.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        code: lambda.Code.fromAsset(`${__dirname}/lambda/manager/create-report`),
        handler: 'index.handler',
        timeout: Duration.seconds(15),
        layers: [ props.layer ]
      },
      existingTableObj: props.db
    });

    // Create an S3 bucket for storing generated reports
    const reports = new LambdaToS3(this, 'reports-bucket', {
    	existingLambdaObj: createReport.lambdaFunction,
    });

    // Create a Lambda function that will calculate tips based on orders in the database
    // Runs as part of the close-out process
    const calculateTips = new LambdaToDynamoDB(this, 'calculate-tips', {
      lambdaFunctionProps: {
        runtime: cfg.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        code: lambda.Code.fromAsset(`${__dirname}/lambda/manager/calculate-tips`),
        handler: 'index.handler',
        timeout: Duration.seconds(15),
        layers: [ props.layer ]
      },
      existingTableObj: props.db
    });
    // Create a topic for tip reports to be sent to -> sends an email to service staff workers
    new LambdaToSns(this, 'calculate-tips-topic', {
      existingLambdaObj: calculateTips.lambdaFunction
    });

    // Create a Lambda function that will archive the items in the database to the existing S3 bucket
    // Runs as part of the close-out process
    const archiveOrders = new LambdaToDynamoDB(this, 'archive-orders', {
      lambdaFunctionProps: {
        runtime: cfg.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        code: lambda.Code.fromAsset(`${__dirname}/lambda/manager/archive-orders`),
        handler: 'index.handler',
        timeout: Duration.seconds(15),
        layers: [ props.layer ]
      },
      existingTableObj: props.db
    });
    // Use the LambdaToS3 construct to connect the archiveOrders function with the existing bucket
    new LambdaToS3(this, 'archive-orders-to-bucket', {
      existingBucketObj: props.archiveBucket,
      existingLambdaObj: archiveOrders.lambdaFunction
    });

    // Setup the chain of events for the close-out process (via Step Function)
    // 1. Add a task for invoking the create-report function
    const createReportTask = new tasks.LambdaInvoke(this, 'create-reports-task', {
      lambdaFunction: createReport.lambdaFunction
    })

    // 2. Add a task for invoking the calculate-tips function
    const calculateTipsTask = new tasks.LambdaInvoke(this, 'calculate-tips-task', {
      lambdaFunction: calculateTips.lambdaFunction
    })

    // 3. Add a task for invoking the archive-orders function
    const archiveOrdersTask = new tasks.LambdaInvoke(this, 'archive-orders-task', {
      lambdaFunction: archiveOrders.lambdaFunction
    })

    // 4. Setup the chain
    const chain = sfn.Chain.start(createReportTask)
    	.next(calculateTipsTask)
    	.next(archiveOrdersTask);
    // 5. Setup the Step Functions integration with Lambda trigger
    const closeOutService = new LambdaToStepfunctions(this, 'close-out-service', {
      lambdaFunctionProps: {
        runtime: cfg.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        code: lambda.Code.fromAsset(`${__dirname}/lambda/manager/close-out-service`),
        handler: 'index.handler',
        timeout: Duration.seconds(15)
      },
      stateMachineProps: {
    	  definition: chain
      }
    });

    // Create a Lambda function that will retrieve a specific report from the bucket
    const getReport = new LambdaToS3(this, 'get-report', {
      lambdaFunctionProps: {
        runtime: cfg.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        code: lambda.Code.fromAsset(`${__dirname}/lambda/manager/get-report`),
        handler: 'index.handler',
        timeout: Duration.seconds(15)
      },
      existingBucketObj: reports.s3Bucket
    });

    // Setup the manager API with Cognito user pool
    const managerApi = new CognitoToApiGatewayToLambda(this, 'manager-api', {
    	existingLambdaObj: getAllOrders.lambdaFunction,
		  apiGatewayProps: {
	      proxy: false,
        description: 'Demo: Manager API'
	    }
    });

    // Add a resource to the API for listing all orders
    const listOrdersResource = managerApi.apiGateway.root.addResource('get-all-orders');
    listOrdersResource.addProxy({
    	defaultIntegration: new apigateway.LambdaIntegration(managerApi.lambdaFunction),
    	anyMethod: true
    });

    // Add a resource to the API for triggering the close-out process
    const closeOutServiceResource = managerApi.apiGateway.root.addResource('close-out-service');
    closeOutServiceResource.addProxy({
    	defaultIntegration: new apigateway.LambdaIntegration(closeOutService.lambdaFunction),
    	anyMethod: true
    });

    // Add a resource to the API for viewing reports
    const getReportResource = managerApi.apiGateway.root.addResource('get-report');
    getReportResource.addProxy({
    	defaultIntegration: new apigateway.LambdaIntegration(getReport.lambdaFunction),
    	anyMethod: true
    });

    // Add the authorizers to the API
    managerApi.addAuthorizers();

    // Create a Lambda function for identifying orders that have been open for too long
    const checkLateOrders = new LambdaToDynamoDB(this, 'check-late-orders', {
      lambdaFunctionProps: {
        runtime: cfg.COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        code: lambda.Code.fromAsset(`${__dirname}/lambda/manager/check-late-orders`),
        handler: 'index.handler',
        environment: {
          LATE_ORDER_THRESHOLD: '30'
        },
        timeout: Duration.seconds(15)
      },
      existingTableObj: props.db
    });

    // Create a CloudWatch Events rule to check for late orders every minute
    new EventbridgeToLambda(this, 'check-late-orders-scheduler', {
    	existingLambdaObj: checkLateOrders.lambdaFunction,
    	eventRuleProps: {
	      schedule: events.Schedule.rate(Duration.minutes(1))
	    }
    });

    // Create an SNS topic to send notifications to the manager when one or more orders are late
    new LambdaToSns(this, 'check-late-orders-notifier', {
    	existingLambdaObj: checkLateOrders.lambdaFunction
    });
  }
}