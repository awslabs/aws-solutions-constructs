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

import { Construct } from 'constructs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3 from 'aws-cdk-lib/aws-s3';

/**
 * Properties to use to customize an S3 Origin.
 */
export interface S3OacOriginProps extends cloudfront.OriginProps {
  /**
   * An optional Origin Access Identity of the origin identity cloudfront will use when calling your s3 bucket.
   *
   * @default - An Origin Access Identity will be created.
   */
  readonly originAccessControl: cloudfront.CfnOriginAccessControl;
}

/**
 * An Origin that is backed by an S3 bucket.
 *
 * If the bucket is configured for website hosting, this origin will be configured to use the bucket as an
 * HTTP server origin and will use the bucket's configured website redirects and error handling. Otherwise,
 * the origin is created as a bucket origin and will use CloudFront's redirect and error handling.
 */
export class S3OacOrigin implements cloudfront.IOrigin {
  private readonly origin: cloudfront.IOrigin;

  constructor(bucket: s3.IBucket, originAccessControl: cloudfront.CfnOriginAccessControl) {
    this.origin = new S3OacBucketOrigin(bucket, originAccessControl);
  }

  public bind(scope: Construct, options: cloudfront.OriginBindOptions): cloudfront.OriginBindConfig {
    return this.origin.bind(scope, options);
  }
}

/**
 * An Origin specific to a S3 bucket (not configured for website hosting).
 *
 * Contains additional logic around bucket permissions and origin access identities.
 */
class S3OacBucketOrigin extends cloudfront.OriginBase {
  public originAccessControl!: cloudfront.CfnOriginAccessControl;

  constructor(bucket: s3.IBucket, originAccessControl: cloudfront.CfnOriginAccessControl) {
    super(bucket.bucketRegionalDomainName);
    this.originAccessControl = originAccessControl;
  }

  public bind(scope: Construct, options: cloudfront.OriginBindOptions): cloudfront.OriginBindConfig {
    return super.bind(scope, options);
  }

  protected renderS3OriginConfig(): cloudfront.CfnDistribution.S3OriginConfigProperty | undefined {
    return { };
  }
}
