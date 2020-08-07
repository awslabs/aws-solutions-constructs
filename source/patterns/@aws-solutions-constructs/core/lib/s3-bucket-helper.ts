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
import { PolicyStatement, Effect, AnyPrincipal } from '@aws-cdk/aws-iam';

export interface BuildS3BucketProps {
  /**
   * User provided props to override the default props for the S3 Bucket.
   *
   * @default - Default props are used
   */
  readonly bucketProps?: s3.BucketProps
}

export function buildS3Bucket(scope: cdk.Construct, props: BuildS3BucketProps, bucketId?: string): [s3.Bucket, s3.Bucket?] {
    if (props.bucketProps) {
        return s3BucketWithLogging(scope, props.bucketProps, bucketId);
    } else {
        return s3BucketWithLogging(scope, DefaultS3Props(), bucketId);
    }
}

export function applySecureBucketPolicy(s3Bucket: s3.Bucket): void {

    // Apply bucket policy to enforce encryption of data in transit

    s3Bucket.addToResourcePolicy(
        new PolicyStatement({
            sid: 'HttpsOnly',
            resources: [
                `${s3Bucket.bucketArn}/*`
            ],
            actions: ['*'],
            principals: [new AnyPrincipal()],
            effect: Effect.DENY,
            conditions:
            {
                Bool: {
                    'aws:SecureTransport': 'false'
                }
            }
        })
    );
}

function s3BucketWithLogging(scope: cdk.Construct, s3BucketProps?: s3.BucketProps, bucketId?: string): [s3.Bucket, s3.Bucket?] {

    // Create the Application Bucket
    let bucketprops;
    let loggingBucket;
    const _bucketId = bucketId ? bucketId + 'S3Bucket' : 'S3Bucket';
    const _loggingBucketId = bucketId ? bucketId + 'S3LoggingBucket' : 'S3LoggingBucket';

    if (s3BucketProps?.serverAccessLogsBucket) {
        bucketprops = DefaultS3Props();
    } else {
        // Create the Logging Bucket
        loggingBucket = new s3.Bucket(scope, _loggingBucketId, DefaultS3Props());

        applySecureBucketPolicy(loggingBucket);

        // Extract the CfnBucket from the loggingBucket
        const loggingBucketResource = loggingBucket.node.findChild('Resource') as s3.CfnBucket;

        // Override accessControl configuration and add metadata for the logging bucket
        loggingBucketResource.addPropertyOverride('AccessControl', 'LogDeliveryWrite');
        loggingBucketResource.cfnOptions.metadata = {
            cfn_nag: {
                rules_to_suppress: [{
                    id: 'W35',
                    reason: `This S3 bucket is used as the access logging bucket for another bucket`
                }]
            }
        };
        bucketprops = DefaultS3Props(loggingBucket);
    }

    if (s3BucketProps) {
        bucketprops = overrideProps(bucketprops, s3BucketProps);
    }
    const s3Bucket: s3.Bucket = new s3.Bucket(scope, _bucketId, bucketprops);

    applySecureBucketPolicy(s3Bucket);

    return [s3Bucket, loggingBucket];
}