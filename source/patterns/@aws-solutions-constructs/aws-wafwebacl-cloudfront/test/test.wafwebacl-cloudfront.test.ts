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
import { WafwebaclToCloudFront } from "../lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as waf from "aws-cdk-lib/aws-wafv2";
import * as defaults from '@aws-solutions-constructs/core';
import { Match, Template } from 'aws-cdk-lib/assertions';

function deployConstruct(stack: cdk.Stack, constructProps?: waf.CfnWebACLProps | any) {
  const myBucket = new s3.Bucket(stack, 'myBucket', {
    removalPolicy: cdk.RemovalPolicy.DESTROY
  });

  const testCloudfrontDistribution = new cloudfront.Distribution(stack, 'myDist', {
    defaultBehavior: { origin: new origins.S3Origin(myBucket) },
  });

  const props = constructProps ?
    { webaclProps: constructProps, existingCloudFrontWebDistribution: testCloudfrontDistribution }
    : { existingCloudFrontWebDistribution: testCloudfrontDistribution };

  return new WafwebaclToCloudFront(stack, 'test-wafwebacl-cloudfront', props);
}

test('Confirm CheckWafWebAclProps is called', () => {
  const stack = new cdk.Stack();
  const props: waf.CfnWebACLProps = {
    defaultAction: {
      allow: {}
    },
    scope: 'CLOUDFRONT',
    visibilityConfig: {
      cloudWatchMetricsEnabled: false,
      metricName: 'webACL',
      sampledRequestsEnabled: true
    },
  };

  const myBucket = new s3.Bucket(stack, 'myBucket');
  const wafAcl = new waf.CfnWebACL(stack, 'test-waf', props);
  const testCloudfrontDistribution = new cloudfront.Distribution(stack, 'myDist', {
    defaultBehavior: { origin: new origins.S3Origin(myBucket) },
  });

  expect(() => {
    new WafwebaclToCloudFront(stack, 'test-waf-cloudfront', {
      existingCloudFrontWebDistribution: testCloudfrontDistribution,
      existingWebaclObj: wafAcl,
      webaclProps: props
    });
  }).toThrowError('Error - Either provide existingWebaclObj or webaclProps, but not both.\n');
});

test('Test default deployment', () => {
  const stack = new cdk.Stack();
  const construct = deployConstruct(stack);

  expect(construct.webacl).toBeDefined();
  expect(construct.cloudFrontWebDistribution).toBeDefined();

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::WAFv2::WebACL", {
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
});

test('Test user provided acl props', () => {
  const stack = new cdk.Stack();
  const webaclProps: waf.CfnWebACLProps =  {
    defaultAction: {
      allow: {}
    },
    scope: 'CLOUDFRONT',
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

  deployConstruct(stack, webaclProps);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::WAFv2::WebACL", {
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

test('Test user provided partial acl props', () => {
  const stack = new cdk.Stack();
  const testName = 'test-name';

  const webaclProps =  {
    name: testName
  };

  deployConstruct(stack, webaclProps);

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::WAFv2::WebACL", {
    Name: testName
  });
});

test('Test existing web ACL', () => {
  const stack = new cdk.Stack();
  const webacl: waf.CfnWebACL =  new waf.CfnWebACL(stack, 'test-webacl', {
    defaultAction: {
      allow: {}
    },
    scope: 'CLOUDFRONT',
    visibilityConfig: {
      cloudWatchMetricsEnabled: true,
      metricName: 'webACL',
      sampledRequestsEnabled: true
    },
  });

  const myBucket = new s3.Bucket(stack, 'myBucket');
  const testCloudfrontDistribution = new cloudfront.Distribution(stack, 'myDist', {
    defaultBehavior: { origin: new origins.S3Origin(myBucket) },
  });

  new WafwebaclToCloudFront(stack, 'test-wafwebacl-cloudfront', {
    existingWebaclObj: webacl,
    existingCloudFrontWebDistribution: testCloudfrontDistribution
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::WAFv2::WebACL", {
    VisibilityConfig: {
      CloudWatchMetricsEnabled: true,
      MetricName: "webACL",
      SampledRequestsEnabled: true
    }
  });

  template.resourceCountIs("AWS::WAFv2::WebACL", 1);
});

test('Test defaultaction block', () => {
  const stack = new cdk.Stack();
  const webaclProps: waf.CfnWebACLProps =  {
    defaultAction: {
      block: {}
    },
    scope: 'CLOUDFRONT',
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

  deployConstruct(stack, webaclProps);

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
