# AWS Solutions Constructs

| **Browse Library**:| <span style="font-weight: normal">https://aws.amazon.com/solutions/constructs/patterns/</span>|
|:-------------|:-------------|
| **Reference Documentation**:| <span style="font-weight: normal">https://docs.aws.amazon.com/solutions/latest/constructs/</span>|

<div style="height:8px"></div>

Edit One

The AWS Solutions Constructs library is an open-source extension of the AWS Cloud Development Kit (AWS CDK) that provides multi-service, well-architected patterns for quickly defining solutions in code to create predictable and repeatable infrastructure. The goal of AWS Solutions Constructs is to accelerate the experience for developers to build solutions of any size using pattern-based definitions for their architecture.

The patterns defined in AWS Solutions Constructs are high level, multi-service abstractions of AWS CDK constructs that have default configurations based on well-architected best practices. The library is organized into logical modules using object-oriented techniques to create each architectural pattern model.

## CDK Versions

AWS Solutions Constructs and the AWS CDK are independent teams and have different release schedules. Each release of AWS Solutions Constructs is built against a specific version of the AWS CDK. The CHANGELOG.md file lists the CDK version associated with each AWS Solutions Constructs release. For instance, AWS Solutions Constructs v2.39.0 was built against AWS CDK v2.76.0. This means that to use AWS Solutions Constructs v2.39.0, your application must include AWS CDK v2.76.0 *or later*. You can continue to use the latest AWS CDK versions and upgrade the your AWS Solutions Constructs version when new releases become available.

## Modules

The AWS Solutions Constructs library is organized into several modules. They are named like this:

* __aws-xxx__: well architected pattern package for the indicated services. This package will contain constructs that contain multiple AWS CDK service modules to configure the given pattern.
* __xxx__: packages that don't start "aws-" are core modules that are used to configure best practice defaults for services used within the pattern library. They are not intended to be accessed directly.

## Module Contents

Modules contain the following types:

* __Patterns__ - All higher-level, multi-services constructs in this library.
* __Other Types__ - All non-construct classes, interfaces, structs and enums that exist to support the patterns.

Patterns take a set of (input) properties in their constructor; the set of properties (and which ones are required) can be seen on a pattern's documentation page.

The pattern's documentation page also lists the available methods to call and the properties which can be used to retrieve information about the pattern after it has been instantiated.

## Sample Use Cases

This library includes a collection of functional use case implementations to demonstrate the usage of AWS Solutions Constructs architectural patterns. These can be used in the same way as architectural patterns, and can be conceptualized as an additional "higher-level" abstraction of those patterns. The following use cases are provided as functional examples:

* __aws-custom-glue-etl__ - implements an example using the Kinesis Data Streams Glue Job construct. The application architecture uses a custom ETL job defined in AWS Glue that takes in data from Amazon Kinesis Data Streams to process and store it in the target datastore as defined by the ETL script (for this example an S3 bucket location).
  * Use case pattern: https://github.com/awslabs/aws-solutions-constructs/tree/main/source/use_cases/aws-custom-glue-etl
* __aws-s3-static-website__ - implements an Amazon CloudFront distribution, Amazon S3 bucket and AWS Lambda-based custom resource to copy the static website content for the Wild Rydes demo website (part of the aws-serverless-web-app implementation).
  * Use case pattern: https://github.com/awslabs/aws-solutions-constructs/tree/main/source/use_cases/aws-s3-static-website
* __aws-restaurant-management-demo__ - implements a complex, multi-stack architecture that models a restaurant management system. This use case will provision a stack for service/wait staff to open/close orders, a stack for kitchen staff to view/complete orders, and a stack for managers to perform various business functions. It will also provision a stack
containing a central DynamoDB table for managing orders, as well as a Lambda layer for sharing common database access patterns.
  * Use case pattern: https://github.com/awslabs/aws-solutions-constructs/tree/main/source/use_cases/aws-restaurant-management-demo

***
&copy; Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
