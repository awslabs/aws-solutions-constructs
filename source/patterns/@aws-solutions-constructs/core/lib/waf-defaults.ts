/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

/*
 *  The functions found here in the core library are for internal use and can be changed
 *  or removed outside of a major release. We recommend against calling them directly from client code.
 */

import * as waf from "aws-cdk-lib/aws-wafv2";

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function DefaultWafRules(): waf.CfnRuleGroup.RuleProperty[] {
  return [
    wrapManagedRuleSet("AWSManagedRulesBotControlRuleSet", "AWS", 0),
    wrapManagedRuleSet("AWSManagedRulesKnownBadInputsRuleSet", "AWS", 1),
    wrapManagedRuleSet("AWSManagedRulesCommonRuleSet", "AWS", 2),
    wrapManagedRuleSet("AWSManagedRulesAnonymousIpList", "AWS", 3),
    wrapManagedRuleSet("AWSManagedRulesAmazonIpReputationList", "AWS", 4),
    wrapManagedRuleSet("AWSManagedRulesAdminProtectionRuleSet", "AWS", 5),
    wrapManagedRuleSet("AWSManagedRulesSQLiRuleSet", "AWS", 6)
  ] as waf.CfnWebACL.RuleProperty[];
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function wrapManagedRuleSet(managedGroupName: string, vendorName: string, priority: number) {
  return {
    name: `${vendorName}-${managedGroupName}`,
    priority,
    overrideAction: { none: {} },
    statement: {
      managedRuleGroupStatement: {
        name: managedGroupName,
        vendorName,
      }
    },
    visibilityConfig: {
      cloudWatchMetricsEnabled: true,
      metricName: managedGroupName,
      sampledRequestsEnabled: true
    }
  } as waf.CfnRuleGroup.RuleProperty;
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function DefaultWafwebaclProps(webaclScope: string) {
  return {
    defaultAction: {
      allow: {}
    },
    scope: webaclScope,
    visibilityConfig: {
      cloudWatchMetricsEnabled: true,
      metricName: 'webACL',
      sampledRequestsEnabled: true
    },
    rules: DefaultWafRules()
  };
}