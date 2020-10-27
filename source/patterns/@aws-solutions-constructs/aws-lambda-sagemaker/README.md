# aws-lambda-sagemaker module
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
|![Python Logo](https://docs.aws.amazon.com/cdk/api/latest/img/python32.png) Python|`aws_solutions_constructs.aws_lambda_sagemaker`|
|![Typescript Logo](https://docs.aws.amazon.com/cdk/api/latest/img/typescript32.png) Typescript|`@aws-solutions-constructs/aws-lambda-sagemaker`|
|![Java Logo](https://docs.aws.amazon.com/cdk/api/latest/img/java32.png) Java|`software.amazon.awsconstructs.services.lambdasagemaker`|

This AWS Solutions Construct implements the AWS Lambda function and Amazon Sagemaker Notebook with the least privileged permissions.

Here is a minimal deployable pattern definition in Typescript:

``` typescript
import { LambdaToSagemakerProps,  LambdaToSagemaker } from '@aws-solutions-constructs/aws-lambda-sagemaker';
import { Aws } from "@aws-cdk/core";

const lambdaToSagemakerProps: LambdaToSagemakerProps = {
    lambdaFunctionProps: {
        code: lambda.Code.fromAsset(`${__dirname}/lambda`),
        runtime: lambda.Runtime.NODEJS_12_X,
        handler: 'index.handler'
    },
};

const construct = new LambdaToSagemaker(stack, 'test-lambda-sagemaker-stack', lambdaToSagemakerProps);

// // Add the necessary permissions to the SageMakerRole for accessing other AWS Resources e.g. S3 Bucket
// construct.sagemakerRole.addToPolicy(new iam.PolicyStatement({
//     resources: [`arn:${Aws.PARTITION}:s3:::<Your bucket name>/*`],
//     actions: [
//         "s3:GetObject*",
//         "s3:PutObject*",
//     ],
// }));

// // Add the necessary permissions to the Lambda Function Role e.g. additional SageMaker permissions
// construct.lambdaFunction.role?.addToPrincipalPolicy(new iam.PolicyStatement({
//     resources: [`arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:transform-job/*`],
//     actions: [
//         "sagemaker:CreateTransformJob",
//     ],
// }));

```

## Initializer

``` text
new LambdaToSagemaker(scope: Construct, id: string, props: LambdaToSagemakerProps);
```

_Parameters_

* scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.Construct.html)
* id `string`
* props [`LambdaToSagemakerProps`](#pattern-construct-props)

## Pattern Construct Props

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|existingLambdaObj?|[`lambda.Function`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.Function.html)|Existing instance of Lambda Function object, if this is set then the lambdaFunctionProps is ignored.|
|lambdaFunctionProps?|[`lambda.FunctionProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.FunctionProps.html)|User provided props to override the default props for the Lambda function.|
|sagemakerNotebookProps?|[`sagemaker.CfnNotebookInstanceProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sagemaker.CfnNotebookInstance.html)|Optional user provided props to override the default props for a Sagemaker Notebook.|
|deployInsideVpc?|[`boolean`]()|Optional user provided props to deploy inside vpc. Defaults to `true`.|
|existingNotebookObj?|[`sagemaker.CfnNotebookInstanceProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sagemaker.CfnNotebookInstance.html)|Existing instance of notebook object. If this is set then the sagemakerNotebookProps is ignored|

## Pattern Properties

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|lambdaFunction|[`lambda.Function`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.Function.html)|Returns an instance of lambda.Function created by the construct|
|sagemakerNotebook|[`sagemaker.CfnNotebookInstanceProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sagemaker.CfnNotebookInstance.html)|Returns an instance of sagemaker.CfnNotebookInstanceProps created by the construct|
|sagemakerRole|[`iam.Role`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-iam.Role.html)|Returns the iam.Role created by the construct|
|vpc?|[`ec2.Vpc`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-ec2.Vpc.html)|Returns the ec2.Vpc created by the construct|
|securityGroup?|[`ec2.SecurityGroup`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-ec2.SecurityGroup.html)|Returns the ec2.SecurityGroup created by the construct|

## Default settings

Out of the box implementation of the Construct without any override will set the following defaults:

### AWS Lambda Function
* Configure limited privilege access IAM role for Lambda function
* Enable reusing connections with Keep-Alive for NodeJs Lambda function

### Amazon SageMaker
* Configure least privilege access IAM role for the SageMaker Notebook Intance
* Deploy SageMaker NotebookInstance inside the VPC
* Enable server-side encryption for the SageMaker NotebookInstance using Customer Managed KMS Key

## Architecture
![Architecture Diagram](architecture.png)

***
&copy; Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.