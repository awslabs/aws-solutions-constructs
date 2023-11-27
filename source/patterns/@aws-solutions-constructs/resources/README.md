# resources module
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

The resources library contains reusable resources that can be leveraged from solutions constructs. These resources are deployable units with their own sets of integration tests (to contrast them with the solutions constructs `core` library).

The first resource being published is the `template-writer`, which does automatic text transformation/substiution, implemented as a custom resource, and run as part of a CloudFormation stack Create/Update/Delete lifecycle. Some use-cases for using the `template-writer` resource can be seen in the `aws-openapigateway-lambda` Solutions Construct, where it transforms an incoming OpenAPI Definition (residing locally or in S3) by auto-populating the `uri` fields of the `x-amazon-apigateway-integration` integrations with the resolved value of the backing lambda functions.
