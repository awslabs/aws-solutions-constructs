# aws-wafwebacl-alb module
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
|![Python Logo](https://docs.aws.amazon.com/cdk/api/latest/img/python32.png) Python|`aws_solutions_constructs.aws_wafwebacl_alb`|
|![Typescript Logo](https://docs.aws.amazon.com/cdk/api/latest/img/typescript32.png) Typescript|`@aws-solutions-constructs/aws-wafwebacl-alb`|
|![Java Logo](https://docs.aws.amazon.com/cdk/api/latest/img/java32.png) Java|`software.amazon.awsconstructs.services.wafwebaclalb`|

## Overview
This AWS Solutions Construct implements an AWS WAF web ACL connected to an Application Load Balancer.

Here is a minimal deployable pattern definition in Typescript:

``` typescript
import { Route53ToAlb } from '@aws-solutions-constructs/aws-route53-alb';
import { WafwebaclToAlbProps, WafwebaclToAlb } from "@aws-solutions-constructs/aws-wafwebacl-alb";

const r53ToAlb = new Route53ToAlb(this, 'Route53ToAlbPattern', {
  privateHostedZoneProps: {
    zoneName: 'www.example.com',
  }
  publicApi: false,
});

// This construct can only be attached to a configured Application Load Balancer.
new WafwebaclToAlb(this, 'test-wafwebacl-alb', {
    existingLoadBalancerObj: r53ToAlb.loadBalancer
});
```

## Initializer

``` text
new WafwebaclToAlb(scope: Construct, id: string, props: WafwebaclToAlbProps);
```

_Parameters_

* scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.Construct.html)
* id `string`
* props [`WafwebaclToAlbProps`](#pattern-construct-props)

## Pattern Construct Props

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|existingLoadBalancerObj|[`elbv2.ApplicationLoadBalancer`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-elasticloadbalancingv2.ApplicationLoadBalancer.html)|The existing Application Load Balancer Object that will be protected with the WAF web ACL. *Note that a WAF web ACL can only be added to a configured Application Load Balancer, so this construct only accepts an existing ApplicationLoadBalancer and does not accept applicationLoadBalancerProps.*|
|existingWebaclObj?|[`waf.CfnWebACL`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-waf.CfnWebACL.html)|Existing instance of a WAF web ACL, an error will occur if this and props is set.|
|webaclProps?|[`waf.CfnWebACLProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-waf.CfnWebACLProps.html)|Optional user-provided props to override the default props for the AWS WAF web ACL. To use a different collection of managed rule sets, specify a new rules property. Use our [`wrapManagedRuleSet(managedGroupName: string, vendorName: string, priority: number)`](../core/lib/waf-defaults.ts) function from core to create an array entry from each desired managed rule set.|

## Pattern Properties

| **Name**     | **Type**        | **Description** |
|:-------------|:----------------|-----------------|
|webacl|[`waf.CfnWebACL`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-waf.CfnWebACL.html)|Returns an instance of the waf.CfnWebACL created by the construct.|
|loadBalancer|[`elbv2.ApplicationLoadBalancer`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-elasticloadbalancingv2.ApplicationLoadBalancer.html)|Returns an instance of the Application Load Balancer Object created by the pattern. |

## Default settings

Out of the box implementation of the Construct without any override will set the following defaults:

### AWS WAF
* Deploy a WAF web ACL with 7 [AWS managed rule groups](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-list.html).
    * AWSManagedRulesBotControlRuleSet
    * AWSManagedRulesKnownBadInputsRuleSet
    * AWSManagedRulesCommonRuleSet
    * AWSManagedRulesAnonymousIpList
    * AWSManagedRulesAmazonIpReputationList
    * AWSManagedRulesAdminProtectionRuleSet
    * AWSManagedRulesSQLiRuleSet

    *Note that the default rules can be replaced by specifying the rules property of CfnWebACLProps*
* Send metrics to Amazon CloudWatch

### Application Load Balancer
* User provided Application Load Balancer object is used as-is

## Architecture
![Architecture Diagram](architecture.png)

***
&copy; Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
