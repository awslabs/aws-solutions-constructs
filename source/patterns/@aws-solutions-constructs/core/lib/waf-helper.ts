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

import { Construct } from "constructs";
import * as waf from "aws-cdk-lib/aws-wafv2";
import { DefaultWafwebaclProps } from "./waf-defaults";
import { consolidateProps } from './utils';

export interface BuildWebaclProps {
  /**
   * Existing instance of a WAF web ACL, if this is set then the all props are ignored
   */
  readonly existingWebaclObj?: waf.CfnWebACL;
  /**
   * User provided props to override the default ACL props for WAF web ACL.
   */
  readonly webaclProps?: waf.CfnWebACLProps | any;
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function buildWebacl(scope: Construct, webaclScope: string, props: BuildWebaclProps): waf.CfnWebACL {
  let webAcl;

  if (props.existingWebaclObj && !props.webaclProps) { // Existing WAF web ACL
    webAcl = props.existingWebaclObj;
  } else { // Create a new WAF web ACL
    const finalWebaclProps: waf.CfnWebACLProps = consolidateProps(DefaultWafwebaclProps(webaclScope), props.webaclProps);

    webAcl = new waf.CfnWebACL(scope, `${scope.node.id}-WebACL`, {
      ...finalWebaclProps,
      defaultAction: props.webaclProps?.defaultAction ?? finalWebaclProps.defaultAction
    });
  }

  return webAcl;
}

export interface WafWebAclProps {
  readonly existingWebaclObj: waf.CfnWebACL,
  readonly webaclProps: waf.CfnWebACLProps,
}

export function CheckWafWebAclProps(propsObject: WafWebAclProps | any) {
  let errorMessages = '';
  let errorFound = false;

  if (propsObject.existingWebaclObj && propsObject.webaclProps) {
    errorMessages += 'Error - Either provide existingWebaclObj or webaclProps, but not both.\n';
    errorFound = true;
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }
}