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
import { RemovalPolicy } from '@aws-cdk/core';
import { Bucket, BucketProps } from '@aws-cdk/aws-s3';
import { StorageClass } from '@aws-cdk/aws-s3/lib/rule';
import { Duration } from '@aws-cdk/core/lib/duration';

export function DefaultS3Props(loggingBucket ?: Bucket): s3.BucketProps {

    /** Default Life Cycle policy to transition older versions to Glacier after 90 days */
    const lifecycleRules: s3.LifecycleRule[] = [{
        noncurrentVersionTransitions: [{
            storageClass: StorageClass.GLACIER,
            transitionAfter: Duration.days(90)
        }]
    }];

    if (loggingBucket) {
        return {
            encryption: s3.BucketEncryption.S3_MANAGED,
            versioned: true,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: RemovalPolicy.RETAIN,
            lifecycleRules,
            serverAccessLogsBucket: loggingBucket
        } as BucketProps;
    } else {
        return {
            encryption: s3.BucketEncryption.S3_MANAGED,
            versioned: true,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: RemovalPolicy.RETAIN,
            lifecycleRules
        } as BucketProps;
    }
}