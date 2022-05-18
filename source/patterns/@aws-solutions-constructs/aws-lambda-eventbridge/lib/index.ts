/**
 *  Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

// Imports
import * as defaults from "@aws-solutions-constructs/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as events from "@aws-cdk/aws-events";
import { Construct } from "@aws-cdk/core";

/**
 * @summary The properties for the LambdaToEventbridge class.
 */
export interface LambdaToEventbridgeProps {
  /**
   * Existing instance of Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function;
  /**
   * User provided props to override the default props for the Lambda function.
   *
   * @default - Default properties are used.
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
   * An existing VPC for the construct to use (construct will NOT create a new VPC in this case)
   */
  readonly existingVpc?: ec2.IVpc;
  /**
   * Properties to override default properties if deployVpc is true
   */
  readonly vpcProps?: ec2.VpcProps;
  /**
   * Whether to deploy a new VPC
   *
   * @default - false
   */
  readonly deployVpc?: boolean;
  /**
   * Optional Name for the Lambda function environment variable set to the name of the Event bus.
   *
   * @default - EVENTBUS_NAME
   */
  readonly eventBusEnvironmentVariableName?: string;
}

/**
 * @summary The LambdaToEventbridge class.
 */
export class LambdaToEventbridge extends Construct {
  public readonly lambdaFunction: lambda.Function;
  public readonly eventBus?: events.IEventBus;
  public readonly vpc?: ec2.IVpc;

  /**
   * @summary Constructs a new instance of the LambdaToEventbridge class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {LambdaToEventbridgeProps} props - user provided props for the construct.
   * @since 1.120.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: LambdaToEventbridgeProps) {
    super(scope, id);
    defaults.CheckProps(props);

    if (props.deployVpc || props.existingVpc) {
      if (props.deployVpc && props.existingVpc) {
        throw new Error("More than 1 VPC specified in the properties");
      }

      this.vpc = defaults.buildVpc(scope, {
        defaultVpcProps: defaults.DefaultIsolatedVpcProps(),
        existingVpc: props.existingVpc,
        userVpcProps: props.vpcProps,
        constructVpcProps: {
          enableDnsHostnames: true,
          enableDnsSupport: true,
        },
      });
      defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.EVENTS);
    }

    // Setup the Lambda function
    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps,
      vpc: this.vpc,
    });

    // Build Event Bus
    this.eventBus = defaults.buildEventBus(this, {
      existingEventBusInterface: props.existingEventBusInterface,
      eventBusProps: props.eventBusProps
    });

    // Configure environment variables
    const eventBusEnvironmentVariableName = props.eventBusEnvironmentVariableName || 'EVENTBUS_NAME';
    const eventBusName = this.eventBus?.eventBusName || 'default';
    this.lambdaFunction.addEnvironment(eventBusEnvironmentVariableName, eventBusName);

    // Enable putevents permissions for the Lambda function by default
    if (this.eventBus) {
      this.eventBus.grantPutEventsTo(this.lambdaFunction);
    } else {
      // Since user didn't specify custom event bus, provide permissions on default event bus
      const defaultEventBus = events.EventBus.fromEventBusName(this, 'default-event-bus', 'default');
      defaultEventBus.grantPutEventsTo(this.lambdaFunction);
    }
  }
}