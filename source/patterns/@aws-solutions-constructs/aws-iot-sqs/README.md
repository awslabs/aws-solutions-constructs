# aws-iot-sqs module
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
|![Python Logo](https://docs.aws.amazon.com/cdk/api/latest/img/python32.png) Python|`aws_solutions_constructs.aws_iot_sqs`|
|![Typescript Logo](https://docs.aws.amazon.com/cdk/api/latest/img/typescript32.png) Typescript|`@aws-solutions-constructs/aws-iot-sqs`|
|![Java Logo](https://docs.aws.amazon.com/cdk/api/latest/img/java32.png) Java|`software.amazon.awsconstructs.services.iotsqs`|

This AWS Solutions Construct implements an AWS IoT MQTT topic rule and an AWS SQS Queue pattern.

Here is a minimal deployable pattern definition:

Typescript
``` typescript
import { IotToSqsProps, IotToSqs } from '@aws-solutions-constructs/aws-iot-sqs';

const props: IotToSqsProps = {
    iotTopicRuleProps: {
        topicRulePayload: {
            ruleDisabled: false,
            description: "Testing the IotToSqs Pattern",
            sql: "SELECT * FROM 'iot/sqs/#'",
            actions: []
        }
    }
};

new IotToSqs(this, 'test-iot-sqs-integration', props);
```

Python
``` python
from aws_solutions_constructs.aws_iot_sqs import IotToSqsProps, IotToSqs
from aws_cdk import (
    aws_iot as iot,
)
props = IotToSqsProps(
    iot_topic_rule_props=iot.CfnTopicRuleProps(
        topic_rule_payload=iot.CfnTopicRule.TopicRulePayloadProperty(
            rule_disabled=False,
            description="Testing the IotToSqs Pattern",
            sql="SELECT * FROM 'iot/sqs/#'",
            actions=[]
        )
    )
)

IotToSqs(self, 'test_iot_sqs', props)
```

Java
``` java
import software.amazon.awsconstructs.services.iotsqs.*;
import software.amazon.awscdk.services.iot.*;

new IotToSqs(this, "test_iot_sqs", new IotToSqsProps.Builder()
    .iotTopicRuleProps(new CfnTopicRuleProps.Builder()
        .topicRulePayload(new TopicRulePayloadProperty.Builder()
            .ruleDisabled(false)
            .description("Testing the IotToSqs Pattern")
            .sql("SELECT * FROM 'iot/sqs/#'")
            .actions(List.of())
            .build())
        .build())
    .build());
```

## Pattern Construct Props

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|iotTopicRuleProps|[`iot.CfnTopicRuleProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-iot.CfnTopicRuleProps.html)|User provided CfnTopicRuleProps to override the defaults|
|existingQueueObj?|[`sqs.Queue`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sqs.Queue.html)|Existing instance of SQS queue object, providing both this and `queueProps` will cause an error.|
|queueProps?|[`sqs.QueueProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sqs.QueueProps.html)|User provided props to override the default props for the SQS queue.|
|deadLetterQueueProps?|[`sqs.QueueProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sqs.QueueProps.html)|Optional user provided properties for the dead letter queue.|
|deployDeadLetterQueue?|`boolean`|Whether to deploy a secondary queue to be used as a dead letter queue. Default `true`.|
|maxReceiveCount?|`number`|The number of times a message can be unsuccessfully dequeued before being moved to the dead-letter queue. Required field if `deployDeadLetterQueue`=`true`.|
|enableEncryptionWithCustomerManagedKey?|`boolean`|Use a KMS Key, either managed by this CDK app, or imported. If importing an encryption key, it must be specified in the `encryptionKey` property for this construct.|
|encryptionKey?|[`kms.Key`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-kms.Key.html)|An optional, imported encryption key to encrypt the SQS queue.|
|encryptionKeyProps?|[`kms.KeyProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-kms.KeyProps.html)|Optional user-provided props to override the default props for the encryption key.|


## Pattern Properties

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|encryptionKey?|[`kms.Key`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-kms.Key.html)|Returns an instance of `kms.Key` used for the SQS queue.|
|iotActionsRole|[`iam.Role`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-iam.Role.html)|Returns an instance of `iam.Role` created by the construct, which allows IoT to publish messages to the SQS Queue|
|sqsQueue|[`sqs.Queue`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sqs.Queue.html)|Returns an instance of `sqs.Queue` created by the construct|
|deadLetterQueue?|[`sqs.Queue`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sqs.Queue.html)|Returns an instance of the dead-letter SQS queue created by the pattern.|
|iotTopicRule|[`iot.CfnTopicRule`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-iot.CfnTopicRule.html)|Returns an instance of `iot.CfnTopicRule` created by the construct|

## Default settings

Out of the box implementation of the Construct without any override will set the following defaults:

### Amazon IoT Rule
* Configure an IoT Rule to send messages to the SQS Queue

### Amazon IAM Role
* Configure least privilege access IAM role for Amazon IoT to be able to publish messages to the SQS Queue

### Amazon SQS Queue
* Deploy a dead-letter queue for the source queue.
* Enable server-side encryption for the source queue using a customer-managed AWS KMS key.
* Enforce encryption of data in transit.

## Architecture
![Architecture Diagram](architecture.png)

***
&copy; Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.