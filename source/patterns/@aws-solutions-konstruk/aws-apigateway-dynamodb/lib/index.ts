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
import * as defaults from '@aws-solutions-konstruk/core';
import { Construct } from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { overrideProps } from '@aws-solutions-konstruk/core';

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
  readonly apiGatewayProps?: api.RestApiProps | any,

  /**
   * Whether to deploy API Gateway Method for Create operation on Dynamodb DB table.
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
   * Whether to deploy API Gateway Method for Read operation on Dynamodb DB table.
   *
   * @default - true
   */
  readonly allowReadOperation?: boolean,

  /**
   * Whether to deploy API Gateway Method for Update operation on Dynamodb DB table.
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
   * Whether to deploy API Gateway Method for Delete operation on Dynamodb DB table.
   *
   * @default - false
   */
  readonly allowDeleteOperation?: boolean
}

/**
 * @summary The ApiGatewayToDynamoDB class.
 */
export class ApiGatewayToDynamoDB extends Construct {
  private table: dynamodb.Table;
  private apiGatewayRole: iam.Role;
  private apiGateway: api.RestApi;

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
      this.table = new dynamodb.Table(this, 'DynamoTable', dynamoTableProps);
    } else {
      partitionKeyName = defaults.DefaultTableProps.partitionKey.name;
      this.table = new dynamodb.Table(this, 'DynamoTable', defaults.DefaultTableProps);
    }

    // Setup the API Gateway
    this.apiGateway = defaults.GlobalRestApi(this);

    // Setup the API Gateway role
    this.apiGatewayRole = new iam.Role(this, 'api-gateway-role', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com')
    });

    // Setup the API Gateway Resource
    const apiGatewayResource: api.Resource = this.apiGateway.root.addResource("{" + partitionKeyName + "}");

    // Setup API Gateway Method
    // Create
    if (props.allowCreateOperation && props.allowCreateOperation === true && props.createRequestTemplate) {
      const createRequestTemplate = props.createRequestTemplate.replace("${Table}", this.table.tableName);
      this.addActiontoPlicy("dynamodb:PutItem");
      this.addMethod(this.apiGateway.root, createRequestTemplate, "PutItem", "POST");
    }
    // Read
    if (!props.allowReadOperation || props.allowReadOperation === true) {
      const getRequestTemplate = "{\r\n\"TableName\": \"" + this.table.tableName + "\",\r\n \"KeyConditionExpression\": \"" + partitionKeyName + " = :v1\",\r\n    \"ExpressionAttributeValues\": {\r\n        \":v1\": {\r\n            \"S\": \"$input.params('" + partitionKeyName + "')\"\r\n        }\r\n    }\r\n}";
      this.addActiontoPlicy("dynamodb:Query");
      this.addMethod(apiGatewayResource, getRequestTemplate, "Query", "GET");
    }
    // Update
    if (props.allowUpdateOperation && props.allowUpdateOperation === true && props.updateRequestTemplate) {
      const updateRequestTemplate = props.updateRequestTemplate.replace("${Table}", this.table.tableName);
      this.addActiontoPlicy("dynamodb:UpdateItem");
      this.addMethod(apiGatewayResource, updateRequestTemplate, "UpdateItem", "PUT");
    }
    // Delete
    if (props.allowDeleteOperation && props.allowDeleteOperation === true) {
      const deleteRequestTemplate = "{\r\n  \"TableName\": \"" + this.table.tableName + "\",\r\n  \"Key\": {\r\n    \"" + partitionKeyName + "\": {\r\n      \"S\": \"$input.params('" + partitionKeyName + "')\"\r\n    }\r\n  },\r\n  \"ConditionExpression\": \"attribute_not_exists(Replies)\",\r\n  \"ReturnValues\": \"ALL_OLD\"\r\n}";
      this.addActiontoPlicy("dynamodb:DeleteItem");
      this.addMethod(apiGatewayResource, deleteRequestTemplate, "DeleteItem", "DELETE");
    }
  }

  private addActiontoPlicy(action: string) {
    this.apiGatewayRole.addToPolicy(new iam.PolicyStatement({
      resources: [
        this.table.tableArn
      ],
      actions: [ `${action}` ]
    }));
  }

  private addMethod(apiResource: api.IResource, requestTemplate: string, dynamodbAction: string, apiMethod: string) {
    // Setup the API Gateway Integration
    const apiGatewayIntegration = new api.AwsIntegration({
      service: "dynamodb",
      action: dynamodbAction,
      integrationHttpMethod: "POST",
      options: {
        passthroughBehavior: api.PassthroughBehavior.NEVER,
        credentialsRole: this.apiGatewayRole,
        requestParameters: {
            "integration.request.header.Content-Type": "'application/json'"
        },
        requestTemplates: {
            "application/json": requestTemplate
        },
        integrationResponses: [
          {
              statusCode: "200"
          },
          {
              statusCode: "500",
              responseTemplates: {
                  "text/html": "Error"
              },
              selectionPattern: "500"
          }
        ]
      }
    });

    // Setup the API Gateway method(s)
    apiResource.addMethod(apiMethod, apiGatewayIntegration, {
        methodResponses: [
            {
                statusCode: "200",
                responseParameters: {
                    "method.response.header.Content-Type": true
                }
            },
            {
                statusCode: "500",
                responseParameters: {
                    "method.response.header.Content-Type": true
                },
            }
        ]
    });
  }

  /**
   * @summary Returns an instance of the api.RestApi created by the construct.
   * @returns {api.RestApi} Instance of the RestApi created by the construct.
   * @since 0.8.0
   * @access public
   */
  public restApi(): api.RestApi {
    return this.apiGateway;
  }

  /**
   * @summary Returns an instance of dynamodb.Table created by the construct.
   * @returns {dynamodb.Table} Instance of dynamodb.Table created by the construct
   * @since 0.8.0
   * @access public
   */
  public dynamoTable(): dynamodb.Table {
    return this.table;
  }
}