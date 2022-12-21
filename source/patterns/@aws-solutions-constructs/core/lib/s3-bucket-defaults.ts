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

import * as s3 from 'aws-cdk-lib/aws-s3';
import { RemovalPolicy } from 'aws-cdk-lib';
import { Bucket, BucketProps } from 'aws-cdk-lib/aws-s3';

export function DefaultS3Props(loggingBucket?: Bucket, lifecycleRules?: s3.LifecycleRule[]): s3.BucketProps {
  return {
    encryption: s3.BucketEncryption.S3_MANAGED,
    versioned: true,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    removalPolicy: RemovalPolicy.RETAIN,
    enforceSSL: true,
    ...((lifecycleRules !== undefined) && { lifecycleRules }),
    ...((loggingBucket !== undefined) && { serverAccessLogsBucket: loggingBucket })
  } as BucketProps;
}

export function DefaultLoggingBucketProps(): s3.BucketProps {
  return {
    encryption: s3.BucketEncryption.S3_MANAGED,
    versioned: true,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    removalPolicy: RemovalPolicy.RETAIN,
    enforceSSL: true,
  } as BucketProps;
}

// Default event types to trigger S3 notifications
export const defaultS3NotificationEventTypes = [s3.EventType.OBJECT_CREATED];