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

import { Construct, Stack } from "@aws-cdk/core";
import * as api from '@aws-cdk/aws-apigateway';
import * as waf from "@aws-cdk/aws-wafv2";
import { DefaultWafRules } from "./waf-defaults";

export interface BuildWafProps {
    /**
     * The existing API Gateway instance that will be protected with the WAF webACL.
     */
    readonly existingApiGatewayInterface: api.IRestApi;
    /**
     * Existing instance of a WAF ACL, if this is set then the all Props are ignored
     */
    readonly existingWafAcl?: waf.CfnWebACL;
    /**
     * User provided props to override the default ACL props for WAF.
     */
    readonly wafAclProps?: waf.CfnWebACLProps;
    /**
     * User provided props to override the default ACL props for WAF.
     */
    readonly existingWafRules?: waf.CfnRuleGroup.RuleProperty[];
}

export function buildWaf(scope: Construct, props: BuildWafProps): [ waf.CfnWebACL, waf.CfnWebACLAssociation ] {
  let webAcl;
  let webAclArn;
  const resourceArn = `arn:aws:apigateway:${Stack.of(scope).region}::/restapis/${props.existingApiGatewayInterface.restApiId}/stages/${props.existingApiGatewayInterface.deploymentStage.stageName}`;

  if (props?.existingWafAcl && !props.existingWafRules) { // Existing WAF ACL
    webAcl = props.existingWafAcl;
    webAclArn = props.existingWafAcl.attrArn;
  } else if (props?.wafAclProps && !props?.existingWafAcl) { // User provided props and rules
    webAcl = new waf.CfnWebACL(scope, `${scope.node.id}-WebACL`, props.wafAclProps);
    webAclArn = webAcl.attrArn;
  } else { // User provided rules
    webAcl = new waf.CfnWebACL(scope, `${scope.node.id}-WebACL`, {
      defaultAction: {
        allow: {}
      },
      scope: 'REGIONAL',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'webACL',
        sampledRequestsEnabled: true
      },
      rules: props?.existingWafRules ? props.existingWafRules : DefaultWafRules()
    });

    webAclArn = webAcl.attrArn;
  }

  return [ webAcl, new waf.CfnWebACLAssociation(scope, `${scope.node.id}-WebACLAssociation`, {
    webAclArn,
    resourceArn
  }) ];
}
