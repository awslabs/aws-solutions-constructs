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

import * as api from 'aws-cdk-lib/aws-apigateway';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

/**
 * @summary The properties for the CloudFrontToApiGateway Construct
 */
export interface CloudFrontToApiGatewayProps {
  /**
   * Existing instance of api.RestApi object.
   *
   * @default - None
   */
  readonly existingApiGatewayObj: api.RestApi,
  /**
   * Optional user provided props to override the default props
   *
   * @default - Default props are used
   */
  readonly cloudFrontDistributionProps?: cloudfront.DistributionProps | any,
  /**
   * Optional user provided props to turn on/off the automatic injection of best practice HTTP
   * security headers in all responses from cloudfront.
   * Turning this on will inject default headers and is mutually exclusive with passing custom security headers
   * via the responseHeadersPolicyProps parameter.
   *
   * @default - true
   */
  readonly insertHttpSecurityHeaders?: boolean;
  /**
   * Optional user provided configuration that cloudfront applies to all http responses.
   * Can be used to pass a custom ResponseSecurityHeadersBehavior, ResponseCustomHeadersBehavior or
   * ResponseHeadersCorsBehavior to the cloudfront distribution.
   *
   * Passing a custom ResponseSecurityHeadersBehavior is mutually exclusive with turning on the default security headers
   * via `insertHttpSecurityHeaders` prop. Will throw an error if both `insertHttpSecurityHeaders` is set to `true`
   * and ResponseSecurityHeadersBehavior is passed.
   *
   * @default - undefined
   */
  readonly responseHeadersPolicyProps?: cloudfront.ResponseHeadersPolicyProps
  /**
   * Optional user provided props to override the default props for the CloudFront Logging Bucket.
   *
   * @default - Default props are used
   */
  readonly cloudFrontLoggingBucketProps?: s3.BucketProps
}

export class CloudFrontToApiGateway extends Construct {
  public readonly cloudFrontWebDistribution: cloudfront.Distribution;
  public readonly apiGateway: api.RestApi;
  public readonly cloudFrontFunction?: cloudfront.Function;
  public readonly cloudFrontLoggingBucket?: s3.Bucket;

  /**
   * @summary Constructs a new instance of the CloudFrontToApiGateway class.
   * @param {Construct} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {CloudFrontToApiGatewayProps} props - user provided props for the construct
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: CloudFrontToApiGatewayProps) {
    super(scope, id);

    // All our tests are based upon this behavior being on, so we're setting
    // context here rather than assuming the client will set it
    this.node.setContext("@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy", true);

    defaults.CheckCloudFrontProps(props);

    this.apiGateway = props.existingApiGatewayObj;

    const cloudFrontDistributionForApiGatewayResponse = defaults.CloudFrontDistributionForApiGateway(
      this,
      props.existingApiGatewayObj,
      props.cloudFrontDistributionProps,
      props.insertHttpSecurityHeaders,
      props.cloudFrontLoggingBucketProps,
      props.responseHeadersPolicyProps
    );
    this.cloudFrontWebDistribution = cloudFrontDistributionForApiGatewayResponse.distribution;
    this.cloudFrontFunction = cloudFrontDistributionForApiGatewayResponse.cloudfrontFunction;
    this.cloudFrontLoggingBucket = cloudFrontDistributionForApiGatewayResponse.loggingBucket;
  }
}
