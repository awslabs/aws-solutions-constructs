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
import * as defaults from '@aws-solutions-constructs/core';
import * as iam from '@aws-cdk/aws-iam';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from '@aws-cdk/core';
import { overrideProps } from '@aws-solutions-constructs/core';

/**
 * @summary The properties for the CloudFrontToApiGateway Construct
 */
export interface EventbridgeToLambdaProps {
  /**
   * Existing instance of Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function,
  /**
   * User provided props to override the default props for the Lambda function.
   *
   * @default - Default props are used
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps,
  /**
   * Existing instance of a custom EventBus, uses `Default` EventBus if this property is not set.
   *
   * @default - None
   */
  readonly existingEventBus?: events.IEventBus,
  /**
   * A new custom EventBus is created with provided props.
   *
   * @default - None
   */
  readonly eventBusProps?: events.EventBusProps,
  /**
   * User provided eventRuleProps to override the defaults
   *
   * @default - None
   */
  readonly eventRuleProps: events.RuleProps
}

export class EventbridgeToLambda extends Construct {
  public readonly lambdaFunction: lambda.Function;
  public readonly eventBus?: events.IEventBus;
  public readonly eventsRule: events.Rule;

  /**
   * @summary Constructs a new instance of the EventbridgeToLambda class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {EventbridgeToLambdaProps} props - user provided props for the construct
   * @access public
   */
  constructor(scope: Construct, id: string, props: EventbridgeToLambdaProps) {
    super(scope, id);
    defaults.CheckProps(props);

    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps
    });

    const lambdaFunc: events.IRuleTarget = {
      bind: () => ({
        id: '',
        arn: this.lambdaFunction.functionArn
      })
    };

    // build an event bus if existingEventBus is provided or eventBusProps are provided
    this.eventBus = defaults.buildEventBus(this, {
      existingEventBus: props.existingEventBus,
      eventBusProps: props.eventBusProps
    });

    const defaultEventsRuleProps = defaults.DefaultEventsRuleProps([lambdaFunc], this.eventBus);
    const eventsRuleProps = overrideProps(defaultEventsRuleProps, props.eventRuleProps, true);

    this.eventsRule = new events.Rule(this, 'EventsRule', eventsRuleProps);

    defaults.addPermission(this.lambdaFunction, "AwsEventsLambdaInvokePermission", {
      principal: new iam.ServicePrincipal('events.amazonaws.com'),
      sourceArn: this.eventsRule.ruleArn
    });
  }
}