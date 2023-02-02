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

import * as api from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { getPartitionKeyNameFromTable } from '@aws-solutions-constructs/core';
import * as logs from 'aws-cdk-lib/aws-logs';

/**
 * @summary The properties for the ApiGatewayToDynamoDB class.
 */
export interface ApiGatewayToDynamoDBProps {
  /**
   * Optional user provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly dynamoTableProps?: dynamodb.TableProps;
  /**
   * Existing instance of DynamoDB table object, providing both this and `dynamoTableProps` will cause an error.
   *
   * @default - None
   */
  readonly existingTableObj?: dynamodb.Table;
  /**
   * Optional user-provided props to override the default props for the API Gateway.
   *
   * @default - Default properties are used.
   */
  readonly apiGatewayProps?: api.RestApiProps;
  /**
   * Whether to deploy an API Gateway Method for POST HTTP operations on the DynamoDB table (i.e. dynamodb:PutItem).
   *
   * @default - false
   */
  readonly allowCreateOperation?: boolean;
  /**
   * API Gateway Request Template for the create method for the default `application/json` content-type.
   * This property is required if the `allowCreateOperation` property is set to true.
   *
   * @default - None
   */
  readonly createRequestTemplate?: string;
  /**
   * Optional Create Request Templates for content-types other than `application/json`.
   * Use the `createRequestTemplate` property to set the request template for the `application/json` content-type.
   * This property can only be specified if the `allowCreateOperation` property is set to true.
   *
   * @default - None
   */
  readonly additionalCreateRequestTemplates?: { [contentType: string]: string; };
  /**
   * Optional, custom API Gateway Integration Response for the create method.
   * This property can only be specified if the `allowCreateOperation` property is set to true.
   *
   * @default - [{statusCode:"200"},{statusCode:"500",responseTemplates:{"text/html":"Error"},selectionPattern:"500"}]
   */
  readonly createIntegrationResponses?: apigateway.IntegrationResponse[];
  /**
   * Whether to deploy an API Gateway Method for GET HTTP operations on DynamoDB table (i.e. dynamodb:Query).
   *
   * @default - true
   */
  readonly allowReadOperation?: boolean;
  /**
   * API Gateway Request Template for the read method for the default `application/json` content-type.
   *
   * The default template only supports a partition key and not partition + sort keys.
   *
   * @default - `{ \
   *       "TableName": "DYNAMODB_TABLE_NAME", \
   *       "KeyConditionExpression": "PARTITION_KEY_NAME = :v1", \
   *       "ExpressionAttributeValues": { \
   *         ":v1": { \
   *           "S": "$input.params('PARTITION_KEY_NAME')" \
   *         } \
   *       } \
   *     }`
   */
  readonly readRequestTemplate?: string;
  /**
   * Optional Read Request Templates for content-types other than `application/json`.
   * Use the `readRequestTemplate` property to set the request template for the `application/json` content-type.
   *
   * @default - None
   */
  readonly additionalReadRequestTemplates?: { [contentType: string]: string; };
  /**
   * Optional, custom API Gateway Integration Response for the read method.
   *
   * @default - [{statusCode:"200"},{statusCode:"500",responseTemplates:{"text/html":"Error"},selectionPattern:"500"}]
   */
  readonly readIntegrationResponses?: apigateway.IntegrationResponse[];
  /**
   * Whether to deploy API Gateway Method for PUT HTTP operations on DynamoDB table (i.e. dynamodb:UpdateItem).
   *
   * @default - false
   */
  readonly allowUpdateOperation?: boolean;
  /**
   * API Gateway Request Template for the update method.
   * This property is required if the `allowUpdateOperation` property is set to true.
   *
   * @default - None
   */
  readonly updateRequestTemplate?: string;
  /**
   * Optional Update Request Templates for content-types other than `application/json`.
   * Use the `updateRequestTemplate` property to set the request template for the `application/json` content-type.
   * This property can only be specified if the `allowUpdateOperation` property is set to true.
   *
   * @default - None
   */
  readonly additionalUpdateRequestTemplates?: { [contentType: string]: string; };
  /**
   * Optional, custom API Gateway Integration Response for the update method.
   * This property can only be specified if the `allowUpdateOperation` property is set to true.
   *
   * @default - [{statusCode:"200"},{statusCode:"500",responseTemplates:{"text/html":"Error"},selectionPattern:"500"}]
   */
  readonly updateIntegrationResponses?: apigateway.IntegrationResponse[];
  /**
   * Whether to deploy API Gateway Method for DELETE HTTP operations on DynamoDB table (i.e. dynamodb:DeleteItem).
   *
   * @default - false
   */
  readonly allowDeleteOperation?: boolean;
  /**
   * API Gateway Request Template for the delete method for the default `application/json` content-type.
   * This property can only be specified if the `allowDeleteOperation` property is set to true.
   *
   * @default - `{ \
   *       "TableName": "DYNAMODB_TABLE_NAME", \
   *       "Key": { \
   *         "${partitionKeyName}": { \
   *           "S": "$input.params('PARTITION_KEY_NAME')" \
   *           } \
   *         }, \
   *       "ReturnValues": "ALL_OLD" \
   *     }`
   */
  readonly deleteRequestTemplate?: string;
  /**
   * Optional Delete request templates for content-types other than `application/json`.
   * Use the `deleteRequestTemplate` property to set the request template for the `application/json` content-type.
   * This property can only be specified if the `allowDeleteOperation` property is set to true.
   *
   * @default - None
   */
  readonly additionalDeleteRequestTemplates?: { [contentType: string]: string; };
  /**
   * Optional, custom API Gateway Integration Response for the delete method.
   * This property can only be specified if the `allowDeleteOperation` property is set to true.
   *
   * @default - [{statusCode:"200"},{statusCode:"500",responseTemplates:{"text/html":"Error"},selectionPattern:"500"}]
   */
  readonly deleteIntegrationResponses?: apigateway.IntegrationResponse[];
  /**
   * User provided props to override the default props for the CloudWatchLogs LogGroup.
   *
   * @default - Default props are used
   */
  readonly logGroupProps?: logs.LogGroupProps;
}

/**
 * @summary The ApiGatewayToDynamoDB class.
 */
export class ApiGatewayToDynamoDB extends Construct {
  public readonly dynamoTable: dynamodb.Table;
  public readonly apiGatewayRole: iam.Role;
  public readonly apiGateway: api.RestApi;
  public readonly apiGatewayCloudWatchRole?: iam.Role;
  public readonly apiGatewayLogGroup: logs.LogGroup;
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
    defaults.CheckProps(props);

    if ((props.createRequestTemplate || props.additionalCreateRequestTemplates || props.createIntegrationResponses)
        && props.allowCreateOperation !== true) {
      throw new Error(`The 'allowCreateOperation' property must be set to true when setting any of the following: ` +
        `'createRequestTemplate', 'additionalCreateRequestTemplates', 'createIntegrationResponses'`);
    }
    if ((props.readRequestTemplate || props.additionalReadRequestTemplates || props.readIntegrationResponses)
        && props.allowReadOperation === false) {
      throw new Error(`The 'allowReadOperation' property must be set to true or undefined when setting any of the following: ` +
        `'readRequestTemplate', 'additionalReadRequestTemplates', 'readIntegrationResponses'`);
    }
    if ((props.updateRequestTemplate || props.additionalUpdateRequestTemplates || props.updateIntegrationResponses)
        && props.allowUpdateOperation !== true) {
      throw new Error(`The 'allowUpdateOperation' property must be set to true when setting any of the following: ` +
        `'updateRequestTemplate', 'additionalUpdateRequestTemplates', 'updateIntegrationResponses'`);
    }
    if ((props.deleteRequestTemplate || props.additionalDeleteRequestTemplates || props.deleteIntegrationResponses)
        && props.allowDeleteOperation !== true) {
      throw new Error(`The 'allowDeleteOperation' property must be set to true when setting any of the following: ` +
        `'deleteRequestTemplate', 'additionalDeleteRequestTemplates', 'deleteIntegrationResponses'`);
    }

    // Set the default props for DynamoDB table
    const dynamoTableProps: dynamodb.TableProps = defaults.consolidateProps(defaults.DefaultTableProps, props.dynamoTableProps);
    let partitionKeyName = dynamoTableProps.partitionKey.name;

    if (props.existingTableObj) {
      partitionKeyName = getPartitionKeyNameFromTable(props.existingTableObj);
    }

    // Since we are only invoking this function with an existing Table or tableProps,
    // (not a table interface), we know that the implementation will always return
    // a Table object and we can safely cast away the optional aspect of the type.
    this.dynamoTable = defaults.buildDynamoDBTable(this, {
      existingTableObj: props.existingTableObj,
      dynamoTableProps: props.dynamoTableProps
    })[1] as dynamodb.Table;

    // Setup the API Gateway
    [this.apiGateway, this.apiGatewayCloudWatchRole, this.apiGatewayLogGroup] = defaults.GlobalRestApi(this,
      props.apiGatewayProps, props.logGroupProps);

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
        requestTemplate: createRequestTemplate,
        additionalRequestTemplates: props.additionalCreateRequestTemplates,
        integrationResponses: props.createIntegrationResponses
      });
    }
    // Read
    if (props.allowReadOperation === undefined || props.allowReadOperation === true) {
      const readRequestTemplate = props.readRequestTemplate ??
        `{ \
          "TableName": "${this.dynamoTable.tableName}", \
          "KeyConditionExpression": "${partitionKeyName} = :v1", \
          "ExpressionAttributeValues": { \
            ":v1": { \
              "S": "$input.params('${partitionKeyName}')" \
            } \
          } \
        }`;

      this.addActionToPolicy("dynamodb:Query");
      defaults.addProxyMethodToApiResource({
        service: "dynamodb",
        action: "Query",
        apiGatewayRole: this.apiGatewayRole,
        apiMethod: "GET",
        apiResource: apiGatewayResource,
        requestTemplate: readRequestTemplate,
        additionalRequestTemplates: props.additionalReadRequestTemplates,
        integrationResponses: props.readIntegrationResponses
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
        requestTemplate: updateRequestTemplate,
        additionalRequestTemplates: props.additionalUpdateRequestTemplates,
        integrationResponses: props.updateIntegrationResponses
      });
    }
    // Delete
    if (props.allowDeleteOperation && props.allowDeleteOperation === true) {
      const deleteRequestTemplate = props.deleteRequestTemplate ??
        `{ \
          "TableName": "${this.dynamoTable.tableName}", \
          "Key": { \
            "${partitionKeyName}": { \
              "S": "$input.params('${partitionKeyName}')" \
              } \
            }, \
          "ReturnValues": "ALL_OLD" \
        }`;

      this.addActionToPolicy("dynamodb:DeleteItem");
      defaults.addProxyMethodToApiResource({
        service: "dynamodb",
        action: "DeleteItem",
        apiGatewayRole: this.apiGatewayRole,
        apiMethod: "DELETE",
        apiResource: apiGatewayResource,
        requestTemplate: deleteRequestTemplate,
        additionalRequestTemplates: props.additionalDeleteRequestTemplates,
        integrationResponses: props.deleteIntegrationResponses
      });
    }
  }

  private addActionToPolicy(action: string) {
    this.apiGatewayRole.addToPolicy(new iam.PolicyStatement({
      resources: [
        this.dynamoTable.tableArn
      ],
      actions: [`${action}`]
    }));
  }
}