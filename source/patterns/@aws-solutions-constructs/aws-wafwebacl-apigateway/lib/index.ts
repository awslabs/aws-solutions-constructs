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
import { Construct, Stack } from '@aws-cdk/core';

/**
 * @summary The properties for the WafwebaclToApiGateway class.
 */
export interface WafwebaclToApiGatewayProps {
  /**
   * The existing API Gateway instance that will be protected with the WAF web ACL.
   */
  readonly existingApiGatewayInterface: api.IRestApi,
  /**
   * Existing instance of a WAF web ACL, if this is set then the all props are ignored
   */
  readonly existingWebaclObj?: waf.CfnWebACL,
  /**
   * Optional user-provided props to override the default props for the AWS WAF web ACL.
   *
   * @default - Default properties are used.
   */
  readonly webaclProps?: waf.CfnWebACLProps,
}

/**
 * @summary The WafwebaclToApiGateway class.
 */
export class WafwebaclToApiGateway extends Construct {
  public readonly webACL: waf.CfnWebACL;
  public readonly apiGateway: api.IRestApi;
  /**
   * @summary Constructs a new instance of the WafwebaclToApiGateway class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {WafwebaclToApiGatewayProps} props - user provided props for the construct.
   * @access public
   */
  constructor(scope: Construct, id: string, props: WafwebaclToApiGatewayProps) {
    super(scope, id);
    defaults.CheckProps(props);

    // Build the Web ACL
    this.webACL = defaults.buildWebacl(this, 'REGIONAL', {
      existingApiGatewayInterface: props.existingApiGatewayInterface,
      existingWebaclObj: props.existingWebaclObj,
      webaclProps: props.webaclProps,
    });

    const webAclArn = this.webACL.attrArn;
    const resourceArn = `arn:aws:apigateway:${Stack.of(scope).region}::/restapis/${props.existingApiGatewayInterface.restApiId}/stages/${props.existingApiGatewayInterface.deploymentStage.stageName}`;

    // Setup the Web ACL Association
    new waf.CfnWebACLAssociation(scope, `${scope.node.id}-WebACLAssociation`, {
      webAclArn,
      resourceArn
    })

    this.apiGateway = props.existingApiGatewayInterface;
  }
}