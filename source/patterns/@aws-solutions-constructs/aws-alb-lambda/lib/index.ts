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

import * as elb from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import * as defaults from "@aws-solutions-constructs/core";
import { CfnListener, CfnTargetGroup } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { GetActiveListener } from "@aws-solutions-constructs/core";

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
    defaults.CheckAlbProps(props);
    defaults.CheckVpcProps(props);

    // Obtain VPC for construct (existing or created)
    this.vpc = defaults.buildVpc(scope, {
      existingVpc: props.existingVpc,
      defaultVpcProps: props.publicApi ? defaults.DefaultPublicPrivateVpcProps() : defaults.DefaultIsolatedVpcProps(),
      userVpcProps: props.vpcProps,
      constructVpcProps: props.publicApi ? {} : { enableDnsHostnames: true, enableDnsSupport: true }
    });

    this.loadBalancer = defaults.ObtainAlb(this, id, {
      vpc: this.vpc,
      publicApi: props.publicApi,
      existingLoadBalancerObj: props.existingLoadBalancerObj,
      loadBalancerProps: props.loadBalancerProps,
      logAccessLogs: props.logAlbAccessLogs,
      loggingBucketProps: props.albLoggingBucketProps
    });

    // Obtain Lambda function for construct (existing or created)
    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps,
      vpc: this.vpc,
    });

    let newListener: boolean;
    if (this.loadBalancer.listeners.length === 0) {
      newListener = true;
    } else {
      newListener = false;
    }

    // If there's no listener, then we add one here
    if (newListener) {
      this.listener = defaults.AddListener(
        this,
        id,
        this.loadBalancer,
        props.listenerProps
      );
    } else {
      this.listener = GetActiveListener(this.loadBalancer.listeners);
    }

    const newTargetGroup = defaults.AddLambdaTarget(
      this,
      `tg${this.loadBalancer.listeners.length + 1}`,
      this.listener,
      this.lambdaFunction,
      props.ruleProps,
      props.targetProps);

    // this.listener needs to be set on the construct.
    // could be above: else { defaults.GetActiveListener }
    // do we then move that funcionality back into the construct (not the function). If so do
    // we leave it in AddNewTarget or just do it here and pass the listener?
    if (newListener && this.listener) {
      const levelOneListener = this.listener.node.defaultChild as CfnListener;
      const cfnTargetGroup = newTargetGroup.node.defaultChild as CfnTargetGroup;
      levelOneListener.addDependency(cfnTargetGroup);
    }

  }
}
