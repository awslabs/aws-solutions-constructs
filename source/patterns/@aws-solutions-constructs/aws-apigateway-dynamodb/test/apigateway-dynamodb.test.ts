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
import { Stack } from "aws-cdk-lib";
import { ApiGatewayToDynamoDB, ApiGatewayToDynamoDBProps } from "../lib";
import "@aws-cdk/assert/jest";
import * as ddb from "aws-cdk-lib/aws-dynamodb";
import * as api from "aws-cdk-lib/aws-apigateway";

test("check properties", () => {
  const stack = new Stack();
  const apiGatewayToDynamoDBProps: ApiGatewayToDynamoDBProps = {};
  const construct = new ApiGatewayToDynamoDB( stack, "test-api-gateway-dynamodb-default", apiGatewayToDynamoDBProps);

  expect(construct.dynamoTable !== null);
  expect(construct.apiGateway !== null);
  expect(construct.apiGatewayRole !== null);
  expect(construct.apiGatewayCloudWatchRole !== null);
  expect(construct.apiGatewayLogGroup !== null);
});

test("check allow CRUD operations", () => {
  const stack = new Stack();
  const apiGatewayToDynamoDBProps: ApiGatewayToDynamoDBProps = {
    allowReadOperation: true,
    allowCreateOperation: true,
    createRequestTemplate: "{}",
    allowDeleteOperation: true,
    allowUpdateOperation: true,
    updateRequestTemplate: "{}",
  };
  new ApiGatewayToDynamoDB(stack, "test-api-gateway-dynamodb", apiGatewayToDynamoDBProps);

  expect(stack).toHaveResource("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: "dynamodb:PutItem",
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": ["testapigatewaydynamodbDynamoTableEEE3F463", "Arn"],
          },
        },
        {
          Action: "dynamodb:Query",
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": ["testapigatewaydynamodbDynamoTableEEE3F463", "Arn"],
          },
        },
        {
          Action: "dynamodb:UpdateItem",
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": ["testapigatewaydynamodbDynamoTableEEE3F463", "Arn"],
          },
        },
        {
          Action: "dynamodb:DeleteItem",
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": ["testapigatewaydynamodbDynamoTableEEE3F463", "Arn"],
          },
        },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "testapigatewaydynamodbapigatewayroleDefaultPolicy43AC565D",
    Roles: [
      {
        Ref: "testapigatewaydynamodbapigatewayrole961B19C4",
      },
    ],
  });

  expect(stack).toHaveResource("AWS::ApiGateway::Method", {
    HttpMethod: "GET",
    AuthorizationType: "AWS_IAM",
  });

  expect(stack).toHaveResource("AWS::ApiGateway::Method", {
    HttpMethod: "POST",
    AuthorizationType: "AWS_IAM",
  });

  expect(stack).toHaveResource("AWS::ApiGateway::Method", {
    HttpMethod: "PUT",
    AuthorizationType: "AWS_IAM",
  });

  expect(stack).toHaveResource("AWS::ApiGateway::Method", {
    HttpMethod: "DELETE",
    AuthorizationType: "AWS_IAM",
  });

  expect(stack).toHaveResource("AWS::ApiGateway::Resource", {
    PathPart: "{id}",
  });
});

test("check allow read and update only", () => {
  const stack = new Stack();
  const apiGatewayToDynamoDBProps: ApiGatewayToDynamoDBProps = {
    allowUpdateOperation: true,
    updateRequestTemplate: "{}",
  };
  new ApiGatewayToDynamoDB(stack, "test-api-gateway-dynamodb", apiGatewayToDynamoDBProps);

  expect(stack).toHaveResource("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: "dynamodb:Query",
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": ["testapigatewaydynamodbDynamoTableEEE3F463", "Arn"],
          },
        },
        {
          Action: "dynamodb:UpdateItem",
          Effect: "Allow",
          Resource: {
            "Fn::GetAtt": ["testapigatewaydynamodbDynamoTableEEE3F463", "Arn"],
          },
        },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "testapigatewaydynamodbapigatewayroleDefaultPolicy43AC565D",
    Roles: [
      {
        Ref: "testapigatewaydynamodbapigatewayrole961B19C4",
      },
    ],
  });

  expect(stack).toHaveResource("AWS::ApiGateway::Method", {
    HttpMethod: "GET",
    AuthorizationType: "AWS_IAM",
  });
});

test("check using custom partition key for dynamodb", () => {
  const stack = new Stack();
  const apiGatewayToDynamoDBProps: ApiGatewayToDynamoDBProps = {
    dynamoTableProps: {
      partitionKey: {
        name: "page_id",
        type: ddb.AttributeType.STRING,
      },
    },
  };
  new ApiGatewayToDynamoDB(stack, "test-api-gateway-dynamodb", apiGatewayToDynamoDBProps);

  expect(stack).toHaveResource("AWS::ApiGateway::Resource", {
    PathPart: "{page_id}",
  });
});

test("override apiGatewayProps for api gateway", () => {
  const stack = new Stack();
  const apiGatewayToDynamoDBProps: ApiGatewayToDynamoDBProps = {
    apiGatewayProps: {
      description: "This is a sample description for api gateway",
    },
  };
  new ApiGatewayToDynamoDB(stack, "test-api-gateway-dynamodb", apiGatewayToDynamoDBProps);

  expect(stack).toHaveResource("AWS::ApiGateway::RestApi", {
    Description: "This is a sample description for api gateway",
  });
});

test("Test deployment ApiGateway AuthorizationType override", () => {
  const stack = new Stack();
  new ApiGatewayToDynamoDB(stack, "api-gateway-dynamodb", {
    apiGatewayProps: {
      defaultMethodOptions: {
        authorizationType: api.AuthorizationType.NONE,
      },
    },
  });

  expect(stack).toHaveResourceLike("AWS::ApiGateway::Method", {
    HttpMethod: "GET",
    AuthorizationType: "NONE",
  });
});

test("Test deployment with existing DynamoDB table", () => {
  const oddPartitionKeyName = 'oddName';
  const oddReadCapacity = 23;

  const stack = new Stack();
  const table = new ddb.Table(stack, "existing-table", {
    partitionKey: {
      name: oddPartitionKeyName,
      type: ddb.AttributeType.STRING,
    },
    readCapacity: oddReadCapacity
  });

  const apiGatewayToDynamoDBProps: ApiGatewayToDynamoDBProps = {
    existingTableObj: table
  };
  new ApiGatewayToDynamoDB(stack, "test-api-gateway-dynamodb-default", apiGatewayToDynamoDBProps);
  // Confirm there is only the one table
  expect(stack).toCountResources("AWS::DynamoDB::Table", 1);

  // Confirm that the one table is the one create here
  expect(stack).toHaveResourceLike("AWS::DynamoDB::Table", {
    ProvisionedThroughput: {
      ReadCapacityUnits: oddReadCapacity,
    }
  });

  expect(stack).toHaveResource("AWS::ApiGateway::Resource", {
    PathPart: `{${oddPartitionKeyName}}`,
  });
});

test("check setting allowReadOperation=false for dynamodb", () => {
  const stack1 = new Stack();

  new ApiGatewayToDynamoDB(stack1, "test-api-gateway-dynamodb1", {
    allowReadOperation: true,
    allowDeleteOperation: true
  });

  // Expect two APIG Methods (GET, DELETE) for allowReadOperation and allowDeleteOperation
  expect(stack1).toCountResources("AWS::ApiGateway::Method", 2);

  const stack2 = new Stack();

  new ApiGatewayToDynamoDB(stack2, "test-api-gateway-dynamodb2", {
    allowReadOperation: false,
    allowDeleteOperation: true
  });

  // Expect only one APIG Method (DELETE) for allowDeleteOperation
  expect(stack2).toCountResources("AWS::ApiGateway::Method", 1);
});