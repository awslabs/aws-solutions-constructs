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

import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as s3 from '@aws-cdk/aws-s3';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from '@aws-cdk/core';
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
  readonly existingBucketInterface?: s3.IBucket,
  /**
   * User provided props to override the default props for the S3 Bucket.
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
   * security headers in all responses from cloudfront
   *
   * @default - true
   */
  readonly insertHttpSecurityHeaders?: boolean;
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
     * @param {cdk.App} scope - represents the scope for all the resources.
     * @param {string} id - this is a a scope-unique id.
     * @param {CloudFrontToS3Props} props - user provided props for the construct
     * @since 0.8.0
     * @access public
     */
    constructor(scope: Construct, id: string, props: CloudFrontToS3Props) {
      super(scope, id);
      defaults.CheckProps(props);

      if (!props.existingBucketInterface) {
        [this.s3Bucket, this.s3LoggingBucket] = defaults.buildS3Bucket(this, {
          bucketProps: props.bucketProps
        });
        this.s3BucketInterface = this.s3Bucket;
      } else {
        this.s3BucketInterface = props.existingBucketInterface;
      }

      [this.cloudFrontWebDistribution, this.cloudFrontFunction, this.cloudFrontLoggingBucket] =
          defaults.CloudFrontDistributionForS3(this, this.s3BucketInterface,
            props.cloudFrontDistributionProps, props.insertHttpSecurityHeaders);
    }
}
