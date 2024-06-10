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

// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as defaults from '@aws-solutions-constructs/core';

export interface S3BucketFactoryProps {
  readonly bucketProps?: s3.BucketProps | any,
  readonly logS3AccessLogs?: boolean,
  readonly loggingBucketProps?: s3.BucketProps,
}

// Create a response specifically for the interface to avoid coupling client with internal implementation
export interface S3BucketFactoryResponse {
  readonly s3Bucket: s3.Bucket,
  readonly s3LoggingBucket?: s3.Bucket,
}

export interface StateMachineFactoryProps {
  /**
   * The CDK properties that define the state machine. This property is required and
   * must include a definitionBody or definition (definition is deprecated)
   */
  readonly stateMachineProps: sfn.StateMachineProps,
  /**
   * An existing LogGroup to which the new state machine will write log entries.
   *
   * Default: none, the construct will create a new log group.
   */
  readonly logGroupProps?: logs.LogGroupProps
}

// Create a response specifically for the interface to avoid coupling client with internal implementation
export interface StateMachineFactoryResponse {
  /**
   * The state machine created by the factory (the state machine role is
   * available as a property on this resource)
   */
  readonly stateMachine: sfn.StateMachine,
  /**
   * The log group that will receive log messages from the state maching
   */
  readonly logGroup: logs.ILogGroup
}

export interface SqsQueueFactoryProps {
  /**
   * Optional user provided props to override the default props for the primary queue.
   *
   * @default - Default props are used.
   */
  readonly queueProps?: sqs.QueueProps;
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
   * Optional user provided properties to override the default properties for the KMS encryption key used to encrypt the SQS Queue with.
   *
   * @default - None
   */
   readonly encryptionKeyProps?: kms.KeyProps;
  /**
   * Whether to deploy a secondary queue to be used as a dead letter queue.
   *
   * @default - true
   */
  readonly deployDeadLetterQueue?: boolean,
  /**
   * Optional user provided properties for the dead letter queue
   *
   * @default - Default props are used
   */
  readonly deadLetterQueueProps?: sqs.QueueProps,
  /**
   * The number of times a message can be unsuccessfully dequeued before being moved to the dead letter queue.
   *
   * @default - Default props are used
   */
  readonly maxReceiveCount?: number
}

export interface SqsQueueFactoryResponse {
  // TODO: Document these
  readonly queue: sqs.Queue,
  readonly key?: kms.IKey,
  readonly deadLetterQueue?: sqs.DeadLetterQueue,
}

export class ConstructsFactories extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);
  }

  public s3BucketFactory(id: string, props: S3BucketFactoryProps): S3BucketFactoryResponse {
    defaults.CheckS3Props(props);

    const propsArg: defaults.BuildS3BucketProps = {
      bucketProps: props.bucketProps,
      loggingBucketProps: props.loggingBucketProps,
      logS3AccessLogs: props.logS3AccessLogs,
    };

    const buildS3BucketResponse = defaults.buildS3Bucket(this, propsArg, id);

    return {
      s3Bucket: buildS3BucketResponse.bucket,
      s3LoggingBucket: buildS3BucketResponse.loggingBucket
    };
  }

  public stateMachineFactory(id: string, props: StateMachineFactoryProps): StateMachineFactoryResponse {
    const buildStateMachineResponse = defaults.buildStateMachine(this, id, props.stateMachineProps, props.logGroupProps);
    return {
      stateMachine: buildStateMachineResponse.stateMachine,
      logGroup: buildStateMachineResponse.logGroup
    };
  }

  public sqsQueueFactory(id: string, props: SqsQueueFactoryProps): SqsQueueFactoryResponse {
    defaults.CheckSqsProps(props);

    const buildQueueResponse = defaults.buildQueue(this, id, {
      queueProps: props.queueProps,
      enableEncryptionWithCustomerManagedKey: props.enableEncryptionWithCustomerManagedKey,
      encryptionKey: props.encryptionKey,
      encryptionKeyProps: props.encryptionKeyProps,
      deployDeadLetterQueue: props.deployDeadLetterQueue,
      deadLetterQueueProps: props.deadLetterQueueProps,
      maxReceiveCount: props.maxReceiveCount,
    });

    return {
      queue: buildQueueResponse.queue,
      key: buildQueueResponse.key,
      deadLetterQueue: buildQueueResponse.dlq,
    };
  }

}
