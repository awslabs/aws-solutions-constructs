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

import * as defaults from '@aws-solutions-constructs/core';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as pipes from 'aws-cdk-lib/aws-pipes';
import * as kms from 'aws-cdk-lib/aws-kms';
import { PipesLogLevel } from '@aws-solutions-constructs/core';
export { PipesLogLevel } from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

/**
 * @summary The properties for the SnsToSqs class.
 */
export interface SqsToPipesToStepfunctionsProps {

  // *******************
  // Queue Props
  // *******************

  /**
   * An optional, existing SQS queue to be used instead of the default queue. Providing both this and queueProps will cause an error.
   */
  readonly existingQueueObj?: sqs.Queue,
  /**
   * Optional user provided properties to override the default properties for the SQS queue.
   */
  readonly queueProps?: sqs.QueueProps,
  /**
   * Whether to encrypt the Queue with a customer managed KMS key (CMK). This is the default
   * behavior, and this property defaults to true - if it is explicitly set to false then the Queue
   * is encrypted with an Amazon managed KMS key. For a completely unencrypted Queue (not recommended),
   * create the Queue separately from the construct and pass it in using the existingQueueObject. Since
   * SNS subscriptions do not currently support SQS queues with AWS managed encryption keys, setting this
   * to false will always result in an error from the underlying CDK - we have still included this property
   * for consistency with topics and to be ready if the services one day support this functionality.
   */
  readonly encryptQueueWithCmk?: boolean,
  /**
   * An optional subset of key properties to override the default properties used by constructs (enableKeyRotation: true).
   * These properties will be used in constructing the CMK used to encrypt the SQS queue.
   */
  readonly queueEncryptionKeyProps?: kms.KeyProps,
  /**
   * 	An optional CMK that will be used by the construct to encrypt the new SQS queue.
   */
  readonly existingQueueEncryptionKey?: kms.Key,
  /**
   * Whether to create a secondary queue to be used as a dead letter queue.
   *
   * default = true.
   */
  readonly deployDeadLetterQueue?: boolean,
  /**
   * Optional user-provided props to override the default props for the dead letter SQS queue.
   */
  readonly deadLetterQueueProps?: sqs.QueueProps,
  /**
   * The number of times a message can be unsuccessfully dequeued before being moved to the dead letter
   * queue. Defaults to 15.
   */
  readonly maxReceiveCount?: number,

  // *******************
  // State Machine Props
  // *******************

  /**
   * 	User provided props for the sfn.StateMachine. This or existingStateMachine is required
   */
  readonly stateMachineProps?: sfn.StateMachineProps,
  /**
   * Optional existing state machine to incorporate into the construct
   */
  readonly existingStateMachineObj?: sfn.StateMachine,
  /**
   * Whether to create recommended CloudWatch alarms
   *
   * default = true
   */
  readonly createCloudWatchAlarms?: boolean,
  /**
   * Optional user provided props to override the default props for for the CloudWatchLogs LogGroup.
   */
  readonly logGroupProps?: logs.LogGroupProps,

  // *******************
  // Pipe Props
  // *******************

  /**
   * Optional customer provided settings for the EventBridge pipe. source, target and
   * roleArn are set by the construct and cannot be overriden. The construct will generate
   * default sourceParameters, targetParameters and logConfiguration that can be
   * overriden by populating those values in these props. If the client wants to implement
   * enrichment or a filter, this is where that information can be provided. Any other props
   * can be freely overridden.
   */
  readonly pipeProps?: pipes.CfnPipeProps | any,
  /**
   * Default behavior is for the this construct to create a new CloudWatch Logs log group for the pipe.
   * These props are used to override defaults set by AWS or this construct. If there are concerns about
   * the cost of log storage, this is where a client can specify a shorter retention duration (in days)
   */
  readonly pipeLogProps?: logs.LogGroupProps,
  /**
   * Threshold for what messages the new pipe sends to the log, PipesLogLevel.OFF, PipesLogLevel.ERROR,
   * PipesLogLevel.INFO, PipesLogLevel.TRACE. The default is INFO. Setting the level to OFF will prevent
   * any log group from being created. Providing pipeProps.logConfiguration will controls all aspects of
   * logging and any construct provided log configuration is disabled. If pipeProps.logConfiguration is
   * provided then specifying this or pipeLogProps is an error.
   */
  readonly logLevel?: PipesLogLevel,
  /**
   * Optional - Lambda function that the construct will configure to be called to enrich the message
   * between source and target. The construct will configure the pipe IAM role to allow invoking the
   * function (but will not affect the IArole assigned to the function). Specifying both this and
   * enrichmentStateMachine is an error. Default - undefined
   */
  readonly enrichmentFunction?: lambda.Function,
  /**
   * Optional - Step Functions state machine that the construct will configure to be called to enrich the message
   * between source and target. The construct will configure the pipe IAM role to allow executing the state
   * machine (but will not affect the IAM role assigned to the state machine). Specifying both this and
   * enrichmentStateMachine is an error. Enrichment is invoked synchronously, so this must be an EXPRESS
   * state machin. Default - undefined
   */
  readonly enrichmentStateMachine?: sfn.StateMachine,

}

export class SqsToPipesToStepfunctions extends Construct {
  public readonly stateMachine: sfn.StateMachine;
  public readonly stateMachineLogGroup?: logs.ILogGroup;
  public readonly cloudwatchAlarms?: cloudwatch.Alarm[];
  public readonly sqsQueue: sqs.Queue;
  public readonly deadLetterQueue?: sqs.DeadLetterQueue;
  public readonly encryptionKey?: kms.IKey;
  public readonly pipe: pipes.CfnPipe;
  public readonly pipeRole: iam.Role;
  /**
   * @summary Constructs a new instance of the SqsToPipesToStepfunctions class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {SqsToPipesToStepfunctionsProps} props - user provided props for the construct.
   * @access public
   */
  constructor(scope: Construct, id: string, props: SqsToPipesToStepfunctionsProps) {
    super(scope, id);

    defaults.CheckStateMachineProps(props);
    defaults.CheckSqsProps(props);
    defaults.CheckPipesProps(props);

    // Create the Queue
    // Setup the queue
    const buildQueueResponse = defaults.buildQueue(this, 'queue', {
      existingQueueObj: props.existingQueueObj,
      queueProps: props.queueProps,
      deployDeadLetterQueue: props.deployDeadLetterQueue,
      deadLetterQueueProps: props.deadLetterQueueProps,
      maxReceiveCount: props.maxReceiveCount,
      enableEncryptionWithCustomerManagedKey: props.encryptQueueWithCmk,
      encryptionKey: props.existingQueueEncryptionKey,
      encryptionKeyProps: props.queueEncryptionKeyProps
    });
    this.sqsQueue = buildQueueResponse.queue;
    this.deadLetterQueue = buildQueueResponse.dlq;

    // Create the State Machine
    if (!props.existingStateMachineObj) {
      const buildStateMachineResponse = defaults.buildStateMachine(this, defaults.idPlaceholder, {
        stateMachineProps: props.stateMachineProps!,  // CheckStateMachineProps ensures this is defined if existingStateMachineObj is not
        logGroupProps: props.logGroupProps,
        createCloudWatchAlarms: props.createCloudWatchAlarms,
      });
      this.stateMachine = buildStateMachineResponse.stateMachine;
      this.stateMachineLogGroup = buildStateMachineResponse.logGroup;
      this.cloudwatchAlarms = buildStateMachineResponse.cloudWatchAlarms;
    } else {
      this.stateMachine = props.existingStateMachineObj;
    }

    // Create the pipe to connect the queue and state machine
    const buildPipeResponse = defaults.BuildPipe(this, id, {
      source: defaults.CreateSqsSource(this.sqsQueue, props.pipeProps?.sourceParameters),
      target: defaults.CreateStateMachineTarget(this.stateMachine, props.pipeProps?.targetParameters),
      enrichmentFunction: props.enrichmentFunction,
      enrichmentStateMachine: props.enrichmentStateMachine,
      clientProps: props.pipeProps,
      logLevel: props.logLevel,
      pipeLogProps: props.pipeLogProps
    });
    this.pipe = buildPipeResponse.pipe;
    this.pipeRole = buildPipeResponse.pipeRole;
    defaults.addL2CfnGuardSuppressRules(this.pipeRole, ["IAM_NO_INLINE_POLICY_CHECK"]);
  }
}
