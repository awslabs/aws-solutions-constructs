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
import * as api from '@aws-cdk/aws-apigateway';
import * as waf from '@aws-cdk/aws-wafv2';
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from '@aws-cdk/core';

/**
 * @summary The properties for the WafWebACLToApiGateway class.
 */
export interface WafWebACLToApiGatewayProps {
    /**
     * The existing API Gateway instance that will be protected with the WAF webACL.
     *
     */
    readonly existingApiGatewayInterface: api.IRestApi,
    /**
     * Existing instance of a WAF ACL, if this is set then the all props are ignored
     */
    readonly existingWafAcl?: waf.CfnWebACL,
    /**
     * Optional user-provided props to override the default props for the AWS WAF ACL.
     *
     * @default - Default properties are used.
     */
    readonly webACLProps?: waf.CfnWebACLProps,
    /**
     * User provided rules to override the default ACL rules for WAF.
     */
    readonly existingWafRules?: waf.CfnWebACL.RuleProperty[];
}

/**
 * @summary The WafWebACLToApiGateway class.
 */
export class WafWebACLToApiGateway extends Construct {
    public readonly webACLAssociation: waf.CfnWebACLAssociation;
    public readonly apiGateway: api.IRestApi;
    /**
     * @summary Constructs a new instance of the WafWebACLToApiGateway class.
     * @param {cdk.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a a scope-unique id.
     * @param {WafWebACLToApiGatewayProps} props - user provided props for the construct.
     * @access public
     */
    constructor(scope: Construct, id: string, props: WafWebACLToApiGatewayProps) {
      super(scope, id);
      defaults.CheckProps(props);

      // Setup the Web ACL Association
      this.webACLAssociation = defaults.buildWaf(this, {
        existingApiGatewayInterface: props.existingApiGatewayInterface,
        existingWafAcl: props.existingWafAcl,
        wafAclProps: props.webACLProps,
        existingWafRules: props.existingWafRules
      });

      this.apiGateway = props.existingApiGatewayInterface;
    }
}