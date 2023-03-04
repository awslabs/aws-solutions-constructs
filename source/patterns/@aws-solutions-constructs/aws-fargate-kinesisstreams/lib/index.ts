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

// Imports
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

/**
 * The properties for the FargateToKinesisStreams class.
 */
export interface FargateToKinesisStreamsProps {
  /**
   * True if the VPC provisioned by this construct should contain Public/Private Subnets,
   * otherwise False for the VPC to contain Isolated Subnets only.
   *
   * Note this property is ignored if an existing VPC is specified in the `existingVpc` property.
   */
  readonly publicApi: boolean;
  /**
   * Optional custom properties for a new VPC the construct will create. Providing both this and `existingVpc` is an error.
   *
   * An Amazon Kinesis Streams Interface Endpoint will be added to this VPC.
   *
   * @default - None
   */
  readonly vpcProps?: ec2.VpcProps;
  /**
   * An existing VPC in which to deploy the Fargate Service. Providing both this and `vpcProps` is an error.
   * If the client provides an existing Fargate Service in the `existingFargateServiceObject` property,
   * this value must be the VPC where the service is running.
   *
   * An Amazon Kinesis Streams Interface Endpoint will be added to this VPC.
   *
   * @default - None
   */
  readonly existingVpc?: ec2.IVpc;
  /**
   * Optional properties to create a new ECS cluster. To provide an existing cluster, use the cluster attribute of the `fargateServiceProps` property.
   */
  readonly clusterProps?: ecs.ClusterProps;
  /**
   * The arn of an ECR Repository containing the image to use to generate the containers.
   *
   * Either this or the image property of the `containerDefinitionProps` property must be provided.
   *
   * format:
   *   arn:aws:ecr:[region]:[account number]:repository/[Repository Name]
   */
  readonly ecrRepositoryArn?: string;
  /**
   * The version of the image to use from the repository.
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
   * Optional values to override default Fargate Task definition properties (fargate-defaults.ts).
   * The construct will default to launching the service is the most isolated subnets available (precedence: Isolated, Private and Public).
   * Override those and other defaults here.
   *
   * defaults - fargate-defaults.ts
   */
  readonly fargateServiceProps?: ecs.FargateServiceProps | any;
  /**
   * A Fargate Service already instantiated. If this is specified, then no props defining a new service can be provided, including:
   *  ecrImageVersion, containerDefinitionProps, fargateTaskDefinitionProps, ecrRepositoryArn, fargateServiceProps, clusterProps.
   *
   * Note - If this property is set, then the `existingContainerDefinitionObject` property must be set as well.
   *
   * @default - None
   */
  readonly existingFargateServiceObject?: ecs.FargateService;
  /*
   * A container definition already instantiated as part of a Fargate service.
   * This must be the container used in the `existingFargateServiceObject` property.
   *
   * @default - None
   */
    readonly existingContainerDefinitionObject?: ecs.ContainerDefinition;
  /**
   * Existing instance of Kinesis Stream, providing both this and `kinesisStreamProps` will cause an error.
   *
   * @default - None
   */
  readonly existingStreamObj?: kinesis.Stream;
  /**
   * Optional user-provided props to override the default props for the Kinesis stream.
   *
   * @default - Default props are used.
   */
  readonly kinesisStreamProps?: kinesis.StreamProps;
  /**
   * Whether to create recommended CloudWatch alarms for the Kinesis Stream.
   *
   * @default - Alarms are created
   */
  readonly createCloudWatchAlarms?: boolean;
  /**
   * Optional Name to override the Fargate Service default environment variable name that holds the Kinesis Data Stream name value.
   *
   * @default - KINESIS_DATASTREAM_NAME
   */
  readonly streamEnvironmentVariableName?: string;
}

/**
 * @summary The FargateToKinesisStream class.
 */
export class FargateToKinesisStreams extends Construct {
    public readonly vpc?: ec2.IVpc;
    public readonly service: ecs.FargateService;
    public readonly container: ecs.ContainerDefinition;
    public readonly kinesisStream: kinesis.Stream;
    public readonly cloudwatchAlarms?: cloudwatch.Alarm[];

    /**
     * @summary Constructs a new instance of the KinesisStreamsToFargate class.
     * @param {cdk.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a a scope-unique id.
     * @param {FargateToKinesisStreamsProps} props - user provided props for the construct
     * @since 0.8.0
     * @access public
     */
    constructor(scope: Construct, id: string, props: FargateToKinesisStreamsProps) {
      super(scope, id);
      defaults.CheckProps(props);
      defaults.CheckFargateProps(props);

      // Setup the VPC
      this.vpc = defaults.buildVpc(scope, {
        existingVpc: props.existingVpc,
        defaultVpcProps: props.publicApi ? defaults.DefaultPublicPrivateVpcProps() : defaults.DefaultIsolatedVpcProps(),
        userVpcProps: props.vpcProps,
        constructVpcProps: { enableDnsHostnames: true, enableDnsSupport: true }
      });

      // Add the interface endpoint to the VPC for Kinesis Streams
      defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.KINESIS_STREAMS);

      // Setup the Fargate Service
      if (props.existingFargateServiceObject) {
        this.service = props.existingFargateServiceObject;
        // CheckFargateProps confirms that the container is provided
        this.container = props.existingContainerDefinitionObject!;
      } else {
        const createFargateServiceResponse = defaults.CreateFargateService(
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
        this.service = createFargateServiceResponse.service;
        this.container = createFargateServiceResponse.containerDefinition;
      }

      // Setup the Kinesis Stream
      this.kinesisStream = defaults.buildKinesisStream(this, {
        existingStreamObj: props.existingStreamObj,
        kinesisStreamProps: props.kinesisStreamProps
      });

      // Configure container environment variables
      const streamNameEnvironmentVariableName = props.streamEnvironmentVariableName || 'KINESIS_DATASTREAM_NAME';
      this.container.addEnvironment(streamNameEnvironmentVariableName, this.kinesisStream.streamName);

      // Grant the Fargate Service permission to write to the Kinesis Stream
      this.kinesisStream.grantWrite(this.service.taskDefinition.taskRole);

      // By default, deploy CloudWatch Alarms to monitor the Kinesis Stream
      if (props.createCloudWatchAlarms === undefined || props.createCloudWatchAlarms) {
        this.cloudwatchAlarms = defaults.buildKinesisStreamCWAlarms(this);
      }
    }
}