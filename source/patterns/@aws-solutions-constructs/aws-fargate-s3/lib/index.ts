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
import * as s3 from "aws-cdk-lib/aws-s3";
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from "constructs";
import * as defaults from "@aws-solutions-constructs/core";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as iam from "aws-cdk-lib/aws-iam";

export interface FargateToS3Props {
  /**
   * Optional custom properties for a VPC the construct will create. This VPC will
   * be used by the new Fargate service the construct creates (that's
   * why targetGroupProps can't include a VPC). Providing
   * both this and existingVpc is an error. An S3 Interface
   * endpoint will be included in this VPC.
   *
   * @default - none
   */
  readonly vpcProps?: ec2.VpcProps;
  /**
   * An existing VPC in which to deploy the construct. Providing both this and
   * vpcProps is an error. If the client provides an existing Fargate service,
   * this value must be the VPC where the service is running. An S3 Interface
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
  /**
   * Existing instance of S3 Bucket object, providing both this and `bucketProps` will cause an error.
   *
   * @default - None
   */
  readonly existingBucketObj?: s3.IBucket;
  /**
   * Optional user provided props to override the default props for the S3 Bucket.
   *
   * @default - Default props are used
   */
  readonly bucketProps?: s3.BucketProps;
  /**
   * Optional user provided props to override the default props for the S3 Logging Bucket.
   *
   * @default - Default props are used
   */
  readonly loggingBucketProps?: s3.BucketProps
  /**
   * Whether to turn on Access Logs for the S3 bucket with the associated storage costs.
   * Enabling Access Logging is a best practice.
   *
   * @default - true
   */
  readonly logS3AccessLogs?: boolean;
  /**
   * Optional bucket permissions to grant to the Fargate service.
   * One or more of the following may be specified: "Delete", "Read", "Write".
   *
   * @default - [ "Read", "Write" ]
   */
  readonly bucketPermissions?: string[];
  /**
   * Optional Name for the container environment variable set to the bucket ARN.
   *
   * @default - S3_BUCKET_ARN
   */
  readonly bucketArnEnvironmentVariableName?: string;
  /**
   * Optional Name for the container environment variable set to the bucket name.
   *
   * @default - S3_BUCKET_NAME
   */
  readonly bucketEnvironmentVariableName?: string;
  /*
   * A container definition already instantiated as part of a Fargate service. This must
   * be the container in the existingFargateServiceObject.
   *
   * @default - None
   */
  readonly existingContainerDefinitionObject?: ecs.ContainerDefinition;
}

export class FargateToS3 extends Construct {
  public readonly vpc: ec2.IVpc;
  public readonly service: ecs.FargateService;
  public readonly container: ecs.ContainerDefinition;
  public readonly s3BucketInterface: s3.IBucket;
  public readonly s3Bucket?: s3.Bucket;
  public readonly s3LoggingBucket?: s3.Bucket;

  constructor(scope: Construct, id: string, props: FargateToS3Props) {
    super(scope, id);

    // All our tests are based upon this behavior being on, so we're setting
    // context here rather than assuming the client will set it
    this.node.setContext("@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy", true);

    defaults.CheckFargateProps(props);
    defaults.CheckS3Props(props);
    defaults.CheckVpcProps(props);

    if (props.bucketPermissions) {
      defaults.CheckListValues(['Delete', 'Read', 'Write'], props.bucketPermissions, 'bucket permission');
    }

    this.vpc = defaults.buildVpc(scope, {
      existingVpc: props.existingVpc,
      defaultVpcProps: props.publicApi ? defaults.DefaultPublicPrivateVpcProps() : defaults.DefaultIsolatedVpcProps(),
      userVpcProps: props.vpcProps,
      constructVpcProps: { enableDnsHostnames: true, enableDnsSupport: true }
    });

    defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.S3);

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

    // Setup the S3 Bucket
    let bucket: s3.IBucket;

    if (!props.existingBucketObj) {
      const buildS3BucketResponse = defaults.buildS3Bucket(this, {
        bucketProps: props.bucketProps,
        loggingBucketProps: props.loggingBucketProps,
        logS3AccessLogs: props.logS3AccessLogs
      });
      this.s3Bucket = buildS3BucketResponse.bucket;
      this.s3LoggingBucket = buildS3BucketResponse.loggingBucket;
      bucket = this.s3Bucket;
    } else {
      bucket = props.existingBucketObj;
    }

    this.s3BucketInterface = bucket;

    // Add the requested or default bucket permissions
    if (props.bucketPermissions) {
      if (props.bucketPermissions.includes('Delete')) {
        bucket.grantDelete(this.service.taskDefinition.taskRole);
      }
      if (props.bucketPermissions.includes('Read')) {
        bucket.grantRead(this.service.taskDefinition.taskRole);
      }
      // Sticking with legacy v1 permissions s3:PutObject* instead of CDK v2 s3:PutObject
      // to prevent build failures for both versions
      if (props.bucketPermissions.includes('Write')) {
        this.service.taskDefinition.taskRole.addToPrincipalPolicy(new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
          actions: ['s3:DeleteObject*', 's3:PutObject*', 's3:Abort*']
        }));
      }
    } else {
      this.service.taskDefinition.taskRole.addToPrincipalPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [bucket.bucketArn, `${bucket.bucketArn}/*` ],
        actions: ['s3:GetObject*', 's3:GetBucket*', 's3:List*', 's3:DeleteObject*', 's3:PutObject*', 's3:Abort*']
      }));
    }

    // Add environment variables
    const bucketArnEnvironmentVariableName = this.SetStringWithDefault(props.bucketArnEnvironmentVariableName, 'S3_BUCKET_ARN');
    this.container.addEnvironment(bucketArnEnvironmentVariableName, this.s3BucketInterface.bucketArn);
    const bucketEnvironmentVariableName = this.SetStringWithDefault(props.bucketEnvironmentVariableName, 'S3_BUCKET_NAME');
    this.container.addEnvironment(bucketEnvironmentVariableName, this.s3BucketInterface.bucketName);

  }

  private SetStringWithDefault(value: string | undefined, defaultValue: string) {
    return value || defaultValue;
  }
}
