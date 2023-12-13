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

import { Construct } from 'constructs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as mediastore from 'aws-cdk-lib/aws-mediastore';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as defaults from '@aws-solutions-constructs/core';
import { Aws } from 'aws-cdk-lib';

/**
 * @summary The properties for the CloudFrontToMediaStore Construct
 */
export interface CloudFrontToMediaStoreProps {
  /**
   * Existing instance of mediastore.CfnContainer object.
   *
   * @default - None
   */
  readonly existingMediaStoreContainerObj?: mediastore.CfnContainer;
  /**
   * Optional user provided props to override the default props for the MediaStore.
   *
   * @default - Default props are used
   */
  readonly mediaStoreContainerProps?: mediastore.CfnContainerProps;
  /**
   * Optional user provided props to override the default props for the CloudFront.
   *
   * @default - Default props are used
   */
  readonly cloudFrontDistributionProps?: cloudfront.DistributionProps | any;
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

export class CloudFrontToMediaStore extends Construct {
  public readonly cloudFrontWebDistribution: cloudfront.Distribution;
  public readonly mediaStoreContainer: mediastore.CfnContainer;
  public readonly cloudFrontLoggingBucket?: s3.Bucket;
  public readonly cloudFrontOriginRequestPolicy: cloudfront.OriginRequestPolicy;
  public readonly cloudFrontOriginAccessIdentity?: cloudfront.OriginAccessIdentity;
  public readonly cloudFrontFunction?: cloudfront.Function;

  /**
   * @summary Constructs a new instance of CloudFrontToMediaStore class.
   * @param {Construct} scope - represents the scope for all the resources.
   * @param {string} id - this is a scope-unique id.
   * @param {CloudFrontToMediaStoreProps} props - user provided props for the construct
   * @since 1.76.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: CloudFrontToMediaStoreProps) {
    super(scope, id);

    // All our tests are based upon this behavior being on, so we're setting
    // context here rather than assuming the client will set it
    this.node.setContext("@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy", true);

    defaults.CheckMediaStoreProps(props);
    defaults.CheckCloudFrontProps(props);

    let cloudFrontDistributionProps = props.cloudFrontDistributionProps;

    if (props.existingMediaStoreContainerObj) {
      this.mediaStoreContainer = props.existingMediaStoreContainerObj;
    } else {
      let mediaStoreProps: mediastore.CfnContainerProps;

      if (props.mediaStoreContainerProps) {
        mediaStoreProps = props.mediaStoreContainerProps;
      } else {
        this.cloudFrontOriginAccessIdentity = defaults.CloudFrontOriginAccessIdentity(this);

        mediaStoreProps = {
          containerName: Aws.STACK_NAME,
          policy: JSON.stringify({
            Version: '2012-10-17',
            Statement: [{
              Sid: 'MediaStoreDefaultPolicy',
              Effect: 'Allow',
              Principal: '*',
              Action: [
                'mediastore:GetObject',
                'mediastore:DescribeObject'
              ],
              Resource: `arn:${Aws.PARTITION}:mediastore:${Aws.REGION}:${Aws.ACCOUNT_ID}:container/${Aws.STACK_NAME}/*`,
              Condition: {
                StringEquals: {
                  'aws:UserAgent': this.cloudFrontOriginAccessIdentity.originAccessIdentityId
                },
                Bool: {
                  'aws:SecureTransport': 'true'
                }
              }
            }]
          })
        };

        const userAgentHeader: Record<string, string> = {
          'User-Agent': this.cloudFrontOriginAccessIdentity.originAccessIdentityId
        };

        if (cloudFrontDistributionProps) {
          cloudFrontDistributionProps.customHeaders = userAgentHeader;
        } else {
          cloudFrontDistributionProps = {
            customHeaders: userAgentHeader
          };
        }
      }

      this.mediaStoreContainer = defaults.MediaStoreContainer(this, mediaStoreProps);
    }

    const DistributionResponse = defaults.CloudFrontDistributionForMediaStore(
      this,
      this.mediaStoreContainer,
      cloudFrontDistributionProps,
      props.insertHttpSecurityHeaders,
      props.cloudFrontLoggingBucketProps,
      props.responseHeadersPolicyProps
    );
    this.cloudFrontWebDistribution = DistributionResponse.distribution;
    this.cloudFrontLoggingBucket = DistributionResponse.loggingBucket;
    this.cloudFrontOriginRequestPolicy = DistributionResponse.requestPolicy;
    this.cloudFrontFunction = DistributionResponse.cloudfrontFunction;
  }
}
