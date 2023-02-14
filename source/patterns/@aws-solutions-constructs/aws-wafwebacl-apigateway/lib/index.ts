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
import { Construct } from 'constructs';
import * as api from 'aws-cdk-lib/aws-apigateway';
import * as waf from 'aws-cdk-lib/aws-wafv2';
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Aws } from 'aws-cdk-lib';

/**
 * @summary The properties for the WafwebaclToApiGateway class.
 */
export interface WafwebaclToApiGatewayProps {
  /**
   * The existing API Gateway instance that will be protected with the WAF web ACL.
   */
  readonly existingApiGatewayInterface: api.IRestApi,
  /**
   * Existing instance of a WAF web ACL, an error will occur if this and props is set
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
  public readonly webacl: waf.CfnWebACL;
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
    this.webacl = defaults.buildWebacl(this, 'REGIONAL', {
      existingWebaclObj: props.existingWebaclObj,
      webaclProps: props.webaclProps,
    });

    const resourceArn = `arn:${Aws.PARTITION}:apigateway:${Aws.REGION}::/restapis/${props.existingApiGatewayInterface.restApiId}/stages/${props.existingApiGatewayInterface.deploymentStage.stageName}`;

    // Setup the Web ACL Association
    new waf.CfnWebACLAssociation(scope, `${id}-WebACLAssociation`, {
      webAclArn: this.webacl.attrArn,
      resourceArn
    });

    this.apiGateway = props.existingApiGatewayInterface;
  }
}