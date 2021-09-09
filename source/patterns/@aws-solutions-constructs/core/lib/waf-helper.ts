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

 import { Construct } from "@aws-cdk/core";
 import * as api from '@aws-cdk/aws-apigateway';
 import * as waf from "@aws-cdk/aws-wafv2";
 import { DefaultWafRules, DefaultWafwebacl } from "./waf-defaults";
 
 export interface BuildWebaclProps {
     /**
      * The existing API Gateway instance that will be protected with the WAF web ACL.
      */
     readonly existingApiGatewayInterface: api.IRestApi;
     /**
      * Existing instance of a WAF web ACL, if this is set then the all Props are ignored
      */
     readonly existingWebaclObj?: waf.CfnWebACL;
     /**
      * User provided props to override the default ACL props for WAF web ACL.
      */
     readonly webaclProps?: waf.CfnWebACLProps;
 }
 
 export function buildWebacl(scope: Construct, webaclScope: string, props: BuildWebaclProps): waf.CfnWebACL {
   let webAcl;
 
   if (props?.existingWebaclObj && !props.webaclProps) { // Existing WAF web ACL
     webAcl = props.existingWebaclObj;
   } else if (props?.webaclProps && !props?.existingWebaclObj) { // User provided props
     const updateRules = props.webaclProps?.rules ?  props.webaclProps.rules : DefaultWafRules();
     const customAclProps = { ...props.webaclProps, rules :  updateRules };
 
     webAcl = new waf.CfnWebACL(scope, `${scope.node.id}-WebACL`, customAclProps );
   } else { // No provided props
     webAcl = new waf.CfnWebACL(scope, `${scope.node.id}-WebACL`, DefaultWafwebacl(webaclScope));
   }
 
   return webAcl;
 }
 