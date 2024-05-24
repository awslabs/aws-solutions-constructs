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

import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { HttpOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { printWarning } from './utils';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

/**
 * Properties to use to customize an S3 Origin.
 */
export interface S3OacOriginProps extends cloudfront.OriginProps {
  /**
   * The origin access control that will be used when calling your S3 bucket.
   */
  readonly originAccessControl?: cloudfront.CfnOriginAccessControl;
}

/**
 * A custom implementation of S3Origin that allows an origin access control (OAC) to be used instead of
 * an origin access identity (OAI), which is currently the only option supported by default CDK.
 */
export class S3OacOrigin implements cloudfront.IOrigin {
  private readonly origin: cloudfront.IOrigin;

  constructor(bucket: s3.IBucket, props: S3OacOriginProps) {
    if (bucket.isWebsite) {
      // If the bucket is configured for website hosting, set up an HttpOrigin to support legacy clients
      printWarning(`Bucket ${bucket.bucketName} is being provided as a source but currently has website hosting enabled.
        This requires both the bucket and its objects to be public. AWS strongly recommends against configuring buckets
        and objects for public access. As an alternative, we recommend turning off website hosting settings on the bucket,
        which will result in an origin access control (OAC) being provisioned through which CloudFront can securely
        serve assets from the bucket.`);
      this.origin = new HttpOrigin(bucket.bucketWebsiteDomainName, {
        protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY, // S3 only supports HTTP for website buckets
        ...props
      });
    } else {
      if (!props.originAccessControl) {
        throw new Error(`"props.originAccessControl" is undefined. An origin access control must be provided when using a
          bucket that does not have website hosting enabled.`);
      }
      // If else, set up the origin access control
      this.origin = new S3OacBucketOrigin(bucket, props.originAccessControl!);
    }
  }

  public bind(scope: Construct, options: cloudfront.OriginBindOptions): cloudfront.OriginBindConfig {
    return this.origin.bind(scope, options);
  }
}

/**
 * An origin specific to a S3 bucket (not configured for website hosting).
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
    return { originAccessIdentity: '' };
  }
}
