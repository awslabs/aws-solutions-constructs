# aws-lambda-bedrockinferenceprofile module
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
|![Python Logo](https://docs.aws.amazon.com/cdk/api/latest/img/python32.png) Python|`aws_solutions_constructs.aws_lambda_bedrockinferenceprofile`|
|![Typescript Logo](https://docs.aws.amazon.com/cdk/api/latest/img/typescript32.png) Typescript|`@aws-solutions-constructs/aws-lambda-bedrockinferenceprofile`|
|![Java Logo](https://docs.aws.amazon.com/cdk/api/latest/img/java32.png) Java|`software.amazon.awsconstructs.services.lambdabedrockinferenceprofile`|

## Overview
This AWS Solutions Construct implements a Lambda function granted access to a new Bedrock Inference Profile. [Inference profiles](https://aws.amazon.com/blogs/machine-learning/getting-started-with-cross-region-inference-in-amazon-bedrock/) allow:
* Greater scalability of applications by distributing Bedrock Invoke calls across multiple regions
* Cost management by adding Cost Allocation Tags to an inference to track costs for specific applications.

Here is a minimal deployable pattern definition:

Typescript
``` typescript
import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';
import { LambdaToBedrockInferenceProfile } from "@aws-solutions-constructs/aws-lambda-bedrockinferenceprofile";
import * as lambda from 'aws-cdk-lib/aws-lambda';

new LambdaToBedrockInferenceProfile(this, 'LambdaToBedrockPattern', {
    lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(`lambda`)
    },
    model: "amazon.nova-lite-v1:0"
});
```

Python
``` python
# TBD
```

Java
``` java
// TBD
```

## Pattern Construct Props

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|existingLambdaObj?|[`lambda.Function`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Function.html)|Existing instance of Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.|
|lambdaFunctionProps?|[`lambda.FunctionProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.FunctionProps.html)|Optional user provided props to override the default props for the Lambda function.|
|existingVpc?|[`ec2.IVpc`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.IVpc.html)|An optional, existing VPC into which this pattern should be deployed. When deployed in a VPC, the Lambda function will use ENIs in the VPC to access network resources and an Interface Endpoint will be created in the VPC for Amazon Bedrock and Bedrock-Runtime. If an existing VPC is provided, the `deployVpc` property cannot be `true`. This uses `ec2.IVpc` to allow clients to supply VPCs that exist outside the stack using the [`ec2.Vpc.fromLookup()`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.Vpc.html#static-fromwbrlookupscope-id-options) method.|
|vpcProps?|[`ec2.VpcProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.VpcProps.html)|Optional user provided properties to override the default properties for the new VPC. `enableDnsHostnames`, `enableDnsSupport`, `natGateways` and `subnetConfiguration` are set by the pattern, so any values for those properties supplied here will be overridden. If `deployVpc` is not `true` then this property will be ignored.|
|deployVpc?|`boolean`|Whether to create a new VPC based on `vpcProps` into which to deploy this pattern. Setting this to true will deploy the minimal, most private VPC to run the pattern:<ul><li> One isolated subnet in each Availability Zone used by the CDK program</li><li>`enableDnsHostnames` and `enableDnsSupport` will both be set to true</li></ul>If this property is `true` then `existingVpc` cannot be specified. Defaults to `false`.|
|bedrockModelId|`string`|The foundation model to use with the inference profile. Depending on whether the deployment is cross region or single region, he construct will create the correct inference profile name and and assign IAM permissions to the Lambda function allowing access to the foundation model in all appropriate regions. For all of this to occur, the model must be specified here and *not* in `inferenceProfileProps`. Be certain that the account is granted access to the foundation model in [all the regions covered by the cross-region inference profile](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html).|
|inferenceProfileProps?|[`bedrock.CfnApplicationInferenceProfileProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_bedrock.CfnApplicationInferenceProfileProps.html)|This is where you set tags required for tracking inference calls. Do not populate the copyFrom attribute - the construct will populate this based upon the model sent in bedrockModelId (this allows the construct to correctly create all the other dependencies like the required IAM policies). If the copyFrom attribute is supplied here the construct will throw an error. The construct will also set a unique, stack specific inferenceProfileName - you may override that name here, but it is not recommended. 
|deployCrossRegionProfile|boolean| Whether to deploy a cross-region inference profile that will automatically distribute Invoke calls across multiple regions. Note that at the time of this writing, cross-region profiles are only available in [US, EMEA and APAC](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html). Single region profiles are available in every region supporting Bedrock models. Defaults to `true`|
|foundationModelEnvironmentVariableName?|string|Optional Name for the Lambda function environment variable set to the Model name. Defaults to BEDROCK_MODEL|
|inferenceProfileEnvironmentVariableName?|string|Optional Name for the Lambda function environment variable set to the inference profile arn. Defaults to BEDROCK_PROFILE|

## Pattern Properties

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|lambdaFunction|[`lambda.Function`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Function.html)|Returns an instance of the Lambda function created by the pattern.|
|inferenceProfile|[`CfnApplicationInferenceProfile`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_bedrock.CfnApplicationInferenceProfile.html)|The inference profile created by the construct.|
|vpc?|[`ec2.IVpc`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.IVpc.html)|Returns an interface on the VPC used by the pattern (if any). This may be a VPC created by the pattern or the VPC supplied to the pattern constructor.|

## Default settings

Out of the box implementation of the Construct without any override will set the following defaults:

### AWS Lambda Function
* Configure limited privilege access IAM role for Lambda function, granting Invoke privileges for:
  * The new inference profile  
  * The appropriate foundation model in all regions in the geographic area. For single region inference profiles, access is only granted to model in the current region. 
* Enable reusing connections with Keep-Alive for NodeJs Lambda function
* Enable X-Ray Tracing
* Set Environment Variables
  * (default) BEDROCK_PROFILE
  * (default) BEDROCK_MODEL

### Amazon Bedrock Inference Profile
* Cross-region inference profile for provided model by default
* Geographic area prefix in arn defaults to value appropriate for deployment region (e.g. would us 'us' for us-east-1 deployment)

## Architecture
![Architecture Diagram](architecture.png)

***
&copy; Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
