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
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as pipes from 'aws-cdk-lib/aws-pipes';
import { PipesLogLevel } from '@aws-solutions-constructs/core';
export { PipesLogLevel } from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

export interface DynamoDBStreamsToPipesToStepfunctionsProps {

  // *******************
  // DynamoDB Props
  // *******************

  /**
   * Optional user provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly dynamoTableProps?: dynamodb.TableProps,
  /**
   * Existing instance of DynamoDB table object, providing both this and `dynamoTableProps` will cause an error.
   *
   * @default - None
   */
  readonly existingTableInterface?: dynamodb.ITable,
  /**
   * Whether to deploy a SQS dead letter queue when a data record reaches the Maximum Retry Attempts or Maximum Record Age,
   * its metadata like shard ID and stream ARN will be sent to an SQS queue. The construct will create and configure the DLQ
   * with a default maximumRetryAttempts of 2. To customize this, you should set maximumRecordAgeInSeconds and/or
   * maximumRetryAttempts attempts in pipeProps.sourceParameters.dynamoDbStreamParameters. Default - deploy queue,
   * MaximumRetryAttempts is set to 3, and maximumRecordAge is left to default (-1, or infinite)
   *
   * @default - true.
   */
  readonly deploySqsDlqQueue?: boolean,
  /**
   * Optional user provided properties for the SQS dead letter queue
   *
   * @default - Default props are used
   */
  readonly sqsDlqQueueProps?: sqs.QueueProps

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
   * can be freely overridden. To control aspects of the Streams feed (e.g. batchSize, startingPosition),
   * do that here under sourceParameters.dynamoDbStreamParameters.
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

export class DynamoDBStreamsToPipesToStepfunctions extends Construct {
  public readonly stateMachine: sfn.StateMachine;
  public readonly stateMachineLogGroup?: logs.ILogGroup;
  public readonly cloudwatchAlarms?: cloudwatch.Alarm[];
  public readonly dynamoTableInterface: dynamodb.ITable;
  public readonly dynamoTable?: dynamodb.Table;
  public readonly pipe: pipes.CfnPipe;
  public readonly pipeRole: iam.Role;
  public readonly dlq?: sqs.Queue;
  /**
   * @summary Constructs a new instance of the DynamoDBStreamsToPipesToStepfunctions class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {DynamoDBStreamsToPipesToStepfunctionsProps} props - user provided props for the construct.
   * @access public
   */
  constructor(scope: Construct, id: string, props: DynamoDBStreamsToPipesToStepfunctionsProps) {
    super(scope, id);

    defaults.CheckStateMachineProps(props);
    defaults.CheckDynamoDBProps(props);
    defaults.CheckPipesProps(props);

    if ((props.deploySqsDlqQueue === false) &&
      (props.pipeProps?.sourceParameters?.dynamoDbStreamParameters?.maximumRecordAgeInSeconds ||
        props.pipeProps?.sourceParameters?.dynamoDbStreamParameters?.maximumRetryAttempts)
    ) {
      throw new Error('ERROR - Cannot define maximumRecordAgeInSeconds and maximumRetryAttempts when deploySqsDlqQueue is false\n');
    }

    const buildDynamoDBTableWithStreamResponse = defaults.buildDynamoDBTableWithStream(this, {
      dynamoTableProps: props.dynamoTableProps,
      existingTableInterface: props.existingTableInterface
    });
    this.dynamoTableInterface = buildDynamoDBTableWithStreamResponse.tableInterface;
    this.dynamoTable = buildDynamoDBTableWithStreamResponse.tableObject;

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

    const ddbStreamsSource = defaults.CreateDynamoDBStreamsSource(this, {
      table: this.dynamoTableInterface,
      deploySqsDlqQueue: props.deploySqsDlqQueue,
      sqsDlqQueueProps: props.sqsDlqQueueProps,
      clientProps: props.pipeProps?.sourceParameters
    });
    this.dlq = ddbStreamsSource.dlq;

    // Create the pipe to connect the queue and state machine
    const buildPipeResponse = defaults.BuildPipe(this, id, {
      source: ddbStreamsSource,
      target: defaults.CreateStateMachineTarget(this.stateMachine, props.pipeProps?.targetParameters),
      enrichmentFunction: props.enrichmentFunction,
      enrichmentStateMachine: props.enrichmentStateMachine,
      clientProps: props.pipeProps,
      logLevel: props.logLevel,
      pipeLogProps: props.pipeLogProps
    });
    this.pipe = buildPipeResponse.pipe;
    this.pipeRole = buildPipeResponse.pipeRole;
    defaults.addCfnGuardSuppressRules(this.pipeRole, ["IAM_NO_INLINE_POLICY_CHECK"]);
  }
}