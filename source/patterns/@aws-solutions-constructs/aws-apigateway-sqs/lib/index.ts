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
import * as api from '@aws-cdk/aws-apigateway';
import * as sqs from '@aws-cdk/aws-sqs';
import * as iam from '@aws-cdk/aws-iam';
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from '@aws-cdk/core';
import * as cdk from '@aws-cdk/core';
import * as logs from '@aws-cdk/aws-logs';

/**
 * @summary The properties for the ApiGatewayToSqs class.
 */
export interface ApiGatewayToSqsProps {
  /**
   * Optional user-provided props to override the default props for the API Gateway.
   *
   * @default - Default properties are used.
   */
  readonly apiGatewayProps?: api.RestApiProps | any
  /**
   * Existing instance of SQS queue object, providing both this  and queueProps will cause an error
   *
   * @default - None
   */
  readonly existingQueueObj?: sqs.Queue,
  /**
   * User provided props to override the default props for the SQS queue.
   *
   * @default - Default props are used
   */
  readonly queueProps?: sqs.QueueProps,
  /**
   * Whether to deploy a secondary queue to be used as a dead letter queue.
   *
   * @default - required field.
   */
  readonly deployDeadLetterQueue?: boolean,
  /**
   * Optional user provided properties for the dead letter queue
   *
   * @default - Default props are used
   */
  readonly deadLetterQueueProps?: sqs.QueueProps,
  /**
   * The number of times a message can be unsuccessfully dequeued before being moved to the dead-letter queue.
   *
   * @default - required only if deployDeadLetterQueue = true.
   */
  readonly maxReceiveCount?: number,
  /**
   * Whether to deploy an API Gateway Method for Create operations on the queue (i.e. sqs:SendMessage).
   *
   * @default - false
   */
  readonly allowCreateOperation?: boolean,
  /**
   * API Gateway Request template for Create method, if allowCreateOperation set to true
   *
   * @default - None
   */
  readonly createRequestTemplate?: string,
  /**
   * Whether to deploy an API Gateway Method for Read operations on the queue (i.e. sqs:ReceiveMessage).
   *
   * @default - "Action=SendMessage&MessageBody=$util.urlEncode(\"$input.body\")"
   */
  readonly allowReadOperation?: boolean,
  /**
   * API Gateway Request template for Get method, if allowReadOperation set to true
   *
   * @default - "Action=ReceiveMessage"
   */
  readonly readRequestTemplate?: string,
  /**
   * Whether to deploy an API Gateway Method for Delete operations on the queue (i.e. sqs:DeleteMessage).
   *
   * @default - false
   */
  readonly allowDeleteOperation?: boolean
  /**
   * API Gateway Request template for Delete method, if allowDeleteOperation set to true
   *
   * @default - "Action=DeleteMessage&ReceiptHandle=$util.urlEncode($input.params('receiptHandle'))"
   */
  readonly deleteRequestTemplate?: string,
  /**
   * User provided props to override the default props for the CloudWatchLogs LogGroup.
   *
   * @default - Default props are used
   */
  readonly logGroupProps?: logs.LogGroupProps
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
      deadLetterQueue: this.deadLetterQueue
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
    let createRequestTemplate = "Action=SendMessage&MessageBody=$util.urlEncode(\"$input.body\")";

    if (props.createRequestTemplate) {
      createRequestTemplate = props.createRequestTemplate;
    }

    if (props.allowCreateOperation && props.allowCreateOperation === true) {
      this.addActionToPolicy("sqs:SendMessage");
      defaults.addProxyMethodToApiResource({
        service: "sqs",
        path: `${cdk.Aws.ACCOUNT_ID}/${this.sqsQueue.queueName}`,
        apiGatewayRole: this.apiGatewayRole,
        apiMethod: "POST",
        apiResource: this.apiGateway.root,
        requestTemplate: createRequestTemplate,
        contentType: "'application/x-www-form-urlencoded'"
      });
    }

    // Read
    let readRequestTemplate = "Action=ReceiveMessage";

    if (props.readRequestTemplate) {
      readRequestTemplate = props.readRequestTemplate;
    }

    if (props.allowReadOperation === undefined || props.allowReadOperation === true) {
      this.addActionToPolicy("sqs:ReceiveMessage");
      defaults.addProxyMethodToApiResource({
        service: "sqs",
        path: `${cdk.Aws.ACCOUNT_ID}/${this.sqsQueue.queueName}`,
        apiGatewayRole: this.apiGatewayRole,
        apiMethod: "GET",
        apiResource: this.apiGateway.root,
        requestTemplate: readRequestTemplate,
        contentType: "'application/x-www-form-urlencoded'"
      });
    }

    // Delete
    let deleteRequestTemplate = "Action=DeleteMessage&ReceiptHandle=$util.urlEncode($input.params('receiptHandle'))";

    if (props.deleteRequestTemplate) {
      deleteRequestTemplate = props.deleteRequestTemplate;
    }

    if (props.allowDeleteOperation && props.allowDeleteOperation === true) {
      this.addActionToPolicy("sqs:DeleteMessage");
      defaults.addProxyMethodToApiResource({
        service: "sqs",
        path: `${cdk.Aws.ACCOUNT_ID}/${this.sqsQueue.queueName}`,
        apiGatewayRole: this.apiGatewayRole,
        apiMethod: "DELETE",
        apiResource: apiGatewayResource,
        requestTemplate: deleteRequestTemplate,
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
