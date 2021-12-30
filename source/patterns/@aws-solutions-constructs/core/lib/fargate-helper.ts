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

import { Construct } from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecr from "@aws-cdk/aws-ecr";
import * as defaults from "..";
import { overrideProps } from "..";

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
): [ecs.FargateService, ecs.ContainerDefinition] {
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

  const containerDefintionConstructProps: any = {};
  const fargateServiceDefintionConstructProps: any = {};

  if (!clientFargateServiceProps?.cluster) {
    // Construct Fargate Service
    fargateServiceDefintionConstructProps.cluster = CreateCluster(
      scope,
      `${id}-cluster`,
      constructVpc,
      clientClusterProps
    );
  }

  // Set up the Fargate service
  if (!clientContainerDefinitionProps?.image) {
    containerDefintionConstructProps.image = CreateImage(
      scope,
      id,
      ecrRepositoryArn,
      ecrImageVersion
    );
  }
  const taskDefinition = CreateTaskDefinition(
    scope,
    id,
    clientFargateTaskDefinitionProps,
    clientContainerDefinitionProps,
    containerDefintionConstructProps
  );

  // Create the Fargate Service
  fargateServiceDefintionConstructProps.taskDefinition = taskDefinition;

  if (!clientFargateServiceProps?.vpcSubnets) {
    if (constructVpc.isolatedSubnets.length) {
      fargateServiceDefintionConstructProps.vpcSubnets = {
        subnets: constructVpc.isolatedSubnets,
      };
    } else {
      fargateServiceDefintionConstructProps.vpcSubnets = {
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
      securityGroupName: 'defaultSecurityGroup'
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
    fargateServiceDefintionConstructProps
  );

  const newService = new ecs.FargateService(
    scope,
    `${id}-service`,
    fargateServiceProps,
  );
  // We just created this container, so there should never be a situation where it doesn't exist
  const newContainer = newService.taskDefinition.findContainer(
    `${id}-container`
  ) as ecs.ContainerDefinition;

  return [newService, newContainer];
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

function CreateTaskDefinition(
  scope: Construct,
  id: string,
  clientFargateTaskDefinitionProps?: ecs.FargateTaskDefinitionProps,
  clientContainerDefinitionProps?: ecs.ContainerDefinitionProps,
  constructContainerDefintionProps?: ecs.ContainerDefinitionProps
): ecs.FargateTaskDefinition {
  const taskDefinitionProps = defaults.consolidateProps(
    defaults.DefaultFargateTaskDefinitionProps(),
    clientFargateTaskDefinitionProps
  );
  const taskDefinition = new ecs.FargateTaskDefinition(
    scope,
    `${id}-taskdef`,
    taskDefinitionProps
  );

  const containerDefinitionProps = defaults.consolidateProps(
    defaults.DefaultContainerDefinitionProps(),
    clientContainerDefinitionProps,
    defaults.consolidateProps({}, constructContainerDefintionProps, {
      containerName: `${id}-container`,
    })
  );
  taskDefinition.addContainer(`${id}-container`, containerDefinitionProps);
  return taskDefinition;
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
