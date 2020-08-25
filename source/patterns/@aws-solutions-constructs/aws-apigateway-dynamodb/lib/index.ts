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

import * as api from '@aws-cdk/aws-apigateway';
import * as iam from '@aws-cdk/aws-iam';
import * as defaults from '@aws-solutions-constructs/core';
import { Construct } from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { overrideProps } from '@aws-solutions-constructs/core';
import { LogGroup } from '@aws-cdk/aws-logs';

/**
 * @summary The properties for the ApiGatewayToDynamoDB class.
 */
export interface ApiGatewayToDynamoDBProps {
  /**
   * Optional user provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly dynamoTableProps?: dynamodb.TableProps,
  /**
   * Optional user-provided props to override the default props for the API Gateway.
   *
   * @default - Default properties are used.
   */
  readonly apiGatewayProps?: api.RestApiProps,

  /**
   * Whether to deploy API Gateway Method for Create operation on DynamoDB table.
   *
   * @default - false
   */
  readonly allowCreateOperation?: boolean,

  /**
   * API Gateway Request template for Create method, required if allowCreateOperation set to true
   *
   * @default - None
   */
  readonly createRequestTemplate?: string,

  /**
   * Whether to deploy API Gateway Method for Read operation on DynamoDB table.
   *
   * @default - true
   */
  readonly allowReadOperation?: boolean,

  /**
   * Whether to deploy API Gateway Method for Update operation on DynamoDB table.
   *
   * @default - false
   */
  readonly allowUpdateOperation?: boolean,

  /**
   * API Gateway Request template for Update method, required if allowUpdateOperation set to true
   *
   * @default - None
   */
  readonly updateRequestTemplate?: string,

  /**
   * Whether to deploy API Gateway Method for Delete operation on DynamoDB table.
   *
   * @default - false
   */
  readonly allowDeleteOperation?: boolean
}

/**
 * @summary The ApiGatewayToDynamoDB class.
 */
export class ApiGatewayToDynamoDB extends Construct {
  public readonly dynamoTable: dynamodb.Table;
  public readonly apiGatewayRole: iam.Role;
  public readonly apiGateway: api.RestApi;
  public readonly apiGatewayCloudWatchRole: iam.Role;
  public readonly apiGatewayLogGroup: LogGroup;
  /**
   * @summary Constructs a new instance of the ApiGatewayToDynamoDB class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {CloudFrontToApiGatewayToLambdaProps} props - user provided props for the construct.
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: ApiGatewayToDynamoDBProps) {
    super(scope, id);
    let partitionKeyName: string;

    // Set the default props for DynamoDB table
    if (props.dynamoTableProps) {
      const dynamoTableProps: dynamodb.TableProps = overrideProps(defaults.DefaultTableProps, props.dynamoTableProps);
      partitionKeyName = dynamoTableProps.partitionKey.name;
      this.dynamoTable = new dynamodb.Table(this, 'DynamoTable', dynamoTableProps);
    } else {
      partitionKeyName = defaults.DefaultTableProps.partitionKey.name;
      this.dynamoTable = new dynamodb.Table(this, 'DynamoTable', defaults.DefaultTableProps);
    }

    // Setup the API Gateway
    [this.apiGateway, this.apiGatewayCloudWatchRole, this.apiGatewayLogGroup] = defaults.GlobalRestApi(this, props.apiGatewayProps);

    // Setup the API Gateway role
    this.apiGatewayRole = new iam.Role(this, 'api-gateway-role', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com')
    });

    // Setup the API Gateway Resource
    const apiGatewayResource: api.Resource = this.apiGateway.root.addResource("{" + partitionKeyName + "}");

    // Setup API Gateway Method
    // Create
    if (props.allowCreateOperation && props.allowCreateOperation === true && props.createRequestTemplate) {
      const createRequestTemplate = props.createRequestTemplate.replace("${Table}", this.dynamoTable.tableName);
      this.addActionToPolicy("dynamodb:PutItem");
      defaults.addProxyMethodToApiResource({
        service: "dynamodb",
        action: "PutItem",
        apiGatewayRole: this.apiGatewayRole,
        apiMethod: "POST",
        apiResource: this.apiGateway.root,
        requestTemplate: createRequestTemplate
      });
    }
    // Read
    if (!props.allowReadOperation || props.allowReadOperation === true) {
      const getRequestTemplate = "{\r\n\"TableName\": \"" + this.dynamoTable.tableName + "\",\r\n \"KeyConditionExpression\": \"" + partitionKeyName + " = :v1\",\r\n    \"ExpressionAttributeValues\": {\r\n        \":v1\": {\r\n            \"S\": \"$input.params('" + partitionKeyName + "')\"\r\n        }\r\n    }\r\n}";
      this.addActionToPolicy("dynamodb:Query");
      defaults.addProxyMethodToApiResource({
        service: "dynamodb",
        action: "Query",
        apiGatewayRole: this.apiGatewayRole,
        apiMethod: "GET",
        apiResource: apiGatewayResource,
        requestTemplate: getRequestTemplate
      });
    }
    // Update
    if (props.allowUpdateOperation && props.allowUpdateOperation === true && props.updateRequestTemplate) {
      const updateRequestTemplate = props.updateRequestTemplate.replace("${Table}", this.dynamoTable.tableName);
      this.addActionToPolicy("dynamodb:UpdateItem");
      defaults.addProxyMethodToApiResource({
        service: "dynamodb",
        action: "UpdateItem",
        apiGatewayRole: this.apiGatewayRole,
        apiMethod: "PUT",
        apiResource: apiGatewayResource,
        requestTemplate: updateRequestTemplate
      });
    }
    // Delete
    if (props.allowDeleteOperation && props.allowDeleteOperation === true) {
      const deleteRequestTemplate = "{\r\n  \"TableName\": \"" + this.dynamoTable.tableName + "\",\r\n  \"Key\": {\r\n    \"" + partitionKeyName + "\": {\r\n      \"S\": \"$input.params('" + partitionKeyName + "')\"\r\n    }\r\n  },\r\n  \"ConditionExpression\": \"attribute_not_exists(Replies)\",\r\n  \"ReturnValues\": \"ALL_OLD\"\r\n}";
      this.addActionToPolicy("dynamodb:DeleteItem");
      defaults.addProxyMethodToApiResource({
        service: "dynamodb",
        action: "DeleteItem",
        apiGatewayRole: this.apiGatewayRole,
        apiMethod: "DELETE",
        apiResource: apiGatewayResource,
        requestTemplate: deleteRequestTemplate
      });
    }
  }

  private addActionToPolicy(action: string) {
    this.apiGatewayRole.addToPolicy(new iam.PolicyStatement({
      resources: [
        this.dynamoTable.tableArn
      ],
      actions: [ `${action}` ]
    }));
  }
}