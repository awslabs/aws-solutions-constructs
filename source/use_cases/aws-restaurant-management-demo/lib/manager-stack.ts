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
import * as events from '@aws-cdk/aws-events';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as sftasks from '@aws-cdk/aws-stepfunctions-tasks';
import * as s3 from '@aws-cdk/aws-s3';
import { CognitoToApiGatewayToLambda } from '@aws-solutions-constructs/aws-cognito-apigateway-lambda';
import { LambdaToDynamoDB } from '@aws-solutions-constructs/aws-lambda-dynamodb';
import { LambdaToS3 } from '@aws-solutions-constructs/aws-lambda-s3';
import { LambdaToSns } from '@aws-solutions-constructs/aws-lambda-sns';
import { EventsRuleToLambda } from '@aws-solutions-constructs/aws-events-rule-lambda';
import { LambdaToStepFunction } from '@aws-solutions-constructs/aws-lambda-step-function';

// Properties for the manager-stack
export interface ManagerStackProps {
  // The main database created in the shared-stack
  readonly db: dynamodb.Table,
  // The existing S3 bucket for orders to be archived to upon close-out
  readonly archiveBucket: s3.Bucket,
  // The Lambda layer for sharing database access functions
  readonly layer: lambda.ILayerVersion
}

// Stack
export class ManagerStack extends cdk.Stack {

  // Constructor
  constructor(scope: cdk.Construct, id: string, props: ManagerStackProps) {
    super(scope, id);

    // Create a Lambda function that lists all orders from the database
    const getAllOrders = new LambdaToDynamoDB(this, 'get-all-orders', {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_14_X,
        code: lambda.Code.fromAsset(`${__dirname}/lambda/manager/get-all-orders`),
        handler: 'index.handler',
        timeout: cdk.Duration.seconds(15),
        layers: [ props.layer ]
      },
      existingTableObj: props.db
    });

    // Create a Lambda function that will generate a report from information in the database
    // Runs as part of the close-out process
    const createReport = new LambdaToDynamoDB(this, 'create-report', {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_14_X,
        code: lambda.Code.fromAsset(`${__dirname}/lambda/manager/create-report`),
        handler: 'index.handler',
        timeout: cdk.Duration.seconds(15)
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
        runtime: lambda.Runtime.NODEJS_14_X,
        code: lambda.Code.fromAsset(`${__dirname}/lambda/manager/calculate-tips`),
        handler: 'index.handler',
        timeout: cdk.Duration.seconds(15)
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
        runtime: lambda.Runtime.NODEJS_14_X,
        code: lambda.Code.fromAsset(`${__dirname}/lambda/manager/archive-orders`),
        handler: 'index.handler',
        timeout: cdk.Duration.seconds(15),
        environment: {
          ARCHIVE_BUCKET_NAME: props.archiveBucket.bucketName,
        }
      },
      existingTableObj: props.db
    });
    // Use the LambdaToS3 construct to connect the archiveOrders function with the existing bucket
    new LambdaToS3(this, 'archive-orders-to-bucket', {
      existingBucketObj: props.archiveBucket,
      existingLambdaObj: archiveOrders.lambdaFunction
    });

    // Create a Lambda function that will retrieve a specific report from the bucket
    const getReport = new LambdaToS3(this, 'get-report', {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_14_X,
        code: lambda.Code.fromAsset(`${__dirname}/lambda/manager/get-report`),
        handler: 'index.handler',
        timeout: cdk.Duration.seconds(15)
      },
      existingBucketObj: reports.s3Bucket
    });

    // Setup the chain of events for the close-out process (via Step Function)
    // 1. Add a task for invoking the create-report function
    const createReportTask = new sfn.Task(this, 'create-reports-task', {
    	task: new sftasks.InvokeFunction(createReport.lambdaFunction)
    });
    // 2. Add a task for invoking the calculate-tips function
    const calculateTipsTask = new sfn.Task(this, 'calculate-tips-task', {
    	task: new sftasks.InvokeFunction(calculateTips.lambdaFunction)
    });
    // 3. Add a task for invoking the archive-orders function
    const archiveOrdersTask = new sfn.Task(this, 'archive-orders-task', {
    	task: new sftasks.InvokeFunction(archiveOrders.lambdaFunction)
    });
    // 4. Setup the chain
    const chain = sfn.Chain.start(createReportTask)
    	.next(calculateTipsTask)
    	.next(archiveOrdersTask);
    // 5. Setup the Step Functions integration with Lambda trigger
    const closeOutService = new LambdaToStepFunction(this, 'close-out-service', {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_14_X,
        code: lambda.Code.fromAsset(`${__dirname}/lambda/manager/close-out-service`),
        handler: 'index.handler',
        timeout: cdk.Duration.seconds(15)
      },
      stateMachineProps: {
    	  definition: chain
      }
    });
    // 6. Add the state machine ARN to the Lambda function environment variables
    closeOutService.lambdaFunction.addEnvironment('STATE_MACHINE_ARN', closeOutService.stateMachine.stateMachineArn);
    
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
        runtime: lambda.Runtime.NODEJS_14_X,
        code: lambda.Code.fromAsset(`${__dirname}/lambda/manager/check-late-orders`),
        handler: 'index.handler',
        environment: {
          LATE_ORDER_THRESHOLD: '30'
        },
        timeout: cdk.Duration.seconds(15)
      },
      existingTableObj: props.db
    });
    
    // Create a CloudWatch Events rule to check for late orders every minute
    new EventsRuleToLambda(this, 'check-late-orders-scheduler', {
    	existingLambdaObj: checkLateOrders.lambdaFunction,
    	eventRuleProps: {
	      schedule: events.Schedule.rate(cdk.Duration.minutes(5))
	    }
    });
    
    // Create an SNS topic to send notifications to the manager when one or more orders are late
    new LambdaToSns(this, 'check-late-orders-notifier', {
    	existingLambdaObj: checkLateOrders.lambdaFunction
    });
  }
}