/**
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import * as s3 from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import { DefaultS3Props } from './s3-bucket-defaults';
import { overrideProps } from './utils';

export interface BuildS3BucketProps {
  /**
   * Whether to create a S3 Bucket or use an existing S3 Bucket.
   * If set to false, you must provide S3 Bucket as `existingBucketObj`
   *
   * @default - true
   */
  readonly deployBucket?: boolean,
  /**
   * Existing instance of S3 Bucket object.
   * If `deployBucket` is set to false only then this property is required
   *
   * @default - None
   */
  readonly existingBucketObj?: s3.Bucket,
  /**
   * Optional user provided props to override the default props.
   * If `deploy` is set to true only then this property is required
   *
   * @default - Default props are used
   */
  readonly bucketProps?: s3.BucketProps
}

export function buildS3Bucket(scope: cdk.Construct, props: BuildS3BucketProps): s3.Bucket {
    // Conditional s3 Bucket creation
    // If deployBucket == false
    if (props.hasOwnProperty('deployBucket') && props.deployBucket === false) {
        if (props.existingBucketObj) {
            return props.existingBucketObj;
        } else {
            throw Error('Missing existingBucketObj from props for deployBucket = false');
        }
    // If deploy == true
    } else {
        if (props.bucketProps) {
            return s3BucketWithLogging(scope, props.bucketProps);
        } else {
            return s3BucketWithLogging(scope, DefaultS3Props());
        }
    }
}

function s3BucketWithLogging(scope: cdk.Construct, s3BucketProps?: s3.BucketProps): s3.Bucket {

    // Create the Application Bucket
    let bucketprops;

    if (s3BucketProps?.serverAccessLogsBucket) {
        bucketprops = DefaultS3Props;
    } else {
        // Create the Logging Bucket
        const loggingBucket: s3.Bucket = new s3.Bucket(scope, 'S3LoggingBucket', DefaultS3Props());

        // Extract the CfnBucket from the loggingBucket
        const loggingBucketResource = loggingBucket.node.findChild('Resource') as s3.CfnBucket;

        // Override accessControl configuration and add metadata for the logging bucket
        loggingBucketResource.addPropertyOverride('AccessControl', 'LogDeliveryWrite');
        loggingBucketResource.cfnOptions.metadata = {
            cfn_nag: {
                rules_to_suppress: [{
                    id: 'W35',
                    reason: `This S3 bucket is used as the access logging bucket for another bucket`
                }, {
                    id: 'W51',
                    reason: `This S3 bucket Bucket does not need a bucket policy`
                }]
            }
        };
        bucketprops = DefaultS3Props(loggingBucket);
    }

    if (s3BucketProps) {
        bucketprops = overrideProps(bucketprops, s3BucketProps);
    }
    const s3Bucket: s3.Bucket = new s3.Bucket(scope, 'S3Bucket', bucketprops);

    return s3Bucket;
}