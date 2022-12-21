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

import * as defaults from "@aws-solutions-constructs/core";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as opensearch from "aws-cdk-lib/aws-opensearchservice";
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from "constructs";

export interface FargateToOpenSearchProps {
  /**
   * Optional custom properties for a VPC the construct will create. This VPC will
   * be used by the new Fargate service the construct creates (that's
   * why targetGroupProps can't include a VPC). Providing
   * both this and existingVpc is an error.
   *
   * @default - none
   */
  readonly vpcProps?: ec2.VpcProps;
  /**
   * An existing VPC in which to deploy the construct. Providing both this and
   * vpcProps is an error. If the client provides an existing Fargate service,
   * this value must be the VPC where the service is running.
   *
   * @default - none
   */
  readonly existingVpc?: ec2.IVpc;
  /**
   * Whether the construct is deploying a private or public API. This has implications for the VPC deployed
   * by this construct.
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
   * existingImageObject, ecrImageVersion, containerDefintionProps, fargateTaskDefinitionProps,
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
   * Optional user provided props to override the default props for the OpenSearch Service.
   *
   * @default - Default props are used
   */
  readonly openSearchDomainProps?: opensearch.CfnDomainProps;
  /**
   * Domain name for the OpenSearch Service.
   *
   * @default - None
   */
  readonly openSearchDomainName: string;
  /**
   * Optional Amazon Cognito domain name. If omitted the Amazon Cognito domain will default to the OpenSearch Service domain name.
   *
   * @default - the OpenSearch Service domain name
   */
  readonly cognitoDomainName?: string;
  /**
   * Whether to create recommended CloudWatch alarms
   *
   * @default - Alarms are created
   */
  readonly createCloudWatchAlarms?: boolean;
  /**
   * Optional Name for the container environment variable set to the domain endpoint.
   *
   * @default - DOMAIN_ENDPOINT
   */
  readonly domainEndpointEnvironmentVariableName?: string;
}

export class FargateToOpenSearch extends Construct {
  public readonly vpc: ec2.IVpc;
  public readonly service: ecs.FargateService;
  public readonly container: ecs.ContainerDefinition;
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPool: cognito.CfnIdentityPool;
  public readonly openSearchDomain: opensearch.CfnDomain;
  public readonly openSearchRole: iam.Role;
  public readonly cloudWatchAlarms?: cloudwatch.Alarm[];

  constructor(scope: Construct, id: string, props: FargateToOpenSearchProps) {
    super(scope, id);
    defaults.CheckProps(props);
    defaults.CheckFargateProps(props);

    this.vpc = defaults.buildVpc(scope, {
      existingVpc: props.existingVpc,
      defaultVpcProps: props.publicApi ? defaults.DefaultPublicPrivateVpcProps() : defaults.DefaultIsolatedVpcProps(),
      userVpcProps: props.vpcProps,
      constructVpcProps: { enableDnsHostnames: true, enableDnsSupport: true }
    });

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

    let cognitoAuthorizedRole: iam.Role;

    [this.userPool, this.userPoolClient, this.identityPool, cognitoAuthorizedRole] =
      defaults.buildCognitoForSearchService(this, props.cognitoDomainName ?? props.openSearchDomainName);

    let securityGroupIds;

    if (this.vpc) {
      securityGroupIds = defaults.getServiceVpcSecurityGroupIds(this.service);
    }

    const buildOpenSearchProps: defaults.BuildOpenSearchProps = {
      userpool: this.userPool,
      identitypool: this.identityPool,
      cognitoAuthorizedRoleARN: cognitoAuthorizedRole.roleArn,
      vpc: this.vpc,
      openSearchDomainName: props.openSearchDomainName,
      clientDomainProps: props.openSearchDomainProps,
      securityGroupIds
    };

    [this.openSearchDomain, this.openSearchRole] = defaults.buildOpenSearch(this, buildOpenSearchProps);

    if (props.createCloudWatchAlarms === undefined || props.createCloudWatchAlarms) {
      this.cloudWatchAlarms = defaults.buildOpenSearchCWAlarms(this);
    }

    // Add environment variables
    const domainEndpointEnvironmentVariableName = props.domainEndpointEnvironmentVariableName || 'DOMAIN_ENDPOINT';
    this.container.addEnvironment(domainEndpointEnvironmentVariableName, this.openSearchDomain.attrDomainEndpoint);

  }
}
