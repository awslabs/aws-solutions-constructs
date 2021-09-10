/**
 *  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import * as cdk from "@aws-cdk/core";
import { WafwebaclToApiGateway } from "../lib";
import * as lambda from '@aws-cdk/aws-lambda';
import * as waf from "@aws-cdk/aws-wafv2";
import * as defaults from '@aws-solutions-constructs/core';
import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';

function deploy(stack: cdk.Stack) {
  const inProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_10_X,
    handler: 'index.handler'
  };

  const func = defaults.deployLambdaFunction(stack, inProps);

  const [_api] = defaults.RegionalLambdaRestApi(stack, func);

  return new WafwebaclToApiGateway(stack, 'test-wafwebacl-apigateway', {
    existingApiGatewayInterface: _api
  });
}

function wrapManagedRuleSet(managedGroupName: string, vendorName: string, priority: number) {
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
  } as waf.CfnWebACL.RuleProperty;
}

// --------------------------------------------------------------
// Pattern deployment w/ new Lambda function and default properties
// --------------------------------------------------------------
test('Pattern deployment w/ new Lambda function and default props', () => {
  // Initial Setup
  const stack = new cdk.Stack();
  deploy(stack);
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

// --------------------------------------------------------------
// Test getter methods
// --------------------------------------------------------------
test('Check getter methods', () => {
  const stack = new cdk.Stack();
  const construct: WafwebaclToApiGateway = deploy(stack);

  expect(construct.webACL !== null);
  expect(construct.apiGateway !== null);
});

// --------------------------------------------------------------
// Test lambda service role
// --------------------------------------------------------------
test('Test api gateway lambda service role', () => {
  const stack = new cdk.Stack();
  deploy(stack);
  expect(stack).toHaveResource("AWS::IAM::Role", {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: "sts:AssumeRole",
          Effect: "Allow",
          Principal: {
            Service: "lambda.amazonaws.com"
          }
        }
      ],
      Version: "2012-10-17"
    },
    Policies: [
      {
        PolicyDocument: {
          Statement: [
            {
              Action: [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
              ],
              Effect: "Allow",
              Resource: {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      Ref: "AWS::Partition"
                    },
                    ":logs:",
                    {
                      Ref: "AWS::Region"
                    },
                    ":",
                    {
                      Ref: "AWS::AccountId"
                    },
                    ":log-group:/aws/lambda/*"
                  ]
                ]
              }
            }
          ],
          Version: "2012-10-17"
        },
        PolicyName: "LambdaFunctionServiceRolePolicy"
      }
    ]
  });
});

// --------------------------------------------------------------
// Test web acl with default rules
// --------------------------------------------------------------
test('Test default acl rules', () => {
  const stack = new cdk.Stack();
  deploy(stack);
  expect(stack).toHaveResource("AWS::WAFv2::WebACL", {
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

// --------------------------------------------------------------
// Test web acl with user provided acl props
// --------------------------------------------------------------
test('Test user provided acl props', () => {
  const stack = new cdk.Stack();
  const inProps: lambda.FunctionProps = {
    code: lambda.Code.fromAsset(`${__dirname}/lambda`),
    runtime: lambda.Runtime.NODEJS_10_X,
    handler: 'index.handler'
  };
  const func = defaults.deployLambdaFunction(stack, inProps);
  const [_api] = defaults.RegionalLambdaRestApi(stack, func);
  const customRules = [
    wrapManagedRuleSet("AWSManagedRulesCommonRuleSet", "AWS", 0),
    wrapManagedRuleSet("AWSManagedRulesWordPressRuleSet", "AWS", 1),
  ];

  const wafAcl = new waf.CfnWebACL(stack, 'test-waf', {
    defaultAction: {
      allow: {}
    },
    scope: 'REGIONAL',
    visibilityConfig: {
      cloudWatchMetricsEnabled: true,
      metricName: 'webACL',
      sampledRequestsEnabled: true
    },
    rules: customRules
  });

  new WafwebaclToApiGateway(stack, 'test-wafwebacl-apigateway', {
    existingApiGatewayInterface: _api,
    existingWebaclObj: wafAcl
  });

  expect(stack).toHaveResource("AWS::WAFv2::WebACL", {
    DefaultAction: {
      Allow: {}
    },
    Scope: "REGIONAL",
    VisibilityConfig: {
      CloudWatchMetricsEnabled: true,
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
