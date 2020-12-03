# aws-cloudfront-mediastore module
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
|![Python Logo](https://docs.aws.amazon.com/cdk/api/latest/img/python32.png) Python|`aws_solutions_constructs.aws_cloudfront_mediastore`|
|![TypeScript Logo](https://docs.aws.amazon.com/cdk/api/latest/img/typescript32.png) TypeScript|`@aws-solutions-constructs/aws-cloudfront-mediastore`|
|![Java Logo](https://docs.aws.amazon.com/cdk/api/latest/img/java32.png) Java|`software.amazon.awsconstructs.services.cloudfrontmediastore`|

## Overview
This AWS Solutions Construct implements an Amazon CloudFront distribution to an AWS Elemental MediaStore container.

Here is a minimal deployable pattern definition in TypeScript:

``` typescript
import { CloudFrontToMediaStore } from '@aws-solutions-constructs/aws-cloudfront-mediastore';

new CloudFrontToMediaStore(this, 'test-cloudfront-mediastore-default', {});

```

## Initializer

``` text
new CloudFrontToMediaStore(scope: Construct, id: string, props: CloudFrontToMediaStoreProps);
```

_Parameters_

* scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.Construct.html)
* id `string`
* props [`CloudFrontToMediaStoreProps`](#pattern-construct-props)

## Pattern Construct Props

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|exsistingMediaStoreContainerObj?|[`mediastore.CfnContainer`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-mediastore.CfnContainer.html)|Optional user provided MediaStore container to override the default MediaStore container.|
|mediaStoreContainerProps?|[`mediastore.CfnContainerProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-mediastore.CfnContainerProps.html)|Optional user provided props to override the default props for the MediaStore Container.|
|cloudFrontDistributionProps?|[`cloudfront.DistributionProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cloudfront.DistributionProps.html)\|`any`|Optional user provided props to override the default props for the CloudFront Distribution.|

## Pattern Properties

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|cloudFrontWebDistribution|[`cloudfront.CloudFrontWebDistribution`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cloudfront.CloudFrontWebDistribution.html)|Returns an instance of the CloudFront Web Distribution created by the construct.|
|mediaStoreContainer|[`mediastore.CfnContainer`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-mediastore.CfnContainer.html)|Returns an instance of the MediaStore Container.|
|cloudFrontLoggingBucket|[`s3.Bucket`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.Bucket.html)|Returns an instance of the logging S3 bucket for CloudFront Web Distribution.|
|cloudFrontOriginRequestPolicy|[`cloudfront.OriginRequestPolicy`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cloudfront.OriginRequestPolicy.html)|Returns an instance of the CloudFront Origin Request Policye created by the construct for CloudFront Web Distribution.|
|cloudFrontOriginAccessIdentity?|[`cloudfront.OriginAccessIdentity`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cloudfront.OriginAccessIdentity.html)|Returns an instance of the CloudFront Origin Access Identity created by the construct for the CloudFront Web Distribution origin custom headers and the MediaStore Container policy.|

## Default settings

Out of the box implementation of the Construct without any override will set the following defaults:

### Amazon CloudFront
* Configure access logging for CloudFront Web Distribution
* Enable CloudFront Origin Request Policy for AWS Elemental MediaStore Container
* Set `User-Agent` custom header with CloudFront Origin Access Identity

### AWS Elemental MediaStore
* Set the deletion policy to retain the resource
* Set the container name with the CloudFormation stack name
* Set the default [Container Cross-origin resource sharing (CORS) policy](https://docs.aws.amazon.com/mediastore/latest/ug/cors-policy.html)
* Set the default [Object Life Cycle policy](https://docs.aws.amazon.com/mediastore/latest/ug/policies-object-lifecycle.html)
* Set the default [Container Policy](https://docs.aws.amazon.com/mediastore/latest/ug/policies.html) to allow only `aws:UserAgent` with CloudFront Origin Access Identity
* Enable the access logging

## Architecture
![Architecture Diagram](architecture.png)

***
&copy; Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.