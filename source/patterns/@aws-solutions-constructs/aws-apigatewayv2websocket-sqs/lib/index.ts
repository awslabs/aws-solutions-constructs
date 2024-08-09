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

import * as defaults from "@aws-solutions-constructs/core";
import * as cdk from "aws-cdk-lib";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import * as logs from "aws-cdk-lib/aws-logs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

/**
 * @summary The properties for the ApiGatewayV2WebSocketToSqs class.
 */
export interface ApiGatewayV2WebSocketToSqsProps {
  /**
   * Existing instance of WebSocket API object, providing both this and webSocketApiProps will cause an error.
   *
   * @default - None
   */
  readonly existingWebSocketApi?: apigwv2.WebSocketApi;

  /**
   * Optional user-provided props to override the default props for the API Gateway.
   *
   * @default - Default properties are used.
   */
  readonly webSocketApiProps?: apigwv2.WebSocketApiProps;

  /**
   * User provided props to override the default props for the SQS queue.
   *
   * @default - Default props are used
   */
  readonly queueProps?: sqs.QueueProps;

  /**
   * Existing instance of SQS queue object, providing both this  and queueProps will cause an error
   */
  readonly existingQueueObj?: sqs.Queue;

  /**
   * Optional user-provided props to override the default props for the log group.
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
   * Optional user provided API Gateway Request Template for the $default route or customRoute (if customRouteName is provided).
   *
   * @default - construct will create and assign a template with default settings to send messages to Queue.
   */
  readonly defaultRouteRequestTemplate?: { [contentType: string]: string };
  /**
   * Whether to create a $default route. If set to true, then it will use the value supplied with `defaultRouteRequestTemplate`.
   * At least one of createDefaultRoute or customRouteName must be provided.
   *
   * @default - false.
   */
  readonly createDefaultRoute?: boolean;
  /**
   * The name of the route that will be sent through WebSocketApiProps.routeSelectionExpression when invoking the WebSocket
   * endpoint. At least one of createDefaultRoute or customRouteName must be provided.
   *
   * @default - None
   */
  readonly customRouteName?: string;
  /**
   * Add IAM authorization to the $connect path by default. Only set this to false if: 1) If plan to provide an authorizer with
   * the `$connect` route; or 2) The API should be open (no authorization) (AWS recommends against deploying unprotected APIs).
   *
   * If an authorizer is specified in connectRouteOptions, this parameter is ignored and no default IAM authorizer will be created
   *
   * @default - true
   */
  readonly defaultIamAuthorization?: boolean;
}

export class ApiGatewayV2WebSocketToSqs extends Construct {
  public readonly webSocketApi: apigwv2.WebSocketApi;
  public readonly webSocketStage: apigwv2.WebSocketStage;
  public readonly apiGatewayRole: iam.Role;
  public readonly apiGatewayLogGroup: logs.LogGroup;
  public readonly sqsQueue: sqs.Queue;
  public readonly deadLetterQueue?: sqs.DeadLetterQueue;

  constructor(scope: Construct, id: string, props: ApiGatewayV2WebSocketToSqsProps) {
    super(scope, id);

    if (props.existingWebSocketApi && props.webSocketApiProps) {
      throw new Error("Provide either an existing WebSocketApi instance or WebSocketApiProps, not both");
    }

    if (!props.existingWebSocketApi && !props.createDefaultRoute && !props.customRouteName) {
      throw new Error("Either createDefaultRoute or customRouteName must be specified when creating a WebSocketApi");
    }

    const constructMandatedDlqProps: sqs.QueueProps = {
      fifo: true,
      deduplicationScope: sqs.DeduplicationScope.MESSAGE_GROUP,
      fifoThroughputLimit: sqs.FifoThroughputLimit.PER_MESSAGE_GROUP_ID,
    };

    const constructMandatedQueueProps: sqs.QueueProps = {
      fifo: true,
      deduplicationScope: sqs.DeduplicationScope.MESSAGE_GROUP,
      fifoThroughputLimit: sqs.FifoThroughputLimit.PER_MESSAGE_GROUP_ID,
      redriveAllowPolicy: {
        redrivePermission: sqs.RedrivePermission.DENY_ALL,
      },
      visibilityTimeout: cdk.Duration.minutes(15),
    };

    // Setup the queue
    const buildQueueResponse = defaults.buildQueue(this, "queue", {
      existingQueueObj: props.existingQueueObj,
      queueProps: props.queueProps,
      deployDeadLetterQueue: props.deployDeadLetterQueue,
      deadLetterQueueProps: props.deadLetterQueueProps,
      maxReceiveCount: props.maxReceiveCount,
      enableEncryptionWithCustomerManagedKey: props.enableEncryptionWithCustomerManagedKey,
      encryptionKey: props.encryptionKey,
      encryptionKeyProps: props.encryptionKeyProps,
      constructDeadLetterQueueProps: constructMandatedDlqProps,
      constructQueueProps: constructMandatedQueueProps,
    });
    this.sqsQueue = buildQueueResponse.queue;
    this.deadLetterQueue = buildQueueResponse.dlq;

    const buildWebSocketQueueApiResponse = defaults.buildWebSocketQueueApi(this, id, {
      queue: this.sqsQueue,
      defaultRouteRequestTemplate: props.defaultRouteRequestTemplate,
      createDefaultRoute: props.createDefaultRoute,
      webSocketApiProps: props.webSocketApiProps,
      existingWebSocketApi: props.existingWebSocketApi,
      logGroupProps: props.logGroupProps,
      defaultIamAuthorization: props.defaultIamAuthorization ?? true,
      customRouteName: props.customRouteName,
    });

    this.webSocketApi = buildWebSocketQueueApiResponse.webSocketApi;
    this.webSocketStage = buildWebSocketQueueApiResponse.webSocketStage;
    this.apiGatewayRole = buildWebSocketQueueApiResponse.apiGatewayRole;
    this.apiGatewayLogGroup = buildWebSocketQueueApiResponse.apiGatewayLogGroup;
  }
}
