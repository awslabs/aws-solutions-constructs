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

import * as elb from "@aws-cdk/aws-elasticloadbalancingv2";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as s3 from "@aws-cdk/aws-s3";
import { Construct } from "@aws-cdk/core";
import * as defaults from "@aws-solutions-constructs/core";
import * as ecs from "@aws-cdk/aws-ecs";
import { GetActiveListener } from "@aws-solutions-constructs/core";
import { CfnListener, CfnTargetGroup } from "@aws-cdk/aws-elasticloadbalancingv2";

export interface AlbToFargateProps {
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
  readonly targetGroupProps?: elb.ApplicationTargetGroupProps;
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
  readonly logAlbAccessLogs?: boolean;
  /**
   * Optional properties to customize the bucket used to store the ALB Access
   * Logs. Supplying this and setting logAccessLogs to false is an error.
   *
   * @default - none
   */
  readonly albLoggingBucketProps?: s3.BucketProps;
  /**
   * Whether the construct is deploying a private or public API. This has implications for the VPC and ALB.
   *
   * @default - none
   */
  readonly publicApi: boolean;
  /**
   * Optional properties to create a new ECS cluster
   */
  readonly clusterProps?: ecs.ClusterProps;
  /**
   * The arn of an ECR Repository containing the image to use
   * to generate the containers
   *
   * format:
   *   arn:aws:ecr:[region]:[account number]:repository/[Repository Name]
   */
  readonly ecrRepositoryArn?: string;
  /**
   * The version of the image to use from the repository
   *
   * @default - none
   */
  readonly ecrImageVersion?: string;
  /**
   * Optional props to define the container created for the Fargate Service
   *
   * @default - see fargate-defaults.t
   */
  readonly containerDefinitionProps?: ecs.ContainerDefinitionProps | any;
  /**
   * Optional props to define the Fargate Task Definition for this construct
   *
   * @default - see fargate-defaults.ts
   */
  readonly fargateTaskDefinitionProps?: ecs.FargateTaskDefinitionProps | any;
  /**
   * Optional properties to override default values for the Fargate service.
   * Service will set up in the Public or Isolated subnets of the VPC by default,
   * override that (e.g. - choose Private subnets) by setting vpcSubnets on this
   * object.
   *
   * @default - see core/lib/fargate-defaults.ts
   */
  readonly fargateServiceProps?: ecs.FargateServiceProps | any;
  /**
   * A Fargate Service already instantiated (probably by another Solutions Construct). If
   * this is specified, then no props defining a new service can be provided, including:
   * ecrImageVersion, containerDefintionProps, fargateTaskDefinitionProps,
   * ecrRepositoryArn, fargateServiceProps, clusterProps, existingClusterInterface
   *
   * @default - none
   */
  readonly existingFargateServiceObject?: ecs.FargateService;
  /**
   * The container associated with the service supplied in existingFargateServiceObject.
   * This and existingFargateServiceObject must either both be provided or neither.
   *
   * @default - none
   */
  readonly existingContainerDefinitionObject?: ecs.ContainerDefinition;
}

export class AlbToFargate extends Construct {
  public readonly loadBalancer: elb.ApplicationLoadBalancer;
  public readonly vpc: ec2.IVpc;
  public readonly listener: elb.ApplicationListener;
  public readonly service: ecs.FargateService;
  public readonly container: ecs.ContainerDefinition;

  constructor(scope: Construct, id: string, props: AlbToFargateProps) {
    super(scope, id);
    defaults.CheckProps(props);
    defaults.CheckAlbProps(props);
    defaults.CheckFargateProps(props);

    // Obtain VPC for construct (existing or created)
    this.vpc = defaults.buildVpc(scope, {
      existingVpc: props.existingVpc,
      defaultVpcProps: props.publicApi ? defaults.DefaultPublicPrivateVpcProps() : defaults.DefaultIsolatedVpcProps(),
      userVpcProps: props.vpcProps,
      constructVpcProps: { enableDnsHostnames: true, enableDnsSupport: true }
    });

    // Set up the ALB
    this.loadBalancer = defaults.ObtainAlb(
      scope,
      `${id}-lb`,
      this.vpc,
      props.publicApi,
      props.existingLoadBalancerObj,
      props.loadBalancerProps,
      props.logAlbAccessLogs,
      props.albLoggingBucketProps
    );

    const newListener: boolean = this.loadBalancer.listeners.length === 0;

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

    if (props.existingFargateServiceObject) {
      this.service = props.existingFargateServiceObject;
      // CheckFargateProps confirms that the container is provided
      this.container = props.existingContainerDefinitionObject!;
    } else {
      [this.service, this.container] = defaults.CreateFargateService(
        scope,
        id,
        this.vpc,
        props.clusterProps,
        props.ecrRepositoryArn,
        props.ecrImageVersion,
        props.fargateTaskDefinitionProps,
        props.containerDefinitionProps,
        props.fargateServiceProps
      );
    }
    // Add the Fargate Service to the
    // to the ALB Listener we set up earlier
    const applicationTargetGroupProps = defaults.consolidateProps(
      defaults.DefaultApplicationTargetGroupProps(this.vpc),
      props.targetGroupProps
    );

    const newTargetGroup = defaults.AddFargateTarget(
      scope,
      `${id}-target`,
      this.listener,
      this.service,
      props.ruleProps,
      applicationTargetGroupProps
    );

    if (newListener && this.listener) {
      const levelOneListener = this.listener.node.defaultChild as CfnListener;
      const cfnTargetGroup = newTargetGroup.node.defaultChild as CfnTargetGroup;
      levelOneListener.addDependsOn(cfnTargetGroup);
    }

  }
}
