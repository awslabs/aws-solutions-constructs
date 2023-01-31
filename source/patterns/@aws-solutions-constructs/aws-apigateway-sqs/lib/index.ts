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
import * as kms from 'aws-cdk-lib/aws-kms';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';

/**
 * @summary The properties for the ApiGatewayToSqs class.
 */
export interface ApiGatewayToSqsProps {
  /**
   * Optional user-provided props to override the default props for the API Gateway.
   *
   * @default - Default properties are used.
   */
  readonly apiGatewayProps?: api.RestApiProps | any;
  /**
   * Existing instance of SQS queue object, providing both this  and queueProps will cause an error
   *
   * @default - None
   */
  readonly existingQueueObj?: sqs.Queue;
  /**
   * User provided props to override the default props for the SQS queue.
   *
   * @default - Default props are used
   */
  readonly queueProps?: sqs.QueueProps;
  /**
   * Whether to deploy a secondary queue to be used as a dead letter queue.
   *
   * @default - required field.
   */
  readonly deployDeadLetterQueue?: boolean;
  /**
   * Optional user provided properties for the dead letter queue
   *
   * @default - Default props are used
   */
  readonly deadLetterQueueProps?: sqs.QueueProps;
  /**
   * The number of times a message can be unsuccessfully dequeued before being moved to the dead-letter queue.
   *
   * @default - required only if deployDeadLetterQueue = true.
   */
  readonly maxReceiveCount?: number;
  /**
   * Whether to deploy an API Gateway Method for POST HTTP operations on the queue (i.e. sqs:SendMessage).
   *
   * @default - false
   */
  readonly allowCreateOperation?: boolean;
  /**
   * API Gateway Request Template for the create method for the default `application/json` content-type,
   * if the `allowCreateOperation` property is set to true.
   *
   * @default - 'Action=SendMessage&MessageBody=$util.urlEncode(\"$input.body\")'
   */
  readonly createRequestTemplate?: string;
  /**
   * Optional Create Request Templates for content-types other than `application/json`.
   * Use the `createRequestTemplate` property to set the request template for the `application/json` content-type.
   *
   * @default - None
   */
  readonly additionalCreateRequestTemplates?: { [contentType: string]: string; };
  /**
   * Whether to deploy an API Gateway Method for GET HTTP operations on the queue (i.e. sqs:ReceiveMessage).
   *
   * @default - false
   */
  readonly allowReadOperation?: boolean;
  /**
   * API Gateway Request Template for the read method for the default `application/json` content-type,
   * if the `allowReadOperation` property is set to true.
   *
   * @default - "Action=ReceiveMessage"
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
   * Whether to deploy an API Gateway Method for HTTP DELETE operations on the queue (i.e. sqs:DeleteMessage).
   *
   * @default - false
   */
  readonly allowDeleteOperation?: boolean;
  /**
   * API Gateway Request Template for THE delete method for the default `application/json` content-type,
   * if the `allowDeleteOperation` property is set to true.
   *
   * @default - "Action=DeleteMessage&ReceiptHandle=$util.urlEncode($input.params('receiptHandle'))"
   */
  readonly deleteRequestTemplate?: string;
  /**
   * Optional Delete request templates for content-types other than `application/json`.
   * Use the `deleteRequestTemplate` property to set the request template for the `application/json` content-type.
   *
   * @default - None
   */
  readonly additionalDeleteRequestTemplates?: { [contentType: string]: string; };
  /**
   * User provided props to override the default props for the CloudWatchLogs LogGroup.
   *
   * @default - Default props are used
   */
  readonly logGroupProps?: logs.LogGroupProps;
  /**
   * If no key is provided, this flag determines whether the queue is encrypted with a new CMK or an AWS managed key.
   * This flag is ignored if any of the following are defined: queueProps.encryptionMasterKey, encryptionKey or encryptionKeyProps.
   *
   * @default - False if queueProps.encryptionMasterKey, encryptionKey, and encryptionKeyProps are all undefined.
   */
  readonly enableEncryptionWithCustomerManagedKey?: boolean;
  /**
   * An optional, imported encryption key to encrypt the SQS Queue with.
   *
   * @default - None
   */
  readonly encryptionKey?: kms.Key;
  /**
   * Optional user provided properties to override the default properties for the KMS encryption key used to encrypt the SQS queue with.
   *
   * @default - None
   */
  readonly encryptionKeyProps?: kms.KeyProps;
}

/**
 * @summary The ApiGatewayToSqs class.
 */
export class ApiGatewayToSqs extends Construct {
  public readonly apiGateway: api.RestApi;
  public readonly apiGatewayRole: iam.Role;
  public readonly apiGatewayCloudWatchRole?: iam.Role;
  public readonly apiGatewayLogGroup: logs.LogGroup;
  public readonly sqsQueue: sqs.Queue;
  public readonly deadLetterQueue?: sqs.DeadLetterQueue;

  /**
   * @summary Constructs a new instance of the ApiGatewayToSqs class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {ApiGatewayToSqsProps} props - user provided props for the construct.
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: ApiGatewayToSqsProps) {
    super(scope, id);
    defaults.CheckProps(props);

    // Setup the dead letter queue, if applicable
    this.deadLetterQueue = defaults.buildDeadLetterQueue(this, {
      existingQueueObj: props.existingQueueObj,
      deployDeadLetterQueue: props.deployDeadLetterQueue,
      deadLetterQueueProps: props.deadLetterQueueProps,
      maxReceiveCount: props.maxReceiveCount
    });

    // Setup the queue
    [this.sqsQueue] = defaults.buildQueue(this, 'queue', {
      existingQueueObj: props.existingQueueObj,
      queueProps: props.queueProps,
      deadLetterQueue: this.deadLetterQueue,
      enableEncryptionWithCustomerManagedKey: props.enableEncryptionWithCustomerManagedKey,
      encryptionKey: props.encryptionKey,
      encryptionKeyProps: props.encryptionKeyProps
    });

    // Setup the API Gateway
    [this.apiGateway, this.apiGatewayCloudWatchRole, this.apiGatewayLogGroup] = defaults.GlobalRestApi(this,
      props.apiGatewayProps, props.logGroupProps);

    // Setup the API Gateway role
    this.apiGatewayRole = new iam.Role(this, 'api-gateway-role', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com')
    });

    // Setup the API Gateway resource
    const apiGatewayResource = this.apiGateway.root.addResource('message');

    // Create
    const createRequestTemplate = props.createRequestTemplate ?? 'Action=SendMessage&MessageBody=$util.urlEncode(\"$input.body\")';
    if (props.allowCreateOperation && props.allowCreateOperation === true) {
      this.addActionToPolicy("sqs:SendMessage");
      defaults.addProxyMethodToApiResource({
        service: "sqs",
        path: `${cdk.Aws.ACCOUNT_ID}/${this.sqsQueue.queueName}`,
        apiGatewayRole: this.apiGatewayRole,
        apiMethod: "POST",
        apiResource: this.apiGateway.root,
        requestTemplate: createRequestTemplate,
        additionalRequestTemplates: props.additionalCreateRequestTemplates,
        contentType: "'application/x-www-form-urlencoded'"
      });
    }

    // Read
    const readRequestTemplate = props.readRequestTemplate ?? "Action=ReceiveMessage";
    if (props.allowReadOperation === undefined || props.allowReadOperation === true) {
      this.addActionToPolicy("sqs:ReceiveMessage");
      defaults.addProxyMethodToApiResource({
        service: "sqs",
        path: `${cdk.Aws.ACCOUNT_ID}/${this.sqsQueue.queueName}`,
        apiGatewayRole: this.apiGatewayRole,
        apiMethod: "GET",
        apiResource: this.apiGateway.root,
        requestTemplate: readRequestTemplate,
        additionalRequestTemplates: props.additionalReadRequestTemplates,
        contentType: "'application/x-www-form-urlencoded'"
      });
    }

    // Delete
    const deleteRequestTemplate = props.deleteRequestTemplate ?? "Action=DeleteMessage&ReceiptHandle=$util.urlEncode($input.params('receiptHandle'))";
    if (props.allowDeleteOperation && props.allowDeleteOperation === true) {
      this.addActionToPolicy("sqs:DeleteMessage");
      defaults.addProxyMethodToApiResource({
        service: "sqs",
        path: `${cdk.Aws.ACCOUNT_ID}/${this.sqsQueue.queueName}`,
        apiGatewayRole: this.apiGatewayRole,
        apiMethod: "DELETE",
        apiResource: apiGatewayResource,
        requestTemplate: deleteRequestTemplate,
        additionalRequestTemplates: props.additionalDeleteRequestTemplates,
        contentType: "'application/x-www-form-urlencoded'"
      });
    }
  }

  private addActionToPolicy(action: string) {
    this.apiGatewayRole.addToPolicy(new iam.PolicyStatement({
      resources: [
        this.sqsQueue.queueArn
      ],
      actions: [ `${action}` ]
    }));
  }
}
