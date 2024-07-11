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
import * as api from 'aws-cdk-lib/aws-apigateway';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

/**
 * @summary The properties for the ApiGatewayToKinesisStreamsProps class.
 */
export interface ApiGatewayToKinesisStreamsProps {
  /**
   * Optional user-provided props to override the default props for the API Gateway.
   *
   * @default - Default properties are used.
   */
  readonly apiGatewayProps?: api.RestApiProps,
  /**
   * API Gateway request template for the PutRecord action.
   * If not provided, a default one will be used.
   *
   * @default - { "StreamName": "${this.kinesisStream.streamName}", "Data": "$util.base64Encode($input.json('$.data'))",
   *  "PartitionKey": "$input.path('$.partitionKey')" }
   */
  readonly putRecordRequestTemplate?: string;
  /**
   * Optional PutRecord Request Templates for content-types other than `application/json`.
   * Use the `putRecordRequestTemplate` property to set the request template for the `application/json` content-type.
   *
   * @default - None
   */
    readonly additionalPutRecordRequestTemplates?: { [contentType: string]: string; };
  /**
   * API Gateway request model for the PutRecord action.
   * If not provided, a default one will be created.
   *
   * @default - {"$schema":"http://json-schema.org/draft-04/schema#","title":"PutRecord proxy single-record payload","type":"object",
   * "required":["data","partitionKey"],"properties":{"data":{"type":"string"},"partitionKey":{"type":"string"}}}
   */
  readonly putRecordRequestModel?: api.ModelOptions;
  /**
   * Optional, custom API Gateway Integration Response for the PutRecord action.
   *
   * @default - [{statusCode:"200"},{statusCode:"500",responseTemplates:{"text/html":"Error"},selectionPattern:"500"}]
   */
  readonly putRecordIntegrationResponses?: api.IntegrationResponse[];
  /**
   * Optional, custom API Gateway Method Responses for the PutRecord action.
   *
   * @default - [
   *   {
   *     statusCode: "200",
   *     responseParameters: {
   *       "method.response.header.Content-Type": true
   *     }
   *   },
   *   {
   *     statusCode: "500",
   *     responseParameters: {
   *       "method.response.header.Content-Type": true
   *     },
   *   }
   * ]
   */
  readonly putRecordMethodResponses?: api.MethodResponse[];
  /**
   * API Gateway request template for the PutRecords action for the default `application/json` content-type.
   * If not provided, a default one will be used.
   *
   * @default - { "StreamName": "${this.kinesisStream.streamName}", "Records": [ #foreach($elem in $input.path('$.records'))
   *  { "Data": "$util.base64Encode($elem.data)", "PartitionKey": "$elem.partitionKey"}#if($foreach.hasNext),#end #end ] }
   */
  readonly putRecordsRequestTemplate?: string;
  /**
   * Optional PutRecords Request Templates for content-types other than `application/json`.
   * Use the `putRecordsRequestTemplate` property to set the request template for the `application/json` content-type.
   *
   * @default - None
   */
  readonly additionalPutRecordsRequestTemplates?: { [contentType: string]: string; };
  /**
   * API Gateway request model for the PutRecords action.
   * If not provided, a default one will be created.
   *
   * @default - {"$schema":"http://json-schema.org/draft-04/schema#","title":"PutRecords proxy payload data","type":"object","required":["records"],
   * "properties":{"records":{"type":"array","items":{"type":"object",
   * "required":["data","partitionKey"],"properties":{"data":{"type":"string"},"partitionKey":{"type":"string"}}}}}}
   */
  readonly putRecordsRequestModel?: api.ModelOptions;
  /**
   * Optional, custom API Gateway Integration Response for the PutRecords action.
   *
   * @default - [{statusCode:"200"},{statusCode:"500",responseTemplates:{"text/html":"Error"},selectionPattern:"500"}]
   */
  readonly putRecordsIntegrationResponses?: api.IntegrationResponse[];
  /**
   * Optional, custom API Gateway Method Responses for the PutRecord action.
   *
   * @default - [
   *   {
   *     statusCode: "200",
   *     responseParameters: {
   *       "method.response.header.Content-Type": true
   *     }
   *   },
   *   {
   *     statusCode: "500",
   *     responseParameters: {
   *       "method.response.header.Content-Type": true
   *     },
   *   }
   * ]
   */
  readonly putRecordsMethodResponses?: api.MethodResponse[];
  /**
   * Existing instance of Kinesis Stream, providing both this and `kinesisStreamProps` will cause an error.
   *
   * @default - None
   */
  readonly existingStreamObj?: kinesis.Stream;
  /**
   * Optional user-provided props to override the default props for the Kinesis Data Stream.
   *
   * @default - Default properties are used.
   */
  readonly kinesisStreamProps?: kinesis.StreamProps,
  /**
   * User provided props to override the default props for the CloudWatchLogs LogGroup.
   *
   * @default - Default props are used
   */
  readonly logGroupProps?: logs.LogGroupProps
  /**
   * Whether to create recommended CloudWatch alarms
   *
   * @default - Alarms are created
   */
  readonly createCloudWatchAlarms?: boolean;
}

/**
 * @summary The ApiGatewayToKinesisStreams class.
 */
export class ApiGatewayToKinesisStreams extends Construct {
  public readonly apiGateway: api.RestApi;
  public readonly apiGatewayRole: iam.Role;
  public readonly apiGatewayCloudWatchRole?: iam.Role;
  public readonly apiGatewayLogGroup: logs.LogGroup;
  public readonly kinesisStream: kinesis.Stream;
  public readonly cloudwatchAlarms?: cloudwatch.Alarm[];

  /**
   * @summary Constructs a new instance of the ApiGatewayToKinesisStreams class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {ApiGatewayToKinesisStreamsProps} props - user provided props for the construct.
   * @since 1.62.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: ApiGatewayToKinesisStreamsProps) {
    super(scope, id);
    defaults.CheckKinesisStreamProps(props);

    // Setup the Kinesis stream
    this.kinesisStream = defaults.buildKinesisStream(scope, {
      existingStreamObj: props.existingStreamObj,
      kinesisStreamProps: props.kinesisStreamProps
    });

    // Setup the API Gateway
    const globalRestApiResponse = defaults.GlobalRestApi(this, props.apiGatewayProps, props.logGroupProps);
    this.apiGateway = globalRestApiResponse.api;
    this.apiGatewayCloudWatchRole = globalRestApiResponse.role;
    this.apiGatewayLogGroup = globalRestApiResponse.logGroup;

    // Setup the API Gateway role
    this.apiGatewayRole = new iam.Role(this, 'api-gateway-role', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com')
    });
    this.kinesisStream.grantWrite(this.apiGatewayRole);

    // Setup API Gateway methods
    const requestValidator = this.apiGateway.addRequestValidator('request-validator', {
      requestValidatorName: 'request-body-validator',
      validateRequestBody: true
    });

    let putRecordMethodOptions: api.MethodOptions = {
      requestValidator,
      requestModels: { 'application/json': this.buildPutRecordModel(props.putRecordRequestModel) },
    };
    if (props.putRecordMethodResponses) {
      putRecordMethodOptions = defaults.overrideProps(putRecordMethodOptions, { methodResponses: props.putRecordMethodResponses});
    }
    // PutRecord
    const putRecordResource = this.apiGateway.root.addResource('record');
    defaults.addProxyMethodToApiResource({
      service: 'kinesis',
      action: 'PutRecord',
      apiGatewayRole: this.apiGatewayRole,
      apiMethod: 'POST',
      apiResource: putRecordResource,
      requestTemplate: this.buildPutRecordTemplate(props.putRecordRequestTemplate),
      additionalRequestTemplates: this.buildAdditionalPutRecordTemplates(props.additionalPutRecordRequestTemplates),
      contentType: "'x-amz-json-1.1'",
      integrationResponses: props.putRecordIntegrationResponses,
      methodOptions: putRecordMethodOptions
    });

    let putRecordsMethodOptions: api.MethodOptions = {
      requestValidator,
      requestModels: { 'application/json': this.buildPutRecordsModel(props.putRecordsRequestModel) },
    };
    if (props.putRecordsMethodResponses) {
      putRecordsMethodOptions = defaults.overrideProps(putRecordsMethodOptions, { methodResponses: props.putRecordsMethodResponses});
    }

    // PutRecords
    const putRecordsResource = this.apiGateway.root.addResource('records');
    defaults.addProxyMethodToApiResource({
      service: 'kinesis',
      action: 'PutRecords',
      apiGatewayRole: this.apiGatewayRole,
      apiMethod: 'POST',
      apiResource: putRecordsResource,
      requestTemplate: this.buildPutRecordsTemplate(props.putRecordsRequestTemplate),
      additionalRequestTemplates: this.buildAdditionalPutRecordTemplates(props.additionalPutRecordsRequestTemplates),
      contentType: "'x-amz-json-1.1'",
      integrationResponses: props.putRecordsIntegrationResponses,
      methodOptions: putRecordsMethodOptions
    });

    if (props.createCloudWatchAlarms === undefined || props.createCloudWatchAlarms) {
      // Deploy best practices CW Alarms for Kinesis Stream
      this.cloudwatchAlarms = defaults.buildKinesisStreamCWAlarms(this);
    }
  }

  /**
   * This method transforms the value of each request template by replacing the stream name placeholder value with the
   * actual name of the stream resource
   *
   * @param templates The additional request templates to transform.
   */
  private buildAdditionalPutRecordTemplates(templates?: { [contentType: string]: string; }): { [contentType: string]: string; } {

    const transformedTemplates: { [contentType: string]: string; } = {};

    for (const key in templates) {
      if (templates[key] !== undefined) {
        transformedTemplates[key] = templates[key].replace("${StreamName}", this.kinesisStream.streamName);
      }
    }

    return transformedTemplates;
  }

  private buildPutRecordTemplate(putRecordTemplate?: string): string {
    if (putRecordTemplate !== undefined) {
      return putRecordTemplate.replace("${StreamName}", this.kinesisStream.streamName);
    }

    return `{ "StreamName": "${this.kinesisStream.streamName}", "Data": "$util.base64Encode($input.json('$.data'))", "PartitionKey": "$input.path('$.partitionKey')" }`;
  }

  private buildPutRecordModel(putRecordModel?: api.ModelOptions): api.IModel {
    let modelProps: api.ModelOptions;

    if (putRecordModel !== undefined) {
      modelProps = putRecordModel;
    } else {
      modelProps = {
        contentType: 'application/json',
        modelName: 'PutRecordModel',
        description: 'PutRecord proxy single-record payload',
        schema: {
          schema: api.JsonSchemaVersion.DRAFT4,
          title: 'PutRecord proxy single-record payload',
          type: api.JsonSchemaType.OBJECT,
          required: ['data', 'partitionKey'],
          properties: {
            data: { type: api.JsonSchemaType.STRING },
            partitionKey: { type: api.JsonSchemaType.STRING }
          }
        }
      };
    }

    return this.apiGateway.addModel('PutRecordModel', modelProps);
  }

  private buildPutRecordsTemplate(putRecordsTemplate?: string): string {
    if (putRecordsTemplate !== undefined) {
      return putRecordsTemplate.replace("${StreamName}", this.kinesisStream.streamName);
    }

    return `{ "StreamName": "${this.kinesisStream.streamName}", "Records": [ #foreach($elem in $input.path('$.records')) { "Data": "$util.base64Encode($elem.data)", "PartitionKey": "$elem.partitionKey"}#if($foreach.hasNext),#end #end ] }`;
  }

  private buildPutRecordsModel(putRecordsModel?: api.ModelOptions): api.IModel {
    let modelProps: api.ModelOptions;

    if (putRecordsModel !== undefined) {
      modelProps = putRecordsModel;
    } else {
      modelProps = {
        contentType: 'application/json',
        modelName: 'PutRecordsModel',
        description: 'PutRecords proxy payload data',
        schema: {
          schema: api.JsonSchemaVersion.DRAFT4,
          title: 'PutRecords proxy payload data',
          type: api.JsonSchemaType.OBJECT,
          required: ['records'],
          properties: {
            records: {
              type: api.JsonSchemaType.ARRAY,
              items: {
                type: api.JsonSchemaType.OBJECT,
                required: ['data', 'partitionKey'],
                properties: {
                  data: { type: api.JsonSchemaType.STRING },
                  partitionKey: { type: api.JsonSchemaType.STRING }
                }
              }
            }
          }
        }
      };
    }

    return this.apiGateway.addModel('PutRecordsModel', modelProps);
  }
}
