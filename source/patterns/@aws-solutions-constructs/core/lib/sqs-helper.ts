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

/*
 *  The functions found here in the core library are for internal use and can be changed
 *  or removed outside of a major release. We recommend against calling them directly from client code.
 */

// Imports
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as defaults from './sqs-defaults';
import * as kms from 'aws-cdk-lib/aws-kms';
import { CheckBooleanWithDefault, consolidateProps, printWarning,  overrideProps } from './utils';
import { AccountPrincipal, Effect, PolicyStatement, AnyPrincipal } from 'aws-cdk-lib/aws-iam';
import { Stack } from 'aws-cdk-lib';
import {buildEncryptionKey} from "./kms-helper";
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

export interface BuildQueueProps {
    /**
     * Existing instance of SQS queue object, providing both this and queueProps will cause an error.
     *
     * @default - None.
     */
    readonly existingQueueObj?: sqs.Queue;
    /**
     * Optional user provided props to override the default props for the primary queue.
     *
     * @default - Default props are used.
     */
    readonly queueProps?: sqs.QueueProps;
    /**
     * Optional props required by the construct that overide both the default and client supplied values
     *
     * @default - none
     */
    readonly constructQueueProps?: sqs.QueueProps;
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
     * Optional props required by the construct that overide both the default and client supplied values
     *
     * @default - none
     */
    readonly constructDeadLetterQueueProps?: sqs.QueueProps,
    /**
     * The number of times a message can be unsuccessfully dequeued before being moved to the dead letter queue.
     *
     * @default - Default props are used
     */
    readonly maxReceiveCount?: number
}

export interface BuildQueueResponse {
  readonly queue: sqs.Queue,
  readonly key?: kms.IKey,
  readonly dlq?: sqs.DeadLetterQueue,
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function buildQueue(scope: Construct, id: string, props: BuildQueueProps): BuildQueueResponse {
  CheckBuidQueueProps(props);
  let deadLetterQueue: sqs.DeadLetterQueue | undefined;

  if (CheckBooleanWithDefault( props.deployDeadLetterQueue, true)) {
    deadLetterQueue = buildDeadLetterQueue(scope, id, {
      existingQueueObj: props.existingQueueObj,
      deployDeadLetterQueue: props.deployDeadLetterQueue,
      deadLetterQueueProps: props.deadLetterQueueProps,
      constructDeadLetterQueueProps: props.constructDeadLetterQueueProps,
      maxReceiveCount: props.maxReceiveCount
    });
  }

  // If an existingQueueObj is not specified
  if (!props.existingQueueObj) {
    // Setup the queue
    let queueProps;
    if (props.queueProps) {
      // If property overrides have been provided, incorporate them and deploy
      const checkFifo = props.queueProps.fifo ? true : undefined;
      queueProps = overrideProps(defaults.DefaultQueueProps(), { ...props.queueProps, fifo: checkFifo });
    } else {
      // If no property overrides, deploy using the default configuration
      queueProps = defaults.DefaultQueueProps();
    }
    if (props.constructQueueProps) {
      queueProps = overrideProps(queueProps, props.constructQueueProps);
    }

    // Determine whether a DLQ property should be added
    if (deadLetterQueue) {
      queueProps.deadLetterQueue = deadLetterQueue;
    }

    // Set encryption properties.
    // Note that defaults.DefaultQueueProps sets encryption to Server-side KMS encryption with a KMS key managed by SQS.
    if (props.queueProps?.encryptionMasterKey) {
      queueProps.encryptionMasterKey = props.queueProps?.encryptionMasterKey;
    } else if (props.encryptionKey) {
      queueProps.encryptionMasterKey = props.encryptionKey;
    } else if (props.encryptionKeyProps || props.enableEncryptionWithCustomerManagedKey === true) {
      queueProps.encryptionMasterKey = buildEncryptionKey(scope, id, props.encryptionKeyProps);
    }

    // NOSONAR (typescript:S6330)
    // encryption is set to QueueEncryption.KMS_MANAGED by default in DefaultQueueProps, but
    // Sonarqube can't parse the code well enough to see this. Encryption is confirmed by
    // the 'Test deployment without imported encryption key' unit test
    const queue = new sqs.Queue(scope, id, queueProps); // NOSONAR

    applySecureQueuePolicy(queue);

    // Return the queue
    return { queue, key: queue.encryptionMasterKey,  dlq: deadLetterQueue };
  } else {
    // If an existingQueueObj is specified, return that object as the queue to be used
    return { queue: props.existingQueueObj };
  }
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
function CheckBuidQueueProps(props: BuildQueueProps) {
  if ((props.queueProps?.encryptionMasterKey || props.encryptionKey || props.encryptionKeyProps)
  && props.enableEncryptionWithCustomerManagedKey !== true) {
    printWarning(`Ignoring enableEncryptionWithCustomerManagedKey because one of
     queueProps.encryptionMasterKey, encryptionKey, or encryptionKeyProps was already specified`);
  }

  let errorMessages = '';
  let errorFound = false;

  if ((props.deployDeadLetterQueue === false) && props.maxReceiveCount) {
    errorMessages += 'Error - MaxReceiveCount cannot be set if deployDeadLetterQueue is false.\n';
    errorFound = true;
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }
}

export interface BuildDeadLetterQueueProps {
  /**
   * Existing instance of SQS queue object, providing both this and queueProps will cause an error.
   *
   * @default - None.
   */
  readonly existingQueueObj?: sqs.Queue,
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
   * Optional Props that override default and client props
   *
   * @default - Default props are used
   */
  readonly constructDeadLetterQueueProps?: sqs.QueueProps,
  /**
   * The number of times a message can be unsuccessfully dequeued before being moved to the dead letter queue.
   *
   * @default - Default props are used
   */
  readonly maxReceiveCount?: number
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function buildDeadLetterQueue(scope: Construct, id: string, props: BuildDeadLetterQueueProps): sqs.DeadLetterQueue | undefined {
  if (!props.existingQueueObj && CheckBooleanWithDefault(props.deployDeadLetterQueue, true)) {
    // Create the Dead Letter Queue
    const buildQueueResponse = buildQueue(scope, `${id}-dlq`, {
      queueProps: consolidateProps({}, props.deadLetterQueueProps, props.constructDeadLetterQueueProps),
      deployDeadLetterQueue: false  // don't deploy a DLQ for the DLG!
    });

    const mrc = (props.maxReceiveCount) ? props.maxReceiveCount : defaults.defaultMaxReceiveCount;

    // Setup the Dead Letter Queue interface
    const deadLetterQueueObject: sqs.DeadLetterQueue = {
      maxReceiveCount: mrc,
      queue: buildQueueResponse.queue
    };

    // Return the dead letter queue interface
    return deadLetterQueueObject;
  }
  // ESLint requires this return statement, so disabling SonarQube warning
  return; // NOSONAR
}

function applySecureQueuePolicy(queue: sqs.Queue): void {

  // Apply queue policy to enforce only the queue owner can perform operations on queue
  queue.addToResourcePolicy(
    new PolicyStatement({
      sid: 'QueueOwnerOnlyAccess',
      resources: [
        `${queue.queueArn}`
      ],
      actions: [
        "sqs:DeleteMessage",
        "sqs:ReceiveMessage",
        "sqs:SendMessage",
        "sqs:GetQueueAttributes",
        "sqs:RemovePermission",
        "sqs:AddPermission",
        "sqs:SetQueueAttributes"
      ],
      principals: [new AccountPrincipal(Stack.of(queue).account)],
      effect: Effect.ALLOW
    })
  );

  // Apply queue policy to enforce encryption of data in transit
  queue.addToResourcePolicy(
    new PolicyStatement({
      sid: 'HttpsOnly',
      resources: [
        `${queue.queueArn}`
      ],
      actions: [
        "SQS:*"
      ],
      principals: [new AnyPrincipal()],
      effect: Effect.DENY,
      conditions:
          {
            Bool: {
              'aws:SecureTransport': 'false'
            }
          }
    })
  );
}

export interface SqsProps {
  readonly existingQueueObj?: sqs.Queue,
  readonly queueProps?: sqs.QueueProps,
  readonly deployDeadLetterQueue?: boolean,
  readonly deadLetterQueueProps?: sqs.QueueProps,
  readonly encryptionKey?: kms.Key,
  readonly encryptionKeyProps?: kms.KeyProps
}

export function CheckSqsProps(propsObject: SqsProps | any) {
  let errorMessages = '';
  let errorFound = false;

  if (propsObject.existingQueueObj && propsObject.queueProps) {
    errorMessages += 'Error - Either provide queueProps or existingQueueObj, but not both.\n';
    errorFound = true;
  }

  if (propsObject.queueProps?.encryptionMasterKey && propsObject.encryptionKey) {
    errorMessages += 'Error - Either provide queueProps.encryptionMasterKey or encryptionKey, but not both.\n';
    errorFound = true;
  }

  if (propsObject.queueProps?.encryptionMasterKey && propsObject.encryptionKeyProps) {
    errorMessages += 'Error - Either provide queueProps.encryptionMasterKey or encryptionKeyProps, but not both.\n';
    errorFound = true;
  }

  if (propsObject.encryptionKey && propsObject.encryptionKeyProps) {
    errorMessages += 'Error - Either provide encryptionKey or encryptionKeyProps, but not both.\n';
    errorFound = true;
  }

  if ((propsObject?.deployDeadLetterQueue === false) && propsObject.deadLetterQueueProps) {
    errorMessages += 'Error - If deployDeadLetterQueue is false then deadLetterQueueProps cannot be specified.\n';
    errorFound = true;
  }

  const isQueueFifo: boolean = propsObject?.queueProps?.fifo;
  const isDeadLetterQueueFifo: boolean = propsObject?.deadLetterQueueProps?.fifo;
  const deployDeadLetterQueue: boolean = CheckBooleanWithDefault(propsObject.deployDeadLetterQueue, true);

  if (deployDeadLetterQueue && (isQueueFifo !== isDeadLetterQueueFifo)) {
    errorMessages += 'Error - If you specify a fifo: true in either queueProps or deadLetterQueueProps, you must also set fifo: ' +
      'true in the other props object. Fifo must match for the Queue and the Dead Letter Queue.\n';
    errorFound = true;
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }
}
