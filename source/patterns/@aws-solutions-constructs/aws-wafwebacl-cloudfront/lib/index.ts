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
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as waf from 'aws-cdk-lib/aws-wafv2';
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

/**
 * @summary The properties for the WafwebaclToCloudFront class.
 */
export interface WafwebaclToCloudFrontProps {
  /**
   * The existing CloudFront instance that will be protected with the WAF web ACL.
   *
   * This construct changes the CloudFront distribution by directly manipulating
   * the CloudFormation output, so this must be the Construct and cannot be
   * changed to the Interface (IDistribution)
   */
  readonly existingCloudFrontWebDistribution: cloudfront.Distribution ,
  /**
   * Existing instance of a WAF web ACL, an error will occur if this and props is set
   */
  readonly existingWebaclObj?: waf.CfnWebACL,
  /**
   * Optional user-provided props to override the default props for the AWS WAF web ACL.
   *
   * @default - Default properties are used.
   */
  readonly webaclProps?: waf.CfnWebACLProps | any,
}

/**
 * @summary The WafwebaclToCloudFront class.
 */
export class WafwebaclToCloudFront extends Construct {
  public readonly webacl: waf.CfnWebACL;
  public readonly cloudFrontWebDistribution: cloudfront.Distribution;
  /**
   * @summary Constructs a new instance of the WafwebaclToCloudFront class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {WafwebaclToCloudFrontProps} props - user provided props for the construct.
   * @access public
   */
  constructor(scope: Construct, id: string, props: WafwebaclToCloudFrontProps) {
    super(scope, id);
    defaults.CheckWafWebAclProps(props);

    // All our tests are based upon this behavior being on, so we're setting
    // context here rather than assuming the client will set it
    this.node.setContext("@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy", true);

    // Build the Web ACL
    this.webacl = defaults.buildWebacl(this, 'CLOUDFRONT', {
      existingWebaclObj: props.existingWebaclObj,
      webaclProps: props.webaclProps,
    });

    // Property override of CloudFront Cfn Template
    const cfnExistingCloudFrontWebDistribution = props.existingCloudFrontWebDistribution.node.defaultChild as cloudfront.CfnDistribution;

    cfnExistingCloudFrontWebDistribution.addPropertyOverride('DistributionConfig.WebACLId', this.webacl.attrArn);

    this.cloudFrontWebDistribution = props.existingCloudFrontWebDistribution;
  }
}