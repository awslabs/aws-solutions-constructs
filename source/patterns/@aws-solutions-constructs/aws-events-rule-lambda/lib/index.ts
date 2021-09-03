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

import * as lambda from '@aws-cdk/aws-lambda';
import * as events from '@aws-cdk/aws-events';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from '@aws-cdk/core';
import { EventbridgeToLambda } from '@aws-solutions-constructs/aws-eventbridge-lambda';

/**
 * @summary The properties for the CloudFrontToApiGateway Construct
 */
export interface EventsRuleToLambdaProps {
  /**
   * Existing instance of Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function;
  /**
   * User provided props to override the default props for the Lambda function.
   *
   * @default - Default props are used
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps;
  /**
   * Existing instance of a custom EventBus.
   *
   * @default - None
   */
  readonly existingEventBusInterface?: events.IEventBus;
  /**
   * A new custom EventBus is created with provided props.
   *
   * @default - None
   */
  readonly eventBusProps?: events.EventBusProps;
  /**
   * User provided eventRuleProps to override the defaults
   *
   * @default - None
   */
  readonly eventRuleProps: events.RuleProps;
}

export class EventsRuleToLambda extends Construct {
  public readonly lambdaFunction: lambda.Function;
  public readonly eventBus?: events.IEventBus;
  public readonly eventsRule: events.Rule;

  /**
   * @summary Constructs a new instance of the EventsRuleToLambda class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {EventsRuleToLambdaProps} props - user provided props for the construct
   * @access public
   */
  constructor(scope: Construct, id: string, props: EventsRuleToLambdaProps) {
    super(scope, id);
    const convertedProps: EventsRuleToLambdaProps = { ...props };
    const wrappedConstruct: EventsRuleToLambda = new EventbridgeToLambda(this, `${id}-wrapped`, convertedProps);

    this.lambdaFunction = wrappedConstruct.lambdaFunction;
    this.eventsRule = wrappedConstruct.eventsRule;
    this.eventBus = wrappedConstruct.eventBus;
  }
}