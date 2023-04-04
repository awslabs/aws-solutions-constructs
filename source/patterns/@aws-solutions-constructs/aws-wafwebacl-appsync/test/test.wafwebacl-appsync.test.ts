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

// Imports
import * as cdk from "aws-cdk-lib";
import { WafwebaclToAppsync } from "../lib";
import * as waf from "aws-cdk-lib/aws-wafv2";
import * as defaults from "@aws-solutions-constructs/core";
import * as appsync from "aws-cdk-lib/aws-appsync";
import { Template } from "aws-cdk-lib/assertions";

function deployAppsyncGraphqlApi(stack: cdk.Stack) {
  return new appsync.CfnGraphQLApi(stack, "new-api", {
    name: "api",
    authenticationType: "API_KEY",
  });
}

function deployConstruct(
  stack: cdk.Stack,
  webaclProps?: waf.CfnWebACLProps | any,
  existingWebaclObj?: waf.CfnWebACL
) {
  const api = deployAppsyncGraphqlApi(stack);

  return new WafwebaclToAppsync(stack, "test-waf-appsync", {
    existingAppsyncApi: api,
    webaclProps,
    existingWebaclObj,
  });
}

// --------------------------------------------------------------
// Test error handling for existing WAF web ACL and user provided web ACL props
// --------------------------------------------------------------
test("Test error handling for existing WAF web ACL and user provider web ACL props", () => {
  const stack = new cdk.Stack();
  const props: waf.CfnWebACLProps = {
    defaultAction: {
      allow: {},
    },
    scope: "REGIONAL",
    visibilityConfig: {
      cloudWatchMetricsEnabled: false,
      metricName: "webACL",
      sampledRequestsEnabled: true,
    },
  };

  const wafAcl = new waf.CfnWebACL(stack, "test-waf", props);
  const api = deployAppsyncGraphqlApi(stack);

  expect(() => {
    new WafwebaclToAppsync(stack, "test-waf-appsync", {
      existingAppsyncApi: api,
      existingWebaclObj: wafAcl,
      webaclProps: props,
    });
  }).toThrowError();
});

// --------------------------------------------------------------
// Test default deployment
// --------------------------------------------------------------
test("Test default deployment", () => {
  const stack = new cdk.Stack();
  const construct = deployConstruct(stack);

  expect(construct.webacl !== null);
  expect(construct.appsyncApi !== null);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::WAFv2::WebACL", {
    Rules: [
      {
        Name: "AWS-AWSManagedRulesBotControlRuleSet",
        OverrideAction: {
          None: {},
        },
        Priority: 0,
        Statement: {
          ManagedRuleGroupStatement: {
            Name: "AWSManagedRulesBotControlRuleSet",
            VendorName: "AWS",
          },
        },
        VisibilityConfig: {
          CloudWatchMetricsEnabled: true,
          MetricName: "AWSManagedRulesBotControlRuleSet",
          SampledRequestsEnabled: true,
        },
      },
      {
        Name: "AWS-AWSManagedRulesKnownBadInputsRuleSet",
        OverrideAction: {
          None: {},
        },
        Priority: 1,
        Statement: {
          ManagedRuleGroupStatement: {
            Name: "AWSManagedRulesKnownBadInputsRuleSet",
            VendorName: "AWS",
          },
        },
        VisibilityConfig: {
          CloudWatchMetricsEnabled: true,
          MetricName: "AWSManagedRulesKnownBadInputsRuleSet",
          SampledRequestsEnabled: true,
        },
      },
      {
        Name: "AWS-AWSManagedRulesCommonRuleSet",
        OverrideAction: {
          None: {},
        },
        Priority: 2,
        Statement: {
          ManagedRuleGroupStatement: {
            Name: "AWSManagedRulesCommonRuleSet",
            VendorName: "AWS",
          },
        },
        VisibilityConfig: {
          CloudWatchMetricsEnabled: true,
          MetricName: "AWSManagedRulesCommonRuleSet",
          SampledRequestsEnabled: true,
        },
      },
      {
        Name: "AWS-AWSManagedRulesAnonymousIpList",
        OverrideAction: {
          None: {},
        },
        Priority: 3,
        Statement: {
          ManagedRuleGroupStatement: {
            Name: "AWSManagedRulesAnonymousIpList",
            VendorName: "AWS",
          },
        },
        VisibilityConfig: {
          CloudWatchMetricsEnabled: true,
          MetricName: "AWSManagedRulesAnonymousIpList",
          SampledRequestsEnabled: true,
        },
      },
      {
        Name: "AWS-AWSManagedRulesAmazonIpReputationList",
        OverrideAction: {
          None: {},
        },
        Priority: 4,
        Statement: {
          ManagedRuleGroupStatement: {
            Name: "AWSManagedRulesAmazonIpReputationList",
            VendorName: "AWS",
          },
        },
        VisibilityConfig: {
          CloudWatchMetricsEnabled: true,
          MetricName: "AWSManagedRulesAmazonIpReputationList",
          SampledRequestsEnabled: true,
        },
      },
      {
        Name: "AWS-AWSManagedRulesAdminProtectionRuleSet",
        OverrideAction: {
          None: {},
        },
        Priority: 5,
        Statement: {
          ManagedRuleGroupStatement: {
            Name: "AWSManagedRulesAdminProtectionRuleSet",
            VendorName: "AWS",
          },
        },
        VisibilityConfig: {
          CloudWatchMetricsEnabled: true,
          MetricName: "AWSManagedRulesAdminProtectionRuleSet",
          SampledRequestsEnabled: true,
        },
      },
      {
        Name: "AWS-AWSManagedRulesSQLiRuleSet",
        OverrideAction: {
          None: {},
        },
        Priority: 6,
        Statement: {
          ManagedRuleGroupStatement: {
            Name: "AWSManagedRulesSQLiRuleSet",
            VendorName: "AWS",
          },
        },
        VisibilityConfig: {
          CloudWatchMetricsEnabled: true,
          MetricName: "AWSManagedRulesSQLiRuleSet",
          SampledRequestsEnabled: true,
        },
      },
    ],
  });
});

test("Test user provided acl props", () => {
  const stack = new cdk.Stack();
  const webaclProps: waf.CfnWebACLProps = {
    defaultAction: {
      allow: {},
    },
    scope: "REGIONAL",
    visibilityConfig: {
      cloudWatchMetricsEnabled: false,
      metricName: "webACL",
      sampledRequestsEnabled: true,
    },
    rules: [
      defaults.wrapManagedRuleSet("AWSManagedRulesCommonRuleSet", "AWS", 0),
      defaults.wrapManagedRuleSet("AWSManagedRulesWordPressRuleSet", "AWS", 1),
    ],
  };

  deployConstruct(stack, webaclProps);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::WAFv2::WebACL", {
    VisibilityConfig: {
      CloudWatchMetricsEnabled: false,
      MetricName: "webACL",
      SampledRequestsEnabled: true,
    },
    Rules: [
      {
        Name: "AWS-AWSManagedRulesCommonRuleSet",
        OverrideAction: {
          None: {},
        },
        Priority: 0,
        Statement: {
          ManagedRuleGroupStatement: {
            Name: "AWSManagedRulesCommonRuleSet",
            VendorName: "AWS",
          },
        },
        VisibilityConfig: {
          CloudWatchMetricsEnabled: true,
          MetricName: "AWSManagedRulesCommonRuleSet",
          SampledRequestsEnabled: true,
        },
      },
      {
        Name: "AWS-AWSManagedRulesWordPressRuleSet",
        OverrideAction: {
          None: {},
        },
        Priority: 1,
        Statement: {
          ManagedRuleGroupStatement: {
            Name: "AWSManagedRulesWordPressRuleSet",
            VendorName: "AWS",
          },
        },
        VisibilityConfig: {
          CloudWatchMetricsEnabled: true,
          MetricName: "AWSManagedRulesWordPressRuleSet",
          SampledRequestsEnabled: true,
        },
      },
    ],
  });
});

test("Test user provided partial acl props", () => {
  const stack = new cdk.Stack();
  const testName = 'test-name';
  const webaclProps = {
    name: testName
  };

  deployConstruct(stack, webaclProps);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::WAFv2::WebACL", {
    Name: testName
  });
});

// --------------------------------------------------------------
// Test existing web ACL
// --------------------------------------------------------------
test("Test existing web ACL", () => {
  const stack = new cdk.Stack();
  const webacl: waf.CfnWebACL = new waf.CfnWebACL(stack, "test-webacl", {
    defaultAction: {
      allow: {},
    },
    scope: "REGIONAL",
    visibilityConfig: {
      cloudWatchMetricsEnabled: true,
      metricName: "webACL",
      sampledRequestsEnabled: true,
    },
  });

  deployConstruct(stack, undefined, webacl);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::WAFv2::WebACL", {
    VisibilityConfig: {
      CloudWatchMetricsEnabled: true,
      MetricName: "webACL",
      SampledRequestsEnabled: true,
    },
  });

  template.resourceCountIs("AWS::WAFv2::WebACL", 1);
});
