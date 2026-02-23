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
import * as kinesisfirehose from "aws-cdk-lib/aws-kinesisfirehose";
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from "constructs";
import * as defaults from "@aws-solutions-constructs/core";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as iam from "aws-cdk-lib/aws-iam";

export interface FargateToKinesisFirehoseProps {
  /**
   * Optional custom properties for a VPC the construct will create. This VPC will
   * be used by the new Fargate service the construct creates (that's
   * why targetGroupProps can't include a VPC). Providing
   * both this and existingVpc causes an error. A Kinesis Firehose Interface
   * endpoint will be included in this VPC.
   *
   * @default - none
   */
  readonly vpcProps?: ec2.VpcProps;
  /**
   * An existing VPC in which to deploy the construct. Providing both this and
   * vpcProps causes an error. If the client provides an existing Fargate service,
   * this value must be the VPC where the service is running. A Kinesis Interface
   * endpoint will be added to this VPC.
   *
   * @default - none
   */
  readonly existingVpc?: ec2.IVpc;
  /**
   * True if the VPC provisioned by this construct should contain Public/Private Subnets,
   * otherwise False for the VPC to contain Isolated Subnets only. Note this property is
   * ignored if an existing VPC is specified in the existingVpc property. If you are getting
   * a container from a public repo, this must be true so the repo can be accessed from the
   * network.
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
  /**
   * An existing Kinesis Firehose Delivery Stream to which the Fargate container can put data. Note - the delivery stream
   * construct must have already been created and have the deliveryStreamName set. This construct will *not* create a
   * new Delivery Stream.
   */
  readonly existingKinesisFirehose: kinesisfirehose.CfnDeliveryStream;
  /**
   * Optional Name for the container environment variable set to the bucket ARN.
   *
   * @default - FIREHOSE_DELIVERYSTREAM_NAME
   */
  readonly firehoseEnvironmentVariableName?: string;
  /*
   * A container definition already instantiated as part of a Fargate service. This must
   * be the container in the existingFargateServiceObject.
   *
   * @default - None
   */
  readonly existingContainerDefinitionObject?: ecs.ContainerDefinition;
}

export class FargateToKinesisFirehose extends Construct {
  public readonly vpc: ec2.IVpc;
  public readonly service: ecs.FargateService;
  public readonly container: ecs.ContainerDefinition;
  public readonly kinesisFirehose: kinesisfirehose.CfnDeliveryStream;

  constructor(scope: Construct, id: string, props: FargateToKinesisFirehoseProps) {
    super(scope, id);
    defaults.CheckFargateProps(props);
    defaults.CheckVpcProps(props);
    defaults.ValidateContainerDefinitionProps(this, props.containerDefinitionProps);
    defaults.ValidateFargateTaskDefinitionProps(this, props.fargateTaskDefinitionProps);
    defaults.ValidateFargateServiceProps(this, props.fargateServiceProps);

    if (!props.existingKinesisFirehose.deliveryStreamName) {
      throw new Error('existingKinesisFirehose must have a defined deliveryStreamName');
    }

    this.vpc = defaults.buildVpc(scope, {
      existingVpc: props.existingVpc,
      defaultVpcProps: props.publicApi ? defaults.DefaultPublicPrivateVpcProps() : defaults.DefaultIsolatedVpcProps(),
      userVpcProps: props.vpcProps,
      constructVpcProps: { enableDnsHostnames: true, enableDnsSupport: true }
    });

    defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.KINESIS_FIREHOSE);

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

    this.kinesisFirehose = props.existingKinesisFirehose;

    const taskPolicyStatement = new iam.PolicyStatement({
      actions: [
        "firehose:DeleteDeliveryStream",
        "firehose:PutRecord",
        "firehose:PutRecordBatch",
        "firehose:UpdateDestination"
      ],
      resources: [this.kinesisFirehose.attrArn],
    });
    this.service.taskDefinition.taskRole.addToPrincipalPolicy(taskPolicyStatement);

    // Configure environment variables
    const deliveryStreamEnvironmentVariableName = props.firehoseEnvironmentVariableName || 'FIREHOSE_DELIVERYSTREAM_NAME';
    // We can use ! because we checked for a stream name on props.existingKinesisFirehose at the top of this function
    this.container.addEnvironment(deliveryStreamEnvironmentVariableName, this.kinesisFirehose.deliveryStreamName!);

  }
}
