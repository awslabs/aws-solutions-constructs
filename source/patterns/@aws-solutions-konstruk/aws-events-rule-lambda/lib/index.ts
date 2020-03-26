/**
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import * as defaults from '@aws-solutions-konstruk/core';
import * as iam from '@aws-cdk/aws-iam';
import { Construct } from '@aws-cdk/core';
import { overrideProps } from '@aws-solutions-konstruk/core';

/**
 * @summary The properties for the CloudFrontToApiGateway Construct
 */
export interface EventsRuleToLambdaProps {
  /**
   * Whether to create a new lambda function or use an existing lambda function.
   * If set to false, you must provide a lambda function object as `existingObj`
   *
   * @default - true
   */
  readonly deployLambda: boolean,
  /**
   * Existing instance of Lambda Function object.
   * If `deploy` is set to false only then this property is required
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function,
  /**
   * Optional user provided props to override the default props.
   * If `deploy` is set to true only then this property is required
   *
   * @default - Default props are used
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps,
  /**
   * User provided eventRuleProps to override the defaults
   *
   * @default - None
   */
  readonly eventRuleProps: events.RuleProps
}

export class EventsRuleToLambda extends Construct {
  private fn: lambda.Function;
  private rule: events.Rule;

  /**
   * @summary Constructs a new instance of the EventsRuleToLambda class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {EventsRuleToLambdaProps} props - user provided props for the construct
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: EventsRuleToLambdaProps) {
    super(scope, id);

    this.fn = defaults.buildLambdaFunction(scope, {
      deployLambda: props.deployLambda,
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps
    });

    const lambdaFunc: events.IRuleTarget = {
      bind: () => ({
        id: '',
        arn: this.fn.functionArn
      })
    };

    const defaultEventsRuleProps = defaults.DefaultEventsRuleProps([lambdaFunc]);
    const eventsRuleProps = overrideProps(defaultEventsRuleProps, props.eventRuleProps, true);

    this.rule = new events.Rule(this, 'EventsRule', eventsRuleProps);

    this.fn.addPermission("LambdaInvokePermission", {
      principal: new iam.ServicePrincipal('events.amazonaws.com'),
      sourceArn: this.rule.ruleArn
    });
  }

  /**
   * @summary Retruns an instance of events.Rule created by the construct.
   * @returns {events.Rule} Instance of events.Rule created by the construct
   * @since 0.8.0
   * @access public
   */
  public eventsRule(): events.Rule {
    return this.rule;
  }

  /**
   * @summary Retruns an instance of lambda.Function created by the construct.
   * @returns {lambda.Function} Instance of lambda.Function created by the construct
   * @since 0.8.0
   * @access public
   */
  public lambdaFunction(): lambda.Function {
    return this.fn;
  }
}