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
import * as api from '@aws-cdk/aws-apigateway';
import * as kinesis from '@aws-cdk/aws-kinesis';
import * as iam from '@aws-cdk/aws-iam';
import * as defaults from '@aws-solutions-constructs/core';
import { Construct } from '@aws-cdk/core';
import * as logs from '@aws-cdk/aws-logs';

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
   * API Gateway request model for the PutRecord action.
   * If not provided, a default one will be created.
   *
   * @default - {"$schema":"http://json-schema.org/draft-04/schema#","title":"PutRecord proxy single-record payload","type":"object",
   * "required":["data","partitionKey"],"properties":{"data":{"type":"string"},"partitionKey":{"type":"string"}}}
   */
  readonly putRecordRequestModel?: api.ModelOptions;
  /**
   * API Gateway request template for the PutRecords action.
   * If not provided, a default one will be used.
   *
   * @default - { "StreamName": "${this.kinesisStream.streamName}", "Records": [ #foreach($elem in $input.path('$.records'))
   *  { "Data": "$util.base64Encode($elem.data)", "PartitionKey": "$elem.partitionKey"}#if($foreach.hasNext),#end #end ] }
   */
  readonly putRecordsRequestTemplate?: string;
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
}

/**
 * @summary The ApiGatewayToKinesisStreams class.
 */
export class ApiGatewayToKinesisStreams extends Construct {
  public readonly apiGateway: api.RestApi;
  public readonly apiGatewayRole: iam.Role;
  public readonly apiGatewayCloudWatchRole: iam.Role;
  public readonly apiGatewayLogGroup: logs.LogGroup;
  public readonly kinesisStream: kinesis.Stream;

  /**
   * @summary Constructs a new instance of the ApiGatewayToKinesisStreams class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {ApiGatewayToKinesisStreamsProps} props - user provided props for the construct.
   * @access public
   */
  constructor(scope: Construct, id: string, props: ApiGatewayToKinesisStreamsProps) {
    super(scope, id);
    defaults.CheckProps(props);

    // Setup the Kinesis stream
    this.kinesisStream = defaults.buildKinesisStream(scope, {
      existingStreamObj: props.existingStreamObj,
      kinesisStreamProps: props.kinesisStreamProps
    });

    // Setup the API Gateway
    [this.apiGateway, this.apiGatewayCloudWatchRole, this.apiGatewayLogGroup] = defaults.GlobalRestApi(this,
      props.apiGatewayProps, props.logGroupProps);

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

    // PutRecord
    const putRecordResource = this.apiGateway.root.addResource('record');
    defaults.addProxyMethodToApiResource({
      service: 'kinesis',
      action: 'PutRecord',
      apiGatewayRole: this.apiGatewayRole,
      apiMethod: 'POST',
      apiResource: putRecordResource,
      requestTemplate: this.getPutRecordTemplate(props.putRecordRequestTemplate),
      contentType: "'x-amz-json-1.1'",
      requestValidator,
      requestModel: { 'application/json': this.getPutRecordModel(props.putRecordRequestModel) }
    });

    // PutRecords
    const putRecordsResource = this.apiGateway.root.addResource('records');
    defaults.addProxyMethodToApiResource({
      service: 'kinesis',
      action: 'PutRecords',
      apiGatewayRole: this.apiGatewayRole,
      apiMethod: 'POST',
      apiResource: putRecordsResource,
      requestTemplate: this.getPutRecordsTemplate(props.putRecordsRequestTemplate),
      contentType: "'x-amz-json-1.1'",
      requestValidator,
      requestModel: { 'application/json': this.getPutRecordsModel(props.putRecordsRequestModel) }
    });
  }

  private getPutRecordTemplate(putRecordTemplate?: string): string {
    if (putRecordTemplate !== undefined) {
      return putRecordTemplate.replace("${StreamName}", this.kinesisStream.streamName);
    }

    return `{ "StreamName": "${this.kinesisStream.streamName}", "Data": "$util.base64Encode($input.json('$.data'))", "PartitionKey": "$input.path('$.partitionKey')" }`;
  }

  private getPutRecordModel(putRecordModel?: api.ModelOptions): api.IModel {
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

  private getPutRecordsTemplate(putRecordsTemplate?: string): string {
    if (putRecordsTemplate !== undefined) {
      return putRecordsTemplate.replace("${StreamName}", this.kinesisStream.streamName);
    }

    return `{ "StreamName": "${this.kinesisStream.streamName}", "Records": [ #foreach($elem in $input.path('$.records')) { "Data": "$util.base64Encode($elem.data)", "PartitionKey": "$elem.partitionKey"}#if($foreach.hasNext),#end #end ] }`;
  }

  private getPutRecordsModel(putRecordsModel?: api.ModelOptions): api.IModel {
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
