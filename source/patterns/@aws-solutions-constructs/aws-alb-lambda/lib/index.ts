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

import * as elb from "@aws-cdk/aws-elasticloadbalancingv2";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as s3 from "@aws-cdk/aws-s3";
import * as lambda from "@aws-cdk/aws-lambda";
import { Construct } from "@aws-cdk/core";
import * as defaults from "@aws-solutions-constructs/core";
import { CfnListener, CfnTargetGroup } from "@aws-cdk/aws-elasticloadbalancingv2";

export interface AlbToLambdaProps {
  /**
   * Optional custom properties for a new loadBalancer. Providing both this and
   * existingLoadBalancer is an error. This cannot specify a VPC, it will use the VPC
   * in existingVpc or the VPC created by the construct.
   *
   * @default - none
   */
  readonly loadBalancerProps?: elb.ApplicationLoadBalancerProps | any;
  /**
   * Existing Application Load Balancer to incorporate into the
   * construct architecture. Providing both this and loadBalancerProps is an
   * error. The VPC containing this loadBalancer must match the VPC provided in existingVpc.
   *
   * @default - none
   */
  readonly existingLoadBalancerObj?: elb.ApplicationLoadBalancer;
  /**
   * Existing instance of Lambda Function object, providing both this and
   * `lambdaFunctionProps` will cause an error.
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
   * Props to define the listener. Must be provided when adding the listener
   * to an ALB (eg - when creating the alb), may not be provided when adding
   * a second target to an already established listener. When provided, must include
   * either a certificate or protocol: HTTP
   *
   * @default - none
   */
  readonly listenerProps?: elb.ApplicationListenerProps | any;
  /**
   * Optional custom properties for a new target group. While this is a standard
   * attribute of props for ALB constructs, there are few pertinent properties for a Lambda target.
   *
   * @default - none
   *
   */
  readonly targetProps?: elb.ApplicationTargetGroupProps;
  /**
   * Rules for directing traffic to the target being created. May not be specified
   * for the first listener added to an ALB, and must be specified for the second
   * target added to a listener. Add a second target by instantiating this construct a
   * second time and providing the existingAlb from the first instantiation.
   *
   * @default - none
   */
  readonly ruleProps?: elb.AddRuleProps;
  /**
   * Optional custom properties for a VPC the construct will create. This VPC will
   * be used by the new ALB and any Private Hosted Zone the construct creates (that's
   * why loadBalancerProps and privateHostedZoneProps can't include a VPC). Providing
   * both this and existingVpc is an error.
   *
   * @default - none
   */
  readonly vpcProps?: ec2.VpcProps;
  /**
   * An existing VPC in which to deploy the construct. Providing both this and
   * vpcProps is an error. If the client provides an existing load balancer and/or
   * existing Private Hosted Zone, those constructs must exist in this VPC.
   *
   * @default - none
   */
  readonly existingVpc?: ec2.IVpc;
  /**
   * Whether to turn on Access Logs for the Application Load Balancer. Uses an S3 bucket
   * with associated storage costs. Enabling Access Logging is a best practice.
   *
   * @default - true
   */
  readonly logAlbAccessLogs?: boolean,
  /**
   * Optional properties to customize the bucket used to store the ALB Access
   * Logs. Supplying this and setting logAccessLogs to false is an error.
   *
   * @default - none
   */
  readonly albLoggingBucketProps?: s3.BucketProps,
  /**
   * Whether the construct is deploying a private or public API. This has implications for the VPC and ALB.
   *
   * @default - none
   */
  readonly publicApi: boolean;
}

export class AlbToLambda extends Construct {
  public readonly loadBalancer: elb.ApplicationLoadBalancer;
  public readonly vpc: ec2.IVpc;
  public readonly lambdaFunction: lambda.Function;
  public readonly listener: elb.ApplicationListener;

  constructor(scope: Construct, id: string, props: AlbToLambdaProps) {
    super(scope, id);
    defaults.CheckProps(props);

    if (props.listenerProps?.certificateArns) {
      throw new Error('certificateArns is deprecated. Please supply certificates using props.listenerProps.certificates');
    }

    if (
      (props.existingLoadBalancerObj && (props.existingLoadBalancerObj.listeners.length === 0) || !props.existingLoadBalancerObj)
      && !props.listenerProps
    ) {
      throw new Error(
        "When adding the first listener and target to a load balancer, listenerProps must be specified and include at least a certificate or protocol: HTTP"
      );
    }

    if (
      ((props.existingLoadBalancerObj) && (props.existingLoadBalancerObj.listeners.length > 0)) &&
      props.listenerProps
    ) {
      throw new Error(
        "This load balancer already has a listener, listenerProps may not be specified"
      );
    }

    if (((props.existingLoadBalancerObj) && (props.existingLoadBalancerObj.listeners.length > 0)) && !props.ruleProps) {
      throw new Error(
        "When adding a second target to an existing listener, there must be rules provided"
      );
    }

    // Check construct specific invalid inputs
    if (props.existingLoadBalancerObj && !props.existingVpc) {
      throw new Error(
        "An existing ALB already exists in a VPC, that VPC must be provided in props.existingVpc for the rest of the construct to use."
      );
    }

    if ( props.existingLoadBalancerObj ) {
      defaults.printWarning(
        "The public/private property of an exisng ALB must match the props.publicApi setting provided."
      );
    }

    // Obtain VPC for construct (existing or created)
    // Determine all the resources to use (existing or launch new)
    if (props.existingVpc) {
      this.vpc = props.existingVpc;
    } else {
      this.vpc = defaults.buildVpc(scope, {
        defaultVpcProps: props.publicApi
          ? defaults.DefaultPublicPrivateVpcProps()
          : defaults.DefaultIsolatedVpcProps(),
        userVpcProps: props.vpcProps,
        constructVpcProps: props.publicApi
          ? undefined
          : { enableDnsHostnames: true, enableDnsSupport: true, },
      });
    }

    this.loadBalancer = defaults.ObtainAlb(
      this,
      id,
      this.vpc,
      props.publicApi,
      props.existingLoadBalancerObj,
      props.loadBalancerProps,
      props.logAlbAccessLogs,
      props.albLoggingBucketProps
    );

    // Obtain Lambda function for construct (existing or created)
    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps,
      vpc: this.vpc,
    });

    if (this.loadBalancer.listeners.length === 0) {
      // This is a new listener, we need to create it along with the default target
      const newTargetGroup = defaults.CreateLambdaTargetGroup(this,
        `tg${this.loadBalancer.listeners.length + 1}`,
        this.lambdaFunction,
        props.targetProps);
      this.listener = defaults.AddListener(
        this,
        this.loadBalancer,
        newTargetGroup,
        props.listenerProps
      );
      // Testing occasionally caused a TargetGroup not found error, this
      // code ensures the Group will be complete before the Listener tries
      // to access it.
      const newListener = this.listener.node.defaultChild as CfnListener;
      const cfnTargetGroup = newTargetGroup.node.defaultChild as CfnTargetGroup;
      newListener.addDependsOn(cfnTargetGroup);
    } else {
      // We're adding a target to an existing listener. If this.loadBalancer.listeners.length
      // is >0, then this.loadBalancer was set from existingLoadBalancer
      this.listener = GetActiveListener(this.loadBalancer.listeners);
      defaults.AddTarget(
        this,
        defaults.CreateLambdaTargetGroup(
          this,
          `tg${this.loadBalancer.listeners.length + 1}`,
          this.lambdaFunction,
          props.targetProps
        ),
        this.listener,
        props.ruleProps
      );
    }
  }
}

function GetActiveListener(listeners: elb.ApplicationListener[]): elb.ApplicationListener {
  let listener: elb.ApplicationListener;

  if (listeners.length === 1 ) {
    listener = listeners[0];
  } else {
    const correctListener = listeners.find(i => (i.node.children[0] as elb.CfnListener).protocol === "HTTPS");
    if (correctListener) {
      listener = correctListener;
    } else {
      // This line should be unreachable
      throw new Error(`Two listeners in the ALB, but neither are HTTPS`);
    }
  }
  return listener;
}
