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
import * as kms from 'aws-cdk-lib/aws-kms';
import * as sqs from "aws-cdk-lib/aws-sqs";
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from "constructs";
import * as defaults from "@aws-solutions-constructs/core";
import * as ecs from "aws-cdk-lib/aws-ecs";

export interface FargateToSqsProps {
  /**
   * Optional custom properties for a VPC the construct will create. This VPC will
   * be used by the new Fargate service the construct creates (that's
   * why targetGroupProps can't include a VPC). Providing
   * both this and existingVpc is an error. An SQS Interface
   * endpoint will be included in this VPC.
   *
   * @default - none
   */
  readonly vpcProps?: ec2.VpcProps;
  /**
   * An existing VPC in which to deploy the construct. Providing both this and
   * vpcProps is an error. If the client provides an existing Fargate service,
   * this value must be the VPC where the service is running. An SQS Interface
   * endpoint will be added to this VPC.
   *
   * @default - none
   */
  readonly existingVpc?: ec2.IVpc;
  /**
   * Whether the construct is deploying a private or public API. This has implications for the VPC deployed
   * by this construct.
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
  /*
   * A container definition already instantiated as part of a Fargate service. This must
   * be the container in the existingFargateServiceObject.
   *
   * @default - None
   */
  readonly existingContainerDefinitionObject?: ecs.ContainerDefinition;
  /**
   * Existing instance of SQS queue object, Providing both this and queueProps will cause an error.
   *
   * @default - Default props are used
   */
  readonly existingQueueObj?: sqs.Queue;
  /**
   * Optional user-provided props to override the default props for the SQS queue.
   *
   * @default - Default props are used
   */
  readonly queueProps?: sqs.QueueProps;
  /**
   * Optional user provided properties for the dead letter queue
   *
   * @default - Default props are used
   */
  readonly deadLetterQueueProps?: sqs.QueueProps;
  /**
   * Whether to deploy a secondary queue to be used as a dead letter queue.
   *
   * @default - true.
   */
  readonly deployDeadLetterQueue?: boolean;
  /**
   * The number of times a message can be unsuccessfully dequeued before being moved to the dead-letter queue.
   *
   * @default - required field if deployDeadLetterQueue=true.
   */
  readonly maxReceiveCount?: number;
  /**
   * Optional Name for the container environment variable set to the arn of the queue.
   *
   * @default - SQS_QUEUE_ARN
   */
  readonly queueArnEnvironmentVariableName?: string;
  /**
   * Optional Name for the container environment variable set to the URL of the queue.
   *
   * @default - SQS_QUEUE_URL
   */
  readonly queueUrlEnvironmentVariableName?: string;
  /**
   * Optional queue permissions to grant to the Fargate service. One or more of the following may be specified: `Read`,`Write`. Default is `Write`
   *
   * @default - Write
   */
  readonly queuePermissions?: string[];
  /**
   * If no key is provided, this flag determines whether the queue is encrypted with a new CMK or an AWS managed key.
   * This flag is ignored if any of the following are defined: queueProps.encryptionMasterKey, encryptionKey or encryptionKeyProps.
   *
   * @default - False if queueProps.encryptionMasterKey, encryptionKey, and encryptionKeyProps are all undefined.
   */
  readonly enableEncryptionWithCustomerManagedKey?: boolean;
  /**
   * An optional, imported encryption key to encrypt the SQS Queue with.
   *
   * @default - None
   */
  readonly encryptionKey?: kms.Key;
  /**
   * Optional user provided properties to override the default properties for the KMS encryption key used to encrypt the SQS Queue with.
   *
   * @default - None
   */
  readonly encryptionKeyProps?: kms.KeyProps;
}

export class FargateToSqs extends Construct {
  public readonly sqsQueue: sqs.Queue;
  public readonly deadLetterQueue?: sqs.DeadLetterQueue;
  public readonly service: ecs.FargateService;
  public readonly vpc: ec2.IVpc;
  public readonly container: ecs.ContainerDefinition;

  constructor(scope: Construct, id: string, props: FargateToSqsProps) {
    super(scope, id);
    defaults.CheckFargateProps(props);
    defaults.CheckSqsProps(props);
    defaults.CheckVpcProps(props);

    if (props.queuePermissions) {
      defaults.CheckListValues(['Read', 'Write'], props.queuePermissions, 'queue permission');
    }

    this.vpc = defaults.buildVpc(scope, {
      existingVpc: props.existingVpc,
      defaultVpcProps: props.publicApi ? defaults.DefaultPublicPrivateVpcProps() : defaults.DefaultIsolatedVpcProps(),
      userVpcProps: props.vpcProps,
      constructVpcProps: { enableDnsHostnames: true, enableDnsSupport: true }
    });

    defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.SQS);

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

    // Setup the SQS Queue
    const buildQueueResponse = defaults.buildQueue(this, `${id}-queue`, {
      queueProps: props.queueProps,
      deployDeadLetterQueue: props.deployDeadLetterQueue,
      deadLetterQueueProps: props.deadLetterQueueProps,
      maxReceiveCount: props.maxReceiveCount,
      existingQueueObj: props.existingQueueObj,
      enableEncryptionWithCustomerManagedKey: props.enableEncryptionWithCustomerManagedKey,
      encryptionKey: props.encryptionKey,
      encryptionKeyProps: props.encryptionKeyProps
    });
    this.sqsQueue = buildQueueResponse.queue;
    this.deadLetterQueue = buildQueueResponse.dlq;

    // Enable message send and receive permissions for Fargate service by default
    if (props.queuePermissions) {
      if (props.queuePermissions.includes('Read')) {
        this.sqsQueue.grantConsumeMessages(this.service.taskDefinition.taskRole);
      }
      if (props.queuePermissions.includes('Write')) {
        this.sqsQueue.grantSendMessages(this.service.taskDefinition.taskRole);
      }
    } else {
      this.sqsQueue.grantSendMessages(this.service.taskDefinition.taskRole);
    }

    // Setting environment variables
    const queueArnEnvironmentVariableName = props.queueArnEnvironmentVariableName || 'SQS_QUEUE_ARN';
    this.container.addEnvironment(queueArnEnvironmentVariableName, this.sqsQueue.queueArn);
    const queueUrlEnvironmentVariableName = props.queueUrlEnvironmentVariableName || 'SQS_QUEUE_URL';
    this.container.addEnvironment(queueUrlEnvironmentVariableName, this.sqsQueue.queueUrl);
  }
}
