# aws-cloudfront-s3 module
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
|![Python Logo](https://docs.aws.amazon.com/cdk/api/latest/img/python32.png) Python|`aws_solutions_constructs.aws_cloudfront_s3`|
|![Typescript Logo](https://docs.aws.amazon.com/cdk/api/latest/img/typescript32.png) Typescript|`@aws-solutions-constructs/aws-cloudfront-s3`|
|![Java Logo](https://docs.aws.amazon.com/cdk/api/latest/img/java32.png) Java|`software.amazon.awsconstructs.services.cloudfronts3`|

This AWS Solutions Construct implements an AWS CloudFront fronting an AWS S3 Bucket.

Here is a minimal deployable pattern definition:

``` javascript
const { CloudFrontToS3 } = require('@aws-solutions-constructs/aws-cloudfront-s3');

new CloudFrontToS3(stack, 'test-cloudfront-s3', {});

```

## Initializer

``` text
new CloudFrontToS3(scope: Construct, id: string, props: CloudFrontToS3Props);
```

_Parameters_

* scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.Construct.html)
* id `string`
* props [`CloudFrontToS3Props`](#pattern-construct-props)

## Pattern Construct Props

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|existingBucketObj?|[`s3.Bucket`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.Bucket.html)|Existing instance of S3 Bucket object, if this is set then the bucketProps is ignored.|
|bucketProps?|[`s3.BucketProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.BucketProps.html)|User provided props to override the default props for the S3 Bucket.|
|cloudFrontDistributionProps?|[`cloudfront.CloudFrontWebDistributionProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cloudfront.CloudFrontWebDistributionProps.html)|Optional user provided props to override the default props for CloudFront Distribution|
|insertHttpSecurityHeaders?|`boolean`|Optional user provided props to turn on/off the automatic injection of best practice HTTP security headers in all responses from CloudFront|

## Pattern Properties

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|cloudFrontWebDistribution|[`cloudfront.CloudFrontWebDistribution`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cloudfront.CloudFrontWebDistribution.html)|Returns an instance of cloudfront.CloudFrontWebDistribution created by the construct|
|edgeLambdaFunctionVersion|[`lambda.Version`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.Version.html)|Returns an instance of the edge Lambda function version created by the pattern.|
|cloudFrontLoggingBucket|[`s3.Bucket`](https://docs.aws.amazon.com/cdk/api/latest/docs/aws-s3-readme.html)|Returns an instance of the logging bucket for CloudFront WebDistribution.|
|s3Bucket?|[`s3.Bucket`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.Bucket.html)|Returns an instance of s3.Bucket created by the construct.|
|s3LoggingBucket?|[`s3.Bucket`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.Bucket.html)|Returns an instance of s3.Bucket created by the construct as the logging bucket for the primary bucket.|

## Default settings

Out of the box implementation of the Construct without any override will set the following defaults:

### Amazon CloudFront
* Configure Access logging for CloudFront WebDistribution
* Enable automatic injection of best practice HTTP security headers in all responses from CloudFront WebDistribution

### Amazon S3 Bucket
* Configure Access logging for S3 Bucket
* Enable server-side encryption for S3 Bucket using AWS managed KMS Key
* Enforce encryption of data in transit 
* Turn on the versioning for S3 Bucket
* Don't allow public access for S3 Bucket
* Retain the S3 Bucket when deleting the CloudFormation stack

## Architecture
![Architecture Diagram](architecture.png)

***
&copy; Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.