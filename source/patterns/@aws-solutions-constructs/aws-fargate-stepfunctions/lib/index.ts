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

// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from "constructs";
import * as defaults from "@aws-solutions-constructs/core";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

export interface FargateToStepfunctionsProps {
  /**
   * Whether the construct is deploying a private or public API. This has implications for the VPC deployed
   * by this construct.
   */
  readonly publicApi: boolean;
  /**
   * Optional custom properties for a VPC the construct will create. This VPC will
   * be used by the new Fargate service the construct creates (that's
   * why targetGroupProps can't include a VPC). Providing
   * both this and existingVpc is an error. A Step Functions Interface
   * endpoint will be included in this VPC.
   *
   * @default - A set of defaults from vpc-defaults.ts: DefaultPublicPrivateVpcProps() for public APIs
   * and DefaultIsolatedVpcProps() for private APIs.
   */
  readonly vpcProps?: ec2.VpcProps;
  /**
   * An existing VPC in which to deploy the construct. Providing both this and
   * vpcProps is an error. If the client provides an existing Fargate service,
   * this value must be the VPC where the service is running. A Step Functions Interface
   * endpoint will be added to this VPC.
   *
   * @default - none
   */
  readonly existingVpc?: ec2.IVpc;
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
   * @default - 'latest'
   */
  readonly ecrImageVersion?: string;
  /*
   * Optional props to define the container created for the Fargate Service
   *
   * defaults - fargate-defaults.ts
   */
  readonly containerDefinitionProps?: ecs.ContainerDefinitionProps | any;
  /*
   * Optional props to define the Fargate Task Definition for this construct
   *
   * defaults - fargate-defaults.ts
   */
  readonly fargateTaskDefinitionProps?: ecs.FargateTaskDefinitionProps | any;
  /**
   * Optional values to override default Fargate Task definition properties
   * (fargate-defaults.ts). The construct will default to launching the service
   * is the most isolated subnets available (precedence: Isolated, Private and
   * Public). Override those and other defaults here.
   *
   * defaults - fargate-defaults.ts
   */
  readonly fargateServiceProps?: ecs.FargateServiceProps | any;
  /**
   * A Fargate Service already instantiated (probably by another Solutions Construct). If
   * this is specified, then no props defining a new service can be provided, including:
   * existingImageObject, ecrImageVersion, containerDefinitionProps, fargateTaskDefinitionProps,
   * ecrRepositoryArn, fargateServiceProps, clusterProps, existingClusterInterface. If this value
   * is provided, then existingContainerDefinitionObject must be provided as well.
   *
   * @default - none
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
   * User provided StateMachineProps to override the defaults
   *
   * @default - None
   */
  readonly stateMachineProps: sfn.StateMachineProps;
  /**
   * Whether to create recommended CloudWatch alarms
   *
   * @default - true
   */
  readonly createCloudWatchAlarms?: boolean;
  /**
   * User provided props to override the default props for the CloudWatchLogs LogGroup.
   *
   * @default - Default props are used
   */
  readonly logGroupProps?: logs.LogGroupProps;
  /**
   * Optional Name for the container environment variable set to the ARN of the state machine.
   *
   * @default - STATE_MACHINE_ARN
   */
  readonly stateMachineEnvironmentVariableName?: string;
}

export class FargateToStepfunctions extends Construct {
  public readonly vpc: ec2.IVpc;
  public readonly service: ecs.FargateService;
  public readonly container: ecs.ContainerDefinition;
  public readonly stateMachine: sfn.StateMachine;
  public readonly stateMachineLogGroup: logs.ILogGroup;
  public readonly cloudwatchAlarms?: cloudwatch.Alarm[];

  constructor(scope: Construct, id: string, props: FargateToStepfunctionsProps) {
    super(scope, id);
    defaults.CheckFargateProps(props);
    defaults.CheckVpcProps(props);

    this.vpc = defaults.buildVpc(scope, {
      existingVpc: props.existingVpc,
      defaultVpcProps: props.publicApi ? defaults.DefaultPublicPrivateVpcProps() : defaults.DefaultIsolatedVpcProps(),
      userVpcProps: props.vpcProps,
      constructVpcProps: { enableDnsHostnames: true, enableDnsSupport: true }
    });

    defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.STEP_FUNCTIONS);

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

    const buildStateMachineResponse = defaults.buildStateMachine(this, defaults.idPlaceholder, props.stateMachineProps,
      props.logGroupProps);
    this.stateMachine = buildStateMachineResponse.stateMachine;
    this.stateMachineLogGroup = buildStateMachineResponse.logGroup;

    this.stateMachine.grantStartExecution(this.service.taskDefinition.taskRole);

    if (props.createCloudWatchAlarms === undefined || props.createCloudWatchAlarms) {
      // Deploy best-practice CloudWatch Alarm for state machine
      this.cloudwatchAlarms = defaults.buildStepFunctionCWAlarms(this, this.stateMachine);
    }

    // Add environment variable
    const stateMachineEnvironmentVariableName = props.stateMachineEnvironmentVariableName || 'STATE_MACHINE_ARN';
    this.container.addEnvironment(stateMachineEnvironmentVariableName, this.stateMachine.stateMachineArn);
  }
}
