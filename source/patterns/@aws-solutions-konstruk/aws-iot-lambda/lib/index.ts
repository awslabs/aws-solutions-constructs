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
import * as iot from '@aws-cdk/aws-iot';
import * as iam from '@aws-cdk/aws-iam';
import { Construct } from '@aws-cdk/core';
import * as defaults from '@aws-solutions-konstruk/core';
import { overrideProps } from '@aws-solutions-konstruk/core';

/**
 * @summary The properties for the IotToLambda class.
 */
export interface IotToLambdaProps {
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
   * User provided CfnTopicRuleProps to override the defaults
   *
   * @default - None
   */
  readonly iotTopicRuleProps: iot.CfnTopicRuleProps
}

export class IotToLambda extends Construct {
  private fn: lambda.Function;
  private topic: iot.CfnTopicRule;

  /**
   * @summary Constructs a new instance of the IotToLambda class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {IotToLambdaProps} props - user provided props for the construct
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: IotToLambdaProps) {
    super(scope, id);

    this.fn = defaults.buildLambdaFunction(this, {
      deployLambda: props.deployLambda,
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps
    });

    const defaultIotTopicProps = defaults.DefaultCfnTopicRuleProps([{
      lambda: {
        functionArn: this.fn.functionArn
      }
    }]);
    const iotTopicProps = overrideProps(defaultIotTopicProps, props.iotTopicRuleProps, true);

    // Create the IoT topic rule
    this.topic = new iot.CfnTopicRule(this, 'IotTopic', iotTopicProps);

    this.fn.addPermission("LambdaInvokePermission", {
      principal: new iam.ServicePrincipal('iot.amazonaws.com'),
      sourceArn: this.topic.attrArn
    });
  }

  /**
   * @summary Returns an instance of iot.CfnTopicRule created by the construct.
   * @returns {iot.CfnTopicRule} Instance of CfnTopicRule created by the construct
   * @since 0.8.0
   * @access public
   */
  public iotTopicRule(): iot.CfnTopicRule {
    return this.topic;
  }

  /**
   * @summary Returns an instance of lambda.Function created by the construct.
   * @returns {lambda.Function} Instance of lambda.Function created by the construct
   * @since 0.8.0
   * @access public
   */
  public lambdaFunction(): lambda.Function {
    return this.fn;
  }

}
