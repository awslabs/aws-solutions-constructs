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

import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as defaults from "..";
import { overrideProps } from "..";

export interface CreateFargateServiceResponse {
  readonly service: ecs.FargateService,
  readonly containerDefinition: ecs.ContainerDefinition
}

export function CreateFargateService(
  scope: Construct,
  id: string,
  constructVpc: ec2.IVpc,
  clientClusterProps?: ecs.ClusterProps,
  ecrRepositoryArn?: string,
  ecrImageVersion?: string,
  clientFargateTaskDefinitionProps?: ecs.FargateTaskDefinitionProps | any,
  clientContainerDefinitionProps?: ecs.ContainerDefinitionProps | any,
  clientFargateServiceProps?: ecs.FargateServiceProps | any
): CreateFargateServiceResponse {
  defaults.AddAwsServiceEndpoint(
    scope,
    constructVpc,
    defaults.ServiceEndpointTypes.ECR_API
  );
  defaults.AddAwsServiceEndpoint(
    scope,
    constructVpc,
    defaults.ServiceEndpointTypes.ECR_DKR
  );
  defaults.AddAwsServiceEndpoint(
    scope,
    constructVpc,
    defaults.ServiceEndpointTypes.S3
  );

  const constructContainerDefintionProps: any = {};
  const constructFargateServiceDefinitionProps: any = {};

  if (!clientFargateServiceProps?.cluster) {
    // Construct Fargate Service
    constructFargateServiceDefinitionProps.cluster = CreateCluster(
      scope,
      `${id}-cluster`,
      constructVpc,
      clientClusterProps
    );
  }

  // Set up the Fargate service
  if (!clientContainerDefinitionProps?.image) {
    constructContainerDefintionProps.image = CreateImage(
      scope,
      id,
      ecrRepositoryArn,
      ecrImageVersion
    );
  }

  // Create the Fargate Service
  let newContainerDefinition;
  const createTaskDefinitionResponse = CreateTaskDefinition(
    scope,
    id,
    clientFargateTaskDefinitionProps,
    clientContainerDefinitionProps,
    constructContainerDefintionProps
  );
  constructFargateServiceDefinitionProps.taskDefinition = createTaskDefinitionResponse.taskDefinition;
  newContainerDefinition = createTaskDefinitionResponse.containerDefinition;

  if (!clientFargateServiceProps?.vpcSubnets) {
    if (constructVpc.isolatedSubnets.length) {
      constructFargateServiceDefinitionProps.vpcSubnets = {
        subnets: constructVpc.isolatedSubnets,
      };
    } else {
      constructFargateServiceDefinitionProps.vpcSubnets = {
        subnets: constructVpc.privateSubnets,
      };
    }
  }

  let defaultFargateServiceProps;

  if (!clientFargateServiceProps?.securityGroups) {
    const serviceSecurityGroup = new ec2.SecurityGroup(scope, `${id}-sg`, {
      allowAllOutbound: true,
      disableInlineRules: false,
      vpc: constructVpc,
      // We add a description here so that this SG can be easily identified in tests
      description: 'Construct created security group'
    });
    defaultFargateServiceProps = overrideProps(defaults.DefaultFargateServiceProps(), { securityGroups: [ serviceSecurityGroup ]});
    defaults.addCfnSuppressRules(serviceSecurityGroup, [
      {
        id: 'W5',
        reason: 'Egress of 0.0.0.0/0 is default and generally considered OK',
      },
      {
        id: 'W40',
        reason: 'Egress IPProtocol of -1 is default and generally considered OK',
      }
    ]);
  } else {
    defaultFargateServiceProps = defaults.DefaultFargateServiceProps();
  }

  const fargateServiceProps = defaults.consolidateProps(
    defaultFargateServiceProps,
    clientFargateServiceProps,
    constructFargateServiceDefinitionProps
  );

  const newService = new ecs.FargateService(
    scope,
    `${id}-service`,
    fargateServiceProps,
  );

  return { service: newService, containerDefinition: newContainerDefinition };
}

function CreateCluster(
  scope: Construct,
  id: string,
  constructVpc: ec2.IVpc,
  clientClusterProps?: ecs.ClusterProps
): ecs.ICluster {
  const constructProps = { vpc: constructVpc };
  return new ecs.Cluster(
    scope,
    id,
    defaults.consolidateProps(
      defaults.DefaultClusterProps(),
      clientClusterProps,
      constructProps
    )
  );
}

function CreateImage(
  scope: Construct,
  id: string,
  repositoryArn?: string,
  imageVersion?: string
): ecs.ContainerImage {
  if (repositoryArn) {
    return ecs.ContainerImage.fromEcrRepository(
      ecr.Repository.fromRepositoryArn(scope, `${id}-container`, repositoryArn),
      imageVersion || "latest"
    );
  } else {
    throw new Error("Not Implemented - image without repo name and version");
  }
}

interface CreateTaskDefinitionResponse {
  taskDefinition: ecs.FargateTaskDefinition
  containerDefinition: ecs.ContainerDefinition
}

function CreateTaskDefinition(
  scope: Construct,
  id: string,
  clientFargateTaskDefinitionProps?: ecs.FargateTaskDefinitionProps,
  clientContainerDefinitionProps?: ecs.ContainerDefinitionProps,
  constructContainerDefinitionProps?: ecs.ContainerDefinitionProps
): CreateTaskDefinitionResponse {
  const taskDefinitionProps = defaults.consolidateProps(
    defaults.DefaultFargateTaskDefinitionProps(),
    clientFargateTaskDefinitionProps
  );
  const taskDefinition = new ecs.FargateTaskDefinition(
    scope,
    `${id}-taskdef`,
    taskDefinitionProps
  );

  const defaultContainerDefinitionProps = defaults.consolidateProps(defaults.DefaultContainerDefinitionProps(), {
    containerName: `${id}-container`,
  });
  const containerDefinitionProps = defaults.consolidateProps(
    defaultContainerDefinitionProps,
    clientContainerDefinitionProps,
    constructContainerDefinitionProps,
  );
  const containerDefinition = taskDefinition.addContainer(`${id}-container`, containerDefinitionProps);
  return { taskDefinition, containerDefinition };
}

export function CheckFargateProps(props: any) {
  let errorMessages = "";
  let errorFound = false;

  if (
    props.existingFargateServiceObject &&
    (props.existingImageObject ||
      props.ecrImageVersion ||
      props.containerDefinitionProps ||
      props.fargateTaskDefinitionProps ||
      props.ecrRepositoryArn ||
      props.fargateServiceProps ||
      props.clusterProps)
  ) {
    errorFound = true;
    errorMessages +=
      "If you provide an existingFargateServiceObject, you cannot provide any props defining a new service\n";
  }

  if (
    props.existingImageObject &&
    (props.ecrImageVersion || props.ecrRepositoryArn)
  ) {
    errorFound = true;
    errorMessages +=
      "If you provide an existingImageObject then you cannot provide an ecrRepositoryArn nor ecrImageVersion\n";
  }

  // Confirm no network information in Target Group Props
  if (props.targetGroupProps?.vpc) {
    errorFound = true;
    errorMessages +=
      "Provide all VPC info at Construct level, not within targetGroupProps\n";
  }

  if (props.fargateServiceProps?.taskDefinition) {
    errorFound = true;
    errorMessages +=
      "The construct cannot accept an existing task definition in fargateServiceProps\n";
  }

  if (props.fargateServiceProps?.cluster && props.clusterProps) {
    errorFound = true;
    errorMessages +=
      "If you provide a cluster in fargateServiceProps then you cannot provide clusterProps\n";
  }

  if (props.clusterProps?.vpc) {
    errorFound = true;
    errorMessages +=
      "All services in the construct use the construct VPC, you cannot specify a VPC in clusterProps\n";
  }

  if (
    (props.existingFargateServiceObject ||
      props.existingContainerDefinitionObject) &&
    (!props.existingFargateServiceObject ||
      !props.existingContainerDefinitionObject ||
      !props.existingVpc)
  ) {
    errorFound = true;
    errorMessages +=
      "If an existing Service is indicated by supplying either existingFargateServiceObject or existingContainerDefinitionObject, then existingFargateServiceObject, existingContainerDefinitionObject, and existingVpc must all be provided\n";
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }
}

export function getServiceVpcSecurityGroupIds(service: ecs.FargateService): string[] {
  const securityGroupIds: string[] = [];

  service.connections.securityGroups.forEach(element => securityGroupIds.push(element.securityGroupId));

  return securityGroupIds;
}