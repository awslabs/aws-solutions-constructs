/**
 *  Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import * as ddb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';

// Stack
export class SharedStack extends cdk.Stack {

  // Public variables
  public readonly database: ddb.Table;
  public readonly layer: lambda.LayerVersion;

  // Constructor
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Setup the database ----------------------------------------------------------------------------------------------
    this.database = new ddb.Table(this, "order-table", {
      partitionKey: {
        name: "id",
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PROVISIONED,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Add autoscaling
    const readScaling = this.database.autoScaleReadCapacity({
      minCapacity: 1,
      maxCapacity: 50,
    });

    readScaling.scaleOnUtilization({
      targetUtilizationPercent: 50,
    });

    // Add a global secondary index for query operations
    this.database.addGlobalSecondaryIndex({
      partitionKey: {
        name: "gsi1pk",
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: "gsi1sk",
        type: ddb.AttributeType.STRING,
      },
      indexName: "gsi1pk-gsi1sk-index",
    });

    // Setup a Lambda layer for sharing database functions -------------------------------------------------------------
    this.layer = new lambda.LayerVersion(this, 'shared-db-functions-layer', {
      code: lambda.Code.fromAsset(`${__dirname}/lambda/layer`),
      compatibleRuntimes: [ lambda.Runtime.NODEJS_14_X ],
      license: 'Apache-2.0',
      description: 'Layer for common database access functions',
    });
  }
}