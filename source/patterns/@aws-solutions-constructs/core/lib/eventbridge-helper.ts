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

// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import * as events from 'aws-cdk-lib/aws-events';

export interface BuildEventBusProps {
  /**
   * Existing instance of SNS Topic object, providing both this and `topicProps` will cause an error.
   *
   * @default - None.
   */
  readonly existingEventBusInterface?: events.IEventBus;
  /**
   * Optional user provided props to override the default props for the SNS topic.
   *
   * @default - Default props are used.
   */
  readonly eventBusProps?: events.EventBusProps;
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function buildEventBus(scope: Construct, props: BuildEventBusProps): events.IEventBus | undefined {
  // Check whether existing EventBus is provided
  if (props.existingEventBusInterface) {
    return props.existingEventBusInterface;
  } else if (props.eventBusProps) {
    // eventBusProps is provided, create a new EventBus
    const eventBusName = props.eventBusProps.eventBusName || 'CustomEventBus';
    return new events.EventBus(scope, eventBusName, props.eventBusProps);
  }
  // Typescript requires this return statement, so disabling SonarQube warning
  return; // NOSONAR
}

export interface EventBridgeProps {
  readonly existingEventBusInterface?: events.IEventBus,
  readonly eventBusProps?: events.EventBusProps
}

export function CheckEventBridgeProps(propsObject: EventBridgeProps | any) {
  let errorMessages = '';
  let errorFound = false;

  if (propsObject.existingEventBusInterface && propsObject.eventBusProps) {
    errorMessages += 'Error - Either provide existingEventBusInterface or eventBusProps, but not both.\n';
    errorFound = true;
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }
}
