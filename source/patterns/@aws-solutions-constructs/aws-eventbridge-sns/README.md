# aws-eventbridge-sns module
<!--BEGIN STABILITY BANNER-->

---

![Stability: Stable](https://img.shields.io/badge/cfn--resources-stable-success.svg?style=for-the-badge)

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
|![Python Logo](https://docs.aws.amazon.com/cdk/api/latest/img/python32.png) Python|`aws_solutions_constructs.aws_eventbridge_sns`|
|![Typescript Logo](https://docs.aws.amazon.com/cdk/api/latest/img/typescript32.png) Typescript|`@aws-solutions-constructs/aws-eventbridge-sns`|
|![Java Logo](https://docs.aws.amazon.com/cdk/api/latest/img/java32.png) Java|`software.amazon.awsconstructs.services.eventbridgesns`|

This AWS Solutions Construct implements an AWS Events rule and an AWS SNS Topic.

Here is a minimal deployable pattern definition in Typescript:

``` typescript
import { Duration } from '@aws-cdk/core';
import * as events from '@aws-cdk/aws-events';
import * as iam from '@aws-cdk/aws-iam';
import { EventbridgeToSnsProps, EventbridgeToSns } from "@aws-solutions-constructs/aws-eventbridge-sns";

const props: EventbridgeToSnsProps = {
    eventRuleProps: {
      schedule: events.Schedule.rate(Duration.minutes(5)),
    }
};

const constructStack = new EventbridgeToSns(this, 'test-construct', props);

// Grant yourself permissions to use the Customer Managed KMS Key
const policyStatement = new iam.PolicyStatement({
    actions: ["kms:Encrypt", "kms:Decrypt"],
    effect: iam.Effect.ALLOW,
    principals: [ new iam.AccountRootPrincipal() ],
    resources: [ "*" ]
});

constructStack.encryptionKey?.addToResourcePolicy(policyStatement);
```

## Initializer

``` text
new EventbridgeToSns(scope: Construct, id: string, props: EventbridgeToSnsProps);
```

_Parameters_

* scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.Construct.html)
* id `string`
* props [`EventbridgeToSnsProps`](#pattern-construct-props)

## Pattern Construct Props

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|eventRuleProps|[`events.RuleProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-events.RuleProps.html)|User provided eventRuleProps to override the defaults. |
|existingTopicObj?|[`sns.Topic`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.Function.html)|Existing instance of SNS Topic object, providing both this and `topicProps` will cause an error.|
|topicProps?|[`sns.TopicProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sns.TopicProps.html)|User provided props to override the default props for the SNS Topic. |
|existingEventBusInterface?|[`events.IEventBus`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-events.IEventBus.html)| Optional user-provided custom EventBus for construct to use. Providing both this and `eventBusProps` results an error.|
|eventBusProps?|[`events.EventBusProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-events.EventBusProps.html)|Optional user-provided properties to override the default properties when creating a custom EventBus. Setting this value to `{}` will create a custom EventBus using all default properties. If neither this nor `existingEventBusInterface` is provided the construct will use the `default` EventBus. Providing both this and `existingEventBusInterface` results an error.|
|enableEncryptionWithCustomerManagedKey?|`boolean`|Use a KMS Key, either managed by this CDK app, or imported. If importing an encryption key, it must be specified in the encryptionKey property for this construct.|
|encryptionKey?|[`kms.Key`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-kms.Key.html)|An optional, imported encryption key to encrypt the SNS Topic.|
|encryptionKeyProps?|[`kms.KeyProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-kms.KeyProps.html)|An optional, user provided properties to override the default properties for the KMS encryption key.|

## Pattern Properties

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|eventBus?|[`events.IEventBus`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-events.IEventBus.html)|Returns the instance of events.IEventBus used by the construct|
|eventsRule|[`events.Rule`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-events.Rule.html)|Returns an instance of events.Rule created by the construct|
|snsTopic|[`sns.Topic`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sns.Topic.html)|Returns an instance of sns.Topic created by the construct|
|encryptionKey?|[`kms.Key`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-kms.Key.html)|Returns an instance of kms Key used for the SNS Topic.|

## Default settings

Out of the box implementation of the Construct without any override will set the following defaults:

### Amazon EventBridge Rule
* Grant least privilege permissions to EventBridge Rule to publish to the SNS Topic.

### Amazon SNS Topic
* Configure least privilege access permissions for SNS Topic.
* Enable server-side encryption forSNS Topic using Customer managed KMS Key.
* Enforce encryption of data in transit.

## Architecture
![Architecture Diagram](architecture.png)

***
&copy; Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
