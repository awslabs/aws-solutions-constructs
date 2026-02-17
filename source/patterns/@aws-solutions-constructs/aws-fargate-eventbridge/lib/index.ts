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

import * as ec2 from "aws-cdk-lib/aws-ec2";
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from "constructs";
import * as defaults from "@aws-solutions-constructs/core";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as events from "aws-cdk-lib/aws-events";

export interface FargateToEventbridgeProps {
  /**
   * Whether the construct is deploying a private or public API. This has implications for the VPC deployed
   * by this construct.
   */
  readonly publicApi: boolean;
  /**
   * Optional custom properties for a VPC the construct will create. This VPC will
   * be used by the new Fargate service the construct creates (that's
   * why targetGroupProps can't include a VPC). Providing
   * both this and existingVpc causes an error. A Step Functions Interface
   * endpoint will be included in this VPC.
   *
   * @default - A set of defaults from vpc-defaults.ts: DefaultPublicPrivateVpcProps() for public APIs
   * and DefaultIsolatedVpcProps() for private APIs.
   */
  readonly vpcProps?: ec2.VpcProps;
  /**
   * An existing VPC in which to deploy the construct. Providing both this and
   * vpcProps causes an error. If the client provides an existing Fargate service,
   * this value must be the VPC where the service is running. A Step Functions Interface
   * endpoint will be added to this VPC.
   *
   * @default - None
   */
  readonly existingVpc?: ec2.IVpc;
  /**
   * Optional properties to create a new ECS cluster
   *
   * @default - None
   */
  readonly clusterProps?: ecs.ClusterProps;
  /**
   * The arn of an ECR Repository containing the image to use
   * to generate the containers
   *
   * format:
   *   arn:aws:ecr:[region]:[account number]:repository/[Repository Name]
   *
   * @default - None
   */
  readonly ecrRepositoryArn?: string;
  /**
   * The version of the image to use from the repository
   *
   * @default - 'latest'
   */
  readonly ecrImageVersion?: string;
  /*
   * Optional props to define the container created for the Fargate Service
   *
   * @default - fargate-defaults.ts
   */
  readonly containerDefinitionProps?: ecs.ContainerDefinitionProps | any;
  /*
   * Optional props to define the Fargate Task Definition for this construct
   *
   * @default - fargate-defaults.ts
   */
  readonly fargateTaskDefinitionProps?: ecs.FargateTaskDefinitionProps | any;
  /**
   * Optional values to override default Fargate Task definition properties
   * (fargate-defaults.ts). The construct will default to launching the service
   * is the most isolated subnets available (precedence: Isolated, Private and
   * Public). Override those and other defaults here.
   *
   * @default - fargate-defaults.ts
   */
  readonly fargateServiceProps?: ecs.FargateServiceProps | any;
  /**
   * A Fargate Service already instantiated (probably by another Solutions Construct). If
   * this is specified, then no props defining a new service can be provided, including:
   * existingImageObject, ecrImageVersion, containerDefinitionProps, fargateTaskDefinitionProps,
   * ecrRepositoryArn, fargateServiceProps, clusterProps, existingClusterInterface. If this value
   * is provided, then existingContainerDefinitionObject must be provided as well.
   *
   * @default - None
   */
  readonly existingFargateServiceObject?: ecs.FargateService;
  /*
   * A container definition already instantiated as part of a Fargate service. This must
   * be the container in the existingFargateServiceObject.
   *
   * @default - None
   */
  readonly existingContainerDefinitionObject?: ecs.ContainerDefinition;
  /**
   * Optional - user provided custom EventBus for this construct to use. Providing both this and `eventBusProps`
   * causes an error.
   *
   * @default - None
   */
  readonly existingEventBusInterface?: events.IEventBus;
  /**
   * Optional - user provided properties to override the default properties when creating a custom EventBus. Setting
   * this value to `{}` will create a custom EventBus using all default properties. If neither this nor
   * `existingEventBusInterface` is provided the construct will use the default EventBus. Providing both this and
   * `existingEventBusInterface` causes an error.
   *
   * @default - None
   */
  readonly eventBusProps?: events.EventBusProps;
  /**
   * Optional Name for the container environment variable set to the DynamoDB table name.
   *
   * @default - EVENTBUS_NAME
   */
  readonly eventBusEnvironmentVariableName?: string;
}

export class FargateToEventbridge extends Construct {
  public readonly vpc: ec2.IVpc;
  public readonly service: ecs.FargateService;
  public readonly container: ecs.ContainerDefinition;
  public readonly eventBus?: events.IEventBus;

  constructor(scope: Construct, id: string, props: FargateToEventbridgeProps) {
    super(scope, id);
    defaults.CheckFargateProps(props);
    defaults.CheckVpcProps(props);
    defaults.CheckEventBridgeProps(props);
    defaults.ValidateContainerDefinitionProps(props.containerDefinitionProps);
    defaults.ValidateFargateTaskDefinitionProps(props.fargateTaskDefinitionProps);
    defaults.ValidateFargateServiceProps(props.fargateServiceProps);

    this.vpc = defaults.buildVpc(scope, {
      existingVpc: props.existingVpc,
      defaultVpcProps: props.publicApi ? defaults.DefaultPublicPrivateVpcProps() : defaults.DefaultIsolatedVpcProps(),
      userVpcProps: props.vpcProps,
      constructVpcProps: { enableDnsHostnames: true, enableDnsSupport: true }
    });

    defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.EVENTS);

    if (props.existingFargateServiceObject) {
      this.service = props.existingFargateServiceObject;
      // CheckFargateProps confirms that the container is provided
      this.container = props.existingContainerDefinitionObject!;
    } else {
      const createFargateServiceResponse = defaults.CreateFargateService(scope, id, {
        constructVpc: this.vpc,
        clientClusterProps: props.clusterProps,
        ecrRepositoryArn: props.ecrRepositoryArn,
        ecrImageVersion: props.ecrImageVersion,
        clientFargateTaskDefinitionProps: props.fargateTaskDefinitionProps,
        clientContainerDefinitionProps: props.containerDefinitionProps,
        clientFargateServiceProps: props.fargateServiceProps
      });
      this.service = createFargateServiceResponse.service;
      this.container = createFargateServiceResponse.containerDefinition;
    }

    this.eventBus = defaults.buildEventBus(this, {
      existingEventBusInterface: props.existingEventBusInterface,
      eventBusProps: props.eventBusProps
    });

    if (this.eventBus) {
      this.eventBus.grantPutEventsTo(this.service.taskDefinition.taskRole);
    } else {
      // Since user didn't specify custom event bus, provide permissions on default event bus
      const defaultEventBus = events.EventBus.fromEventBusName(this, 'default-event-bus', 'default');
      defaultEventBus.grantPutEventsTo(this.service.taskDefinition.taskRole);
    }

    // Add environment variables
    const eventBusEnvironmentVariableName = props.eventBusEnvironmentVariableName || 'EVENTBUS_NAME';
    const eventBusName = this.eventBus?.eventBusName || 'default';
    this.container.addEnvironment(eventBusEnvironmentVariableName, eventBusName);
  }
}
