# API Reference
<!--BEGIN STABILITY BANNER-->

---

![Stability: Experimental](https://img.shields.io/badge/stability-Experimental-important.svg?style=for-the-badge)

> **This is a _developer preview_ (public beta) library.**
>
> All modules are under active development and subject to non-backward compatible changes or removal in any
> future version. These are not subject to the [Semantic Versioning](https://semver.org/) model.
> This means that while you may use them, you may need to update your source code when upgrading to a newer version of this package.

---
<!--END STABILITY BANNER-->

| **API Reference**:| <span style="font-weight: normal">http://docs.awssolutionsbuilder.com/aws-solutions-konstruk/latest/</span>|
|:-------------|:-------------|
<div style="height:8px"></div>

The AWS Solutions Konstruk Library (Konstruk) is an open-source extension of the AWS Cloud Development Kit (AWS CDK) that provides multi-service, well-architected patterns for quickly defining solutions in code to create predictable and repeatable infrastructure. Konstruk's goal is to accelerates the experience for developers to build solutions of any size using pattern-based definitions for their architecture.

The patterns defined in Konstruk are high level, multi-service abstractions of AWS CDK constructs that have default configurations based on well-architected best practices. The library is organized into logical modules using object-oriented techniques to create each architectural pattern model. 

The CDK is available in the following languages:

* JavaScript, TypeScript (Node.js ≥ 10.3.0)
* Python (Python ≥ 3.6)

## Modules

The Konstruk library is organized into several modules. They are named like this:

* __aws-xxx__: well architected pattern package for the indicated services. This package will contain constructs that contain multiple AWS CDK service modules to configure the given pattern.
* __xxx__: packages that don't start "aws-" are Konstruk core modules that are used to configure best practice defaults for services used within the pattern library.

## Module Contents

Modules contain the following types:

* __Patterns__ - All higher-level, multi-services constructs in this library.
* __Other Types__ - All non-construct classes, interfaces, structs and enums that exist to support the patterns.

Patterns take a set of (input) properties in their constructor; the set of properties (and which ones are required) can be seen on a pattern's documentation page.

The pattern's documentation page also lists the available methods to call and the properties which can be used to retrieve information about the pattern after it has been instantiated.

## Sample Use Cases

This library includes a collection of functional use case implementations to demonstrate the usage of Konstruk architectural patterns. These can be used in the same way as architectural patterns, and can be conceptualized as an additional "higher-level" abstraction of those patterns. The following use cases are provided as functional examples:

* __aws-s3-static-website__ - implements an Amazon CloudFront distribution, Amazon S3 bucket and AWS Lambda-based custom resource to copy the static website content for the Wild Rydes demo website (part of the aws-serverless-web-app implementation).
  * Use case pattern: https://github.com/awslabs/aws-solutions-konstruk/source/use_cases/aws-s3-static-website
* __aws-serverless-image-handler__ - implements an Amazon CloudFront distribution, an Amazon API Gateway REST API, an AWS Lambda function, and necessary permissions/logic to provision a functional image handler API for serving image content from  one or more Amazon S3 buckets within the deployment account.
  * Use case pattern: https://github.com/awslabs/aws-solutions-konstruk/source/use_cases/aws-serverless-image-handler
* __aws-serverless-web-app__ - implements a simple serverless web application that enables users to request unicorn rides from the Wild Rydes fleet. The application will present users with an HTML based user interface for indicating the location where they would like to be picked up and will interface on the backend with a RESTful web service to submit the request and dispatch a nearby unicorn. The application will also provide facilities for users to register with the service and log in before requesting rides.
  * Use case pattern: https://github.com/awslabs/aws-solutions-konstruk/source/use_cases/aws-serverless-web-app

***
&copy; Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.