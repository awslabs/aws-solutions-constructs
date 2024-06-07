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

import { Aws } from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as defaults from '@aws-solutions-constructs/core';
import * as resources from '@aws-solutions-constructs/resources';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

/**
 * @summary The properties for the CloudFrontToS3 Construct
 */
export interface CloudFrontToS3Props {
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

  // =====================
  // S3 Content Bucket
  // =====================
  /**
   * Existing instance of S3 Content Bucket object, providing both this and `bucketProps` will cause an error.
   *
   * @default - None
   */
  readonly existingBucketObj?: s3.IBucket,
  /**
   * Optional user provided props to override the default props for the S3 Content Bucket.
   *
   * @default - Default props are used
   */
  readonly bucketProps?: s3.BucketProps,

  // =====================
  // S3 Content Bucket Access Logs Bucket
  // =====================
  /**
   * Optional - Whether to maintain access logs for the S3 Content bucket
   *
   * @default - true
   */
  readonly logS3AccessLogs?: boolean,
  /**
   * Optional user provided props to override the default props for the S3 Content Bucket Access Log Bucket.
   *
   * @default - Default props are used
   */
  readonly loggingBucketProps?: s3.BucketProps,

  // =====================
  // CloudFront Log Bucket
  // =====================
  /**
   * Optional user provided props to override the default props for the CloudFront Log Bucket.
   *
   * @default - Default props are used
   */
  readonly cloudFrontLoggingBucketProps?: s3.BucketProps,

  // =====================
  // CloudFront Logs Bucket Access Log Bucket
  // =====================
  /**
   * Optional - Whether to maintain access logs for the CloudFront Logging bucket. Specifying false for this
   * while providing info about the log bucket will cause an error.
   *
   * @default - true
   */
  readonly logCloudFrontAccessLog?: boolean,
  /**
   * Optional user provided props to override the default props for the CloudFront Log Bucket Access Log bucket.
   * Providing both this and `existingcloudFrontLoggingBucketAccessLogBucket` will cause an error
   *
   * @default - Default props are used
   */
  readonly cloudFrontLoggingBucketAccessLogBucketProps?: s3.BucketProps,
}

export class CloudFrontToS3 extends Construct {
  public readonly cloudFrontWebDistribution: cloudfront.Distribution;
  public readonly cloudFrontFunction?: cloudfront.Function;
  public readonly cloudFrontLoggingBucket?: s3.Bucket;
  public readonly cloudFrontLoggingBucketAccessLogBucket?: s3.Bucket;
  public readonly s3BucketInterface: s3.IBucket;
  public readonly s3Bucket?: s3.Bucket;
  public readonly s3LoggingBucket?: s3.Bucket;
  public readonly originAccessControl?: cloudfront.CfnOriginAccessControl;

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
    this.CheckConstructSpecificProps(props);

    let originBucket: s3.IBucket;

    if (!props.existingBucketObj) {
      const buildS3BucketResponse = defaults.buildS3Bucket(this, {
        bucketProps: props.bucketProps,
        loggingBucketProps: props.loggingBucketProps,
        logS3AccessLogs: props.logS3AccessLogs
      });
      this.s3Bucket = buildS3BucketResponse.bucket;
      this.s3LoggingBucket = buildS3BucketResponse.loggingBucket;
      originBucket = this.s3Bucket;
    } else {
      originBucket = props.existingBucketObj;
    }

    this.s3BucketInterface = originBucket;

    // Define the CloudFront Distribution
    const cloudFrontDistributionForS3Props: defaults.CreateCloudFrontDistributionForS3Props = {
      sourceBucket: this.s3BucketInterface,
      cloudFrontDistributionProps: props.cloudFrontDistributionProps,
      httpSecurityHeaders: props.insertHttpSecurityHeaders,
      cloudFrontLoggingBucketProps: props.cloudFrontLoggingBucketProps,
      responseHeadersPolicyProps: props.responseHeadersPolicyProps,
      cloudFrontLoggingBucketS3AccessLogBucketProps: props.cloudFrontLoggingBucketAccessLogBucketProps
    };
    const cloudFrontDistributionForS3Response = defaults.createCloudFrontDistributionForS3(this, id, cloudFrontDistributionForS3Props);
    this.cloudFrontWebDistribution = cloudFrontDistributionForS3Response.distribution;
    this.cloudFrontFunction = cloudFrontDistributionForS3Response.cloudfrontFunction;
    this.cloudFrontLoggingBucket = cloudFrontDistributionForS3Response.loggingBucket;
    this.originAccessControl = cloudFrontDistributionForS3Response.originAccessControl;
    this.cloudFrontLoggingBucketAccessLogBucket = cloudFrontDistributionForS3Response.loggingBucketS3AccesssLogBucket;

    // Attach the OriginAccessControl to the CloudFront Distribution, and remove the OriginAccessIdentity
    const l1CloudFrontDistribution = this.cloudFrontWebDistribution.node.defaultChild as cloudfront.CfnDistribution;
    l1CloudFrontDistribution.addPropertyOverride('DistributionConfig.Origins.0.OriginAccessControlId', this.originAccessControl?.attrId);
    if (props.originPath) {
      l1CloudFrontDistribution.addPropertyOverride('DistributionConfig.Origins.0.OriginPath', props.originPath);
    }

    // Grant CloudFront permission to get the objects from the s3 bucket origin
    originBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:GetObject'],
        principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
        resources: [originBucket.arnForObjects('*')],
        conditions: {
          StringEquals: {
            'AWS:SourceArn': `arn:aws:cloudfront::${Aws.ACCOUNT_ID}:distribution/${this.cloudFrontWebDistribution.distributionId}`
          }
        }
      })
    );

    // We need to create a custom resource to introduce the indirection necessary to avoid
    // a circular dependency when granting the CloudFront distribution access to use the
    // KMS key to decrypt objects. Without this indirection, it is not possible to reference
    // the CloudFront distribution ID in the KMS key policy because -
    //   * The S3 bucket references the KMS key
    //   * The CloudFront distribution references the bucket
    //   * The KMS key references the CloudFront distribution
    let encryptionKey: kms.IKey | undefined;
    if (props.bucketProps && props.bucketProps.encryptionKey) {
      encryptionKey = props.bucketProps.encryptionKey;
    } else if (props.existingBucketObj && props.existingBucketObj.encryptionKey) {
      encryptionKey = props.existingBucketObj.encryptionKey;
    }

    if (encryptionKey) {
      resources.createKeyPolicyUpdaterCustomResource(this, id,  {
        distribution: this.cloudFrontWebDistribution,
        encryptionKey
      });
    }
  }

  private CheckConstructSpecificProps(props: CloudFrontToS3Props) {
    let errorMessages = '';
    let errorFound = false;

    if ((props.logS3AccessLogs === false) && props.bucketProps?.serverAccessLogsBucket) {
      errorMessages += 'Error - logS3AccessLogs is false, but a log bucket was provided in bucketProps.\n';
      errorFound = true;
    }

    if (props.loggingBucketProps && props.bucketProps?.serverAccessLogsBucket) {
      errorMessages += 'Error - bothlog bucket props and an existing log bucket were provided.\n';
      errorFound = true;
    }

    if (props.cloudFrontLoggingBucketAccessLogBucketProps && props.cloudFrontLoggingBucketProps?.serverAccessLogsBucket) {
      errorMessages += 'Error - an existing CloudFront log bucket S3 access log bucket and cloudFrontLoggingBucketAccessLogBucketProps were provided\n';
      errorFound = true;
    }

    if (props.cloudFrontLoggingBucketAccessLogBucketProps && props.logCloudFrontAccessLog === false) {
      errorMessages += 'Error - cloudFrontLoggingBucketAccessLogBucketProps were provided but logCloudFrontAccessLog was false\n';
      errorFound = true;
    }

    if (props.cloudFrontLoggingBucketProps?.serverAccessLogsBucket && props.logCloudFrontAccessLog === false) {
      errorMessages += 'Error - props.cloudFrontLoggingBucketProps.serverAccessLogsBucket was provided but logCloudFrontAccessLog was false\n';
      errorFound = true;
    }

    if (errorFound) {
      throw new Error(errorMessages);
    }
  }
}