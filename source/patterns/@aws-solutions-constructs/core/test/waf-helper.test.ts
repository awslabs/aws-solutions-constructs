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

import { Stack } from 'aws-cdk-lib';
import * as waf from "aws-cdk-lib/aws-wafv2";
import * as defaults from '..';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { buildWebacl } from '..';

test('Test construct with default props', () => {
  // Stack
  const stack = new Stack();
  // Build WAF web ACL
  defaults.buildWebacl(stack, 'REGIONAL', {});

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::WAFv2::WebACL", {
    Scope: "REGIONAL",
    VisibilityConfig: {
      CloudWatchMetricsEnabled: true,
      MetricName: "webACL",
      SampledRequestsEnabled: true
    },
    Rules: [
      {
        Name: "AWS-AWSManagedRulesBotControlRuleSet",
        OverrideAction: {
          None: {}
        },
        Priority: 0,
        Statement: {
          ManagedRuleGroupStatement: {
            Name: "AWSManagedRulesBotControlRuleSet",
            VendorName: "AWS"
          }
        },
        VisibilityConfig: {
          CloudWatchMetricsEnabled: true,
          MetricName: "AWSManagedRulesBotControlRuleSet",
          SampledRequestsEnabled: true
        }
      },
      {
        Name: "AWS-AWSManagedRulesKnownBadInputsRuleSet",
        OverrideAction: {
          None: {}
        },
        Priority: 1,
        Statement: {
          ManagedRuleGroupStatement: {
            Name: "AWSManagedRulesKnownBadInputsRuleSet",
            VendorName: "AWS"
          }
        },
        VisibilityConfig: {
          CloudWatchMetricsEnabled: true,
          MetricName: "AWSManagedRulesKnownBadInputsRuleSet",
          SampledRequestsEnabled: true
        }
      },
      {
        Name: "AWS-AWSManagedRulesCommonRuleSet",
        OverrideAction: {
          None: {}
        },
        Priority: 2,
        Statement: {
          ManagedRuleGroupStatement: {
            Name: "AWSManagedRulesCommonRuleSet",
            VendorName: "AWS"
          }
        },
        VisibilityConfig: {
          CloudWatchMetricsEnabled: true,
          MetricName: "AWSManagedRulesCommonRuleSet",
          SampledRequestsEnabled: true
        }
      },
      {
        Name: "AWS-AWSManagedRulesAnonymousIpList",
        OverrideAction: {
          None: {}
        },
        Priority: 3,
        Statement: {
          ManagedRuleGroupStatement: {
            Name: "AWSManagedRulesAnonymousIpList",
            VendorName: "AWS"
          }
        },
        VisibilityConfig: {
          CloudWatchMetricsEnabled: true,
          MetricName: "AWSManagedRulesAnonymousIpList",
          SampledRequestsEnabled: true
        }
      },
      {
        Name: "AWS-AWSManagedRulesAmazonIpReputationList",
        OverrideAction: {
          None: {}
        },
        Priority: 4,
        Statement: {
          ManagedRuleGroupStatement: {
            Name: "AWSManagedRulesAmazonIpReputationList",
            VendorName: "AWS"
          }
        },
        VisibilityConfig: {
          CloudWatchMetricsEnabled: true,
          MetricName: "AWSManagedRulesAmazonIpReputationList",
          SampledRequestsEnabled: true
        }
      },
      {
        Name: "AWS-AWSManagedRulesAdminProtectionRuleSet",
        OverrideAction: {
          None: {}
        },
        Priority: 5,
        Statement: {
          ManagedRuleGroupStatement: {
            Name: "AWSManagedRulesAdminProtectionRuleSet",
            VendorName: "AWS"
          }
        },
        VisibilityConfig: {
          CloudWatchMetricsEnabled: true,
          MetricName: "AWSManagedRulesAdminProtectionRuleSet",
          SampledRequestsEnabled: true
        }
      },
      {
        Name: "AWS-AWSManagedRulesSQLiRuleSet",
        OverrideAction: {
          None: {}
        },
        Priority: 6,
        Statement: {
          ManagedRuleGroupStatement: {
            Name: "AWSManagedRulesSQLiRuleSet",
            VendorName: "AWS"
          }
        },
        VisibilityConfig: {
          CloudWatchMetricsEnabled: true,
          MetricName: "AWSManagedRulesSQLiRuleSet",
          SampledRequestsEnabled: true
        }
      }
    ]
  });

  template.resourceCountIs('AWS::WAFv2::WebACL', 1);
  template.resourceCountIs('AWS::WAFv2::WebACLAssociation', 0);
});

test('Test deployment w/ user provided custom properties', () => {
  // Stack
  const stack = new Stack();

  // Build WAF web ACL
  const props: waf.CfnWebACLProps = {
    scope: 'CLOUDFRONT',
    defaultAction: {
      allow: {}
    },
    visibilityConfig: {
      cloudWatchMetricsEnabled: false,
      metricName: 'webACL',
      sampledRequestsEnabled: true
    },
    rules: [
      defaults.wrapManagedRuleSet("AWSManagedRulesCommonRuleSet", "AWS", 0),
      defaults.wrapManagedRuleSet("AWSManagedRulesWordPressRuleSet", "AWS", 1),
    ]
  };

  defaults.buildWebacl(stack, 'CLOUDFRONT', {
    webaclProps: props
  });

  Template.fromStack(stack).hasResourceProperties("AWS::WAFv2::WebACL", {
    Scope: "CLOUDFRONT",
    VisibilityConfig: {
      CloudWatchMetricsEnabled: false,
      MetricName: "webACL",
      SampledRequestsEnabled: true
    },
    Rules: [
      {
        Name: "AWS-AWSManagedRulesCommonRuleSet",
        OverrideAction: {
          None: {}
        },
        Priority: 0,
        Statement: {
          ManagedRuleGroupStatement: {
            Name: "AWSManagedRulesCommonRuleSet",
            VendorName: "AWS"
          }
        },
        VisibilityConfig: {
          CloudWatchMetricsEnabled: true,
          MetricName: "AWSManagedRulesCommonRuleSet",
          SampledRequestsEnabled: true
        }
      },
      {
        Name: "AWS-AWSManagedRulesWordPressRuleSet",
        OverrideAction: {
          None: {}
        },
        Priority: 1,
        Statement: {
          ManagedRuleGroupStatement: {
            Name: "AWSManagedRulesWordPressRuleSet",
            VendorName: "AWS"
          }
        },
        VisibilityConfig: {
          CloudWatchMetricsEnabled: true,
          MetricName: "AWSManagedRulesWordPressRuleSet",
          SampledRequestsEnabled: true
        }
      }
    ]
  });
});

test('Test deployment w/ user provided partial custom properties', () => {
  // Stack
  const stack = new Stack();
  const testName = 'test-name';
  // Build WAF web ACL
  const props = {
    name: testName
  };

  defaults.buildWebacl(stack, 'CLOUDFRONT', {
    webaclProps: props
  });

  Template.fromStack(stack).hasResourceProperties("AWS::WAFv2::WebACL", {
    Name: testName
  });
});

test('Test deployment w/ existing WAF web ACL provided', () => {
  // Stack
  const stack = new Stack();
  // Build WAF web ACL
  const testWaf = buildWebacl(stack, 'CLOUDFRONT', {});
  const newWaf = defaults.buildWebacl(stack, 'CLOUDFRONT', {
    existingWebaclObj: testWaf
  });

  expect(newWaf).toBe(testWaf);
});

// ---------------------------
// Prop Tests
// ---------------------------
test('Test WebACL bad props', () => {
  const stack = new Stack();
  const wafProps: waf.CfnWebACLProps = {
    scope: 'CLOUDFRONT',
    defaultAction: {
      allow: {}
    },
    visibilityConfig: {
      cloudWatchMetricsEnabled: false,
      metricName: 'webACL',
      sampledRequestsEnabled: true
    },
    rules: [
      defaults.wrapManagedRuleSet("AWSManagedRulesCommonRuleSet", "AWS", 0),
      defaults.wrapManagedRuleSet("AWSManagedRulesWordPressRuleSet", "AWS", 1),
    ]
  };

  const wafPropsTwo: waf.CfnWebACLProps = {
    scope: 'CLOUDFRONT',
    defaultAction: {
      allow: {}
    },
    visibilityConfig: {
      cloudWatchMetricsEnabled: false,
      metricName: 'webACL',
      sampledRequestsEnabled: true
    },
    rules: [
      defaults.wrapManagedRuleSet("AWSManagedRulesCommonRuleSet", "AWS", 0),
      defaults.wrapManagedRuleSet("AWSManagedRulesWordPressRuleSet", "AWS", 1),
    ]
  };

  const acl: waf.CfnWebACL = new waf.CfnWebACL(stack, 'test',  wafProps);

  const props: defaults.WafWebAclProps = {
    existingWebaclObj: acl,
    webaclProps: wafPropsTwo,
  };

  const app = () => {
    defaults.CheckWafWebAclProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide existingWebaclObj or webaclProps, but not both.\n');
});


test('Test defaultaction block', () => {

  const stack = new Stack();

  // Build WAF web ACL
  const propsWithBlock: waf.CfnWebACLProps = {
    scope: 'CLOUDFRONT',
    defaultAction: {
      block: {}
    },
    visibilityConfig: {
      cloudWatchMetricsEnabled: false,
      metricName: 'webACL',
      sampledRequestsEnabled: true
    },
    rules: [
      defaults.wrapManagedRuleSet("AWSManagedRulesCommonRuleSet", "AWS", 0),
      defaults.wrapManagedRuleSet("AWSManagedRulesWordPressRuleSet", "AWS", 1),
    ]
  };

  defaults.buildWebacl(stack, 'CLOUDFRONT', {
    webaclProps: propsWithBlock
  });


  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::WAFv2::WebACL", {
    DefaultAction: {
      Block: {}
    },
  });

  // The following will throw an assertion error
  template.hasResourceProperties("AWS::WAFv2::WebACL", {
    DefaultAction: Match.objectLike({
      Allow: Match.absent()
    }),
  });
});
