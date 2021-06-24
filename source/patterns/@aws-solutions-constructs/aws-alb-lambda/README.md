# aws-alb-lambda module
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
|![Python Logo](https://docs.aws.amazon.com/cdk/api/latest/img/python32.png) Python|`aws_solutions_constructs.aws_alb_lambda`|
|![Typescript Logo](https://docs.aws.amazon.com/cdk/api/latest/img/typescript32.png) Typescript|`@aws-solutions-constructs/aws-alb-lambda`|
|![Java Logo](https://docs.aws.amazon.com/cdk/api/latest/img/java32.png) Java|`software.amazon.awsconstructs.services.alblambda`|

## Overview

This AWS Solutions Construct implements an Application Load Balancer connected to an AWS Lambda function pattern.

Here is a minimal deployable pattern definition in Typescript:

``` typescript
import { AlbToLambda } from '@aws-solutions-constructs/aws-alb-lambda';

new AlbToLambda(this, 'AlbToLambdaPattern', {
    lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_10_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(`${__dirname}/lambda`)
    }
});

```

## Initializer

``` typescript
new AlbToLambda(scope: Construct, id: string, props: AlbToLambdaProps);
```

_Parameters_

* scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.Construct.html)
* id `string`
* props [`AlbToLambdaProps`](#pattern-construct-props)

## Pattern Construct Props

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|existingLambdaObj?|[`lambda.Function`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.Function.html)|Existing instance of Lambda Function object, if this is set then the lambdaFunctionProps is ignored.|
|lambdaFunctionProps?|[`lambda.FunctionProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.FunctionProps.html)|User provided props to override the default props of the newly created Lambda function.|
|createDefaultListner?|`boolean`|Default value set to `true`. Creates a HTTP Listener on `port 80` and associates to the Application Load Balancer. If `certificates` property is specified, a HTTPS Listener on `port 443` is created and associated to Application Load Balancer.|
|certificates?|[`elb.IListenerCertificate[]`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-elasticloadbalancingv2.IListenerCertificate.html)| List of ACM cert ARNs. Used to create a HTTPS Listener on `port 443` if `createDefaultListner` is set to `true`|
|vpcProps?|[`ec2.VpcProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-ec2.VpcProps.html)|User provided VPC props that are used to override the default provide used for creating a new VPC. A new VPC is created if user doesn't provide existing VPC details [`elb.applicationLoadBalancerProps.vpc`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-elasticloadbalancingv2.ApplicationLoadBalancerProps.html).|
|applicationLoadBalancerProps?|[`elb.ApplicationLoadBalancerProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-elasticloadbalancingv2.ApplicationLoadBalancerProps.html)|Optional user-provided props to override the default props for the Application Load Balancer.|

## Pattern Properties

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|lambdaFunction|[`lambda.Function`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.Function.html)|Returns an instance of the Lambda function created by the pattern.|
|applicationLoadBalancer|[`elb.ApplicationLoadBalancer`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-elasticloadbalancingv2.ApplicationLoadBalancer.html)|Returns an instance of the Application Load Balancer created by the pattern.|
|applicationTargetGroup|[`elb.ApplicationTargetGroup`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-elasticloadbalancingv2.ApplicationTargetGroup.html)|Returns an instance of the ApplicationTargetGroup created by the pattern.|
|vpc|[`ec2.Vpc`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-ec2.Vpc.html)|Returns an instance of the VPC created by the pattern.|

## Default settings

Out of the box implementation of the Construct without any override will set the following defaults:

### Virtual Private Cloud

* A Private subnet in each Availability Zone
* A Public subnet in each Availiabiity Zone

### Application Load Balancer

* Application Load Balancer is configured as Internal facing
* Default Target Group configured with Lambda
* A HTTP Listner configured with newly created Target Group
* Configure least privilege access IAM role for Application Load Balancer

### AWS Lambda Function

* Configure Lambda Function to access resources within newly created VPC
* Configure least privilege access IAM role for Lambda function
* Enable reusing connections with Keep-Alive for NodeJs Lambda function
* Enable X-Ray Tracing

## Architecture

![Architecture Diagram](architecture.png)

***
&copy; Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
