# aws-fargate-ssmstringparameter module
<!--BEGIN STABILITY BANNER-->

---

![Stability: Experimental](https://img.shields.io/badge/stability-Experimental-important.svg?style=for-the-badge)

> All classes are under active development and subject to non-backward compatible changes or removal in any
> future version. These are not subject to the [Semantic Versioning](https://semver.org/) model.
> This means that while you may use them, you may need to update your source code when upgrading to a newer version of this package.

---
<!--END STABILITY BANNER-->

| **Reference Documentation**:| <span style="font-weight: normal">https://docs.aws.amazon.com/solutions/latest/constructs/</span>|
|:-------------|:-------------|
<div style="height:8px"></div>

| **Language**     | **Package**        |
|:-------------|-----------------|
|![Python Logo](https://docs.aws.amazon.com/cdk/api/latest/img/python32.png) Python|`aws_solutions_constructs.aws_fargate_ssmstringparameter`|
|![Typescript Logo](https://docs.aws.amazon.com/cdk/api/latest/img/typescript32.png) Typescript|`@aws-solutions-constructs/aws-fargate-ssmstringparameter`|
|![Java Logo](https://docs.aws.amazon.com/cdk/api/latest/img/java32.png) Java|`software.amazon.awsconstructs.services.fargatessmstringparameter`|

## Overview
This AWS Solutions Construct implements an AWS Fargate service that can read/write to an AWS Systems Manager String Parameter

Here is a minimal deployable pattern definition:

Typescript
``` typescript
import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';
import { FargateToSsmstringparameter, FargateToSsmstringparameterProps } from '@aws-solutions-constructs/aws-fargate-ssmstringparameter';

const constructProps: FargateToSsmstringparameterProps = {
  publicApi: true,
  ecrRepositoryArn: "arn:aws:ecr:us-east-1:123456789012:repository/your-ecr-repo",
  stringParameterProps: { stringValue: "test-string-value" }
};

new FargateToSsmstringparameter(stack, 'test-construct', constructProps);
```

Python
``` python
from aws_solutions_constructs.aws_fargate_ssmstringparameter import FargateToSsmstringparameter, FargateToSsmstringparameterProps
from aws_cdk import (
    Stack,
    aws_ssm as ssm
)
from constructs import Construct

FargateToSsmstringparameter(self, 'test_construct',
            public_api=True,
            ecr_repository_arn="arn:aws:ecr:us-east-1:123456789012:repository/your-ecr-repo",
            string_parameter_props=ssm.StringParameterProps(
              string_value="test-string-value"))
```

Java
``` java
import software.constructs.Construct;

import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.ssm.*;
import software.amazon.awsconstructs.services.fargatessmstringparameter.*;

new FargateToSsmstringparameter(this, "test-construct", new FargateToSsmstringparameterProps.Builder()
        .publicApi(true)
        .ecrRepositoryArn("arn:aws:ecr:us-east-1:123456789012:repository/your-ecr-repo")
        .stringParameterProps(new StringParameterProps.Builder()
                        .stringValue("test-string-value")
                        .build())
        .build());
```

## Pattern Construct Props

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
| publicApi | `boolean` | Whether the construct is deploying a private or public API. This has implications for the VPC. |
| vpcProps? | [`ec2.VpcProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-ec2.VpcProps.html) | Optional custom properties for a VPC the construct will create. This VPC will be used by any Private Hosted Zone the construct creates (that's why loadBalancerProps and privateHostedZoneProps can't include a VPC). Providing both this and existingVpc is an error. |
| existingVpc? | [`ec2.IVpc`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-ec2.IVpc.html) | An existing VPC in which to deploy the construct. Providing both this and vpcProps is an error. If the client provides an existing load balancer and/or existing Private Hosted Zone, those constructs must exist in this VPC. |
| clusterProps? | [`ecs.ClusterProps`](https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-ecs.ClusterProps.html) | Optional properties to create a new ECS cluster. To provide an existing cluster, use the cluster attribute of fargateServiceProps. |
| ecrRepositoryArn? | `string` | The arn of an ECR Repository containing the image to use to generate the containers. Either this or the image property of containerDefinitionProps must be provided. format: arn:aws:ecr:*region*:*account number*:repository/*Repository Name* |
| ecrImageVersion? | `string` | The version of the image to use from the repository. Defaults to 'Latest' |
| containerDefinitionProps? | [`ecs.ContainerDefinitionProps \| any`](https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-ecs.ContainerDefinitionProps.html) | Optional props to define the container created for the Fargate Service (defaults found in fargate-defaults.ts) |
| fargateTaskDefinitionProps? | [`ecs.FargateTaskDefinitionProps \| any`](https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-ecs.FargateTaskDefinitionProps.html) | Optional props to define the Fargate Task Definition for this construct  (defaults found in fargate-defaults.ts) |
| fargateServiceProps? | [`ecs.FargateServiceProps \| any`](https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-ecs.FargateServiceProps.html) | Optional values to override default Fargate Task definition properties (fargate-defaults.ts). The construct will default to launching the service is the most isolated subnets available (precedence: Isolated, Private and Public). Override those and other defaults here. |
| existingFargateServiceObject? | [`ecs.FargateService`](https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-ecs.FargateService.html) | A Fargate Service already instantiated (probably by another Solutions Construct). If this is specified, then no props defining a new service can be provided, including: ecrImageVersion, containerDefinitionProps, fargateTaskDefinitionProps, ecrRepositoryArn, fargateServiceProps, clusterProps |
| existingContainerDefinitionObject? | [`ecs.ContainerDefinition`](https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-ecs.ContainerDefinition.html) | A container definition already instantiated as part of a Fargate service. This must be the container in the existingFargateServiceObject |
|existingStringParameterObj?|[`ssm.StringParameter`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-ssm.StringParameter.html)|Existing instance of SSM String parameter object, providing both this and `stringParameterProps` will cause an error|
|stringParameterProps?|[`ssm.StringParameterProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-ssm.StringParameterProps.html)|Optional user provided props to override the default props for SSM String parameter. If existingStringParameterObj is not set stringParameterProps is required. The only supported [`ssm.StringParameterProps.type`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-ssm.StringParameterProps.html#type) is [`STRING`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-ssm.ParameterType.html#string) if a different value is provided it will be overridden.|
|stringParameterPermissions?|`string`|Optional SSM String parameter permissions to grant to the Fargate service. One of the following may be specified: "Read", "ReadWrite".
|stringParameterEnvironmentVariableName?|`string`|Optional Name for the container environment variable set to the SSM parameter name. Default: SSM_STRING_PARAMETER_NAME |

## Pattern Properties

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
| vpc | [`ec2.IVpc`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-ec2.IVpc.html) | The VPC used by the construct (whether created by the construct or provided by the client) |
| service | [`ecs.FargateService`](https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-ecs.FargateService.html) | The AWS Fargate service used by this construct (whether created by this construct or passed to this construct at initialization) |
| container | [`ecs.ContainerDefinition`](https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-ecs.ContainerDefinition.html) | The container associated with the AWS Fargate service in the service property. |
|stringParameter|[`ssm.StringParameter`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-ssm.StringParameter.html)|Returns an instance of `ssm.StringParameter` created by the construct|

## Default settings

Out of the box implementation of the Construct without any override will set the following defaults:

### AWS Fargate Service
* Sets up an AWS Fargate service
  * Uses the existing service if provided
  * Creates a new service if none provided.
    * Service will run in isolated subnets if available, then private subnets if available and finally public subnets
  * Adds environment variables to the container with the ARN and Name of the SSM parameter
  * Add permissions to the container IAM role allowing it to read/write to the SSM parameter

### AWS SSM String Parameter
* Sets up an AWS SSM String Parameter
  * Uses an existing parameter if one is provided, otherwise creates a new one
* Adds an Interface Endpoint to the VPC for SSM parameter (the service by default runs in Isolated or Private subnets)

## Architecture
![Architecture Diagram](architecture.png)

***
&copy; Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
