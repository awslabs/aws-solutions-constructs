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

import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3 from 'aws-cdk-lib/aws-s3';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import * as defaults from '@aws-solutions-constructs/core';

/**
 * @summary The properties for the CloudFrontToS3 Construct
 */
export interface CloudFrontToS3Props {
  /**
   * Existing instance of S3 Bucket object, providing both this and `bucketProps` will cause an error.
   *
   * @default - None
   */
  readonly existingBucketObj?: s3.IBucket,
  /**
   * Optional user provided props to override the default props for the S3 Bucket.
   *
   * @default - Default props are used
   */
  readonly bucketProps?: s3.BucketProps,
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
   * Optional user provided props to provide an originPath that CloudFront appends to the
   * origin domain name when CloudFront requests content from the origin.
   * The string should start with a `/`, for example `/production`.
   * @default = '/'
   */
  readonly originPath?: string,
  /**
   * Optional user provided props to override the default props for the S3 Logging Bucket.
   *
   * @default - Default props are used
   */
  readonly loggingBucketProps?: s3.BucketProps
  /**
   * Optional user provided props to override the default props for the CloudFront Logging Bucket.
   *
   * @default - Default props are used
   */
  readonly cloudFrontLoggingBucketProps?: s3.BucketProps
  /**
   * Whether to turn on Access Logs for the S3 bucket with the associated storage costs.
   * Enabling Access Logging is a best practice.
   *
   * @default - true
   */
  readonly logS3AccessLogs?: boolean;
}

export class CloudFrontToS3 extends Construct {
  public readonly cloudFrontWebDistribution: cloudfront.Distribution;
  public readonly cloudFrontFunction?: cloudfront.Function;
  public readonly cloudFrontLoggingBucket?: s3.Bucket;
  public readonly s3BucketInterface: s3.IBucket;
  public readonly s3Bucket?: s3.Bucket;
  public readonly s3LoggingBucket?: s3.Bucket;

  /**
   * @summary Constructs a new instance of the CloudFrontToS3 class.
   * @param {Construct} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {CloudFrontToS3Props} props - user provided props for the construct
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: CloudFrontToS3Props) {
    super(scope, id);

    // All our tests are based upon this behavior being on, so we're setting
    // context here rather than assuming the client will set it
    this.node.setContext("@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy", true);

    defaults.CheckS3Props(props);
    defaults.CheckCloudFrontProps(props);

    let bucket: s3.IBucket;

    if (!props.existingBucketObj) {
      const buildS3BucketResponse = defaults.buildS3Bucket(this, {
        bucketProps: props.bucketProps,
        loggingBucketProps: props.loggingBucketProps,
        logS3AccessLogs: props.logS3AccessLogs
      });
      this.s3Bucket = buildS3BucketResponse.bucket;
      this.s3LoggingBucket = buildS3BucketResponse.loggingBucket;
      bucket = this.s3Bucket;
    } else {
      bucket = props.existingBucketObj;
    }

    this.s3BucketInterface = bucket;

    const cloudFrontDistributionForS3Response = defaults.CloudFrontDistributionForS3(
      this,
      this.s3BucketInterface,
      props.cloudFrontDistributionProps,
      props.insertHttpSecurityHeaders,
      props.originPath,
      props.cloudFrontLoggingBucketProps,
      props.responseHeadersPolicyProps
    );
    this.cloudFrontWebDistribution = cloudFrontDistributionForS3Response.distribution;
    this.cloudFrontFunction = cloudFrontDistributionForS3Response.cloudfrontFunction;
    this.cloudFrontLoggingBucket = cloudFrontDistributionForS3Response.loggingBucket;
  }

}
