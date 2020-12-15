/**
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import { DefaultS3Props } from './s3-bucket-defaults';
import { overrideProps } from './utils';
import { PolicyStatement, Effect, AnyPrincipal } from '@aws-cdk/aws-iam';
import { StorageClass } from '@aws-cdk/aws-s3/lib/rule';
import { Duration } from '@aws-cdk/core/lib/duration';
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

export function createLoggingBucket(scope: cdk.Construct, bucketId: string): s3.Bucket {
  // Create the Logging Bucket
  const loggingBucket: s3.Bucket = new s3.Bucket(scope, bucketId, DefaultS3Props());

  applySecureBucketPolicy(loggingBucket);

  // Extract the CfnBucket from the loggingBucket
  const loggingBucketResource = loggingBucket.node.findChild('Resource') as s3.CfnBucket;

  // Override accessControl configuration and add metadata for the logging bucket
  loggingBucketResource.addPropertyOverride('AccessControl', 'LogDeliveryWrite');

  // Turn off Versioning for the logging bucket as objects will be written only ONCE
  loggingBucketResource.addPropertyDeletionOverride('VersioningConfiguration.Status');

  // Remove the default LifecycleConfiguration for the Logging Bucket
  loggingBucketResource.addPropertyDeletionOverride('LifecycleConfiguration.Rules');

  let _reason = "This S3 bucket is used as the access logging bucket for another bucket";

  if (bucketId === 'CloudfrontLoggingBucket') {
    _reason = "This S3 bucket is used as the access logging bucket for CloudFront Distribution";
  }

  loggingBucketResource.cfnOptions.metadata = {
    cfn_nag: {
      rules_to_suppress: [{
        id: 'W35',
        reason: _reason
      }]
    }
  };

  return loggingBucket;
}

function s3BucketWithLogging(scope: cdk.Construct, s3BucketProps?: s3.BucketProps, bucketId?: string): [s3.Bucket, s3.Bucket?] {

  /** Default Life Cycle policy to transition older versions to Glacier after 90 days */
  const lifecycleRules: s3.LifecycleRule[] = [{
    noncurrentVersionTransitions: [{
      storageClass: StorageClass.GLACIER,
      transitionAfter: Duration.days(90)
    }]
  }];

  // Create the Application Bucket
  let bucketprops: s3.BucketProps;
  let loggingBucket;
  const _bucketId = bucketId ? bucketId + 'S3Bucket' : 'S3Bucket';
  const _loggingBucketId = bucketId ? bucketId + 'S3LoggingBucket' : 'S3LoggingBucket';

  if (s3BucketProps?.serverAccessLogsBucket) {
    // Attach the Default Life Cycle policy ONLY IF the versioning is ENABLED
    if (s3BucketProps.versioned === undefined || s3BucketProps.versioned) {
      bucketprops = DefaultS3Props(undefined, lifecycleRules);
    } else {
      bucketprops = DefaultS3Props();
    }
  } else {
    // Create the Logging Bucket
    loggingBucket = createLoggingBucket(scope, _loggingBucketId);

    // Attach the Default Life Cycle policy ONLY IF the versioning is ENABLED
    if (s3BucketProps?.versioned === undefined || s3BucketProps.versioned) {
      bucketprops = DefaultS3Props(loggingBucket, lifecycleRules);
    } else {
      bucketprops = DefaultS3Props(loggingBucket);
    }
  }

  if (s3BucketProps) {
    bucketprops = overrideProps(bucketprops, s3BucketProps);
  }

  const s3Bucket: s3.Bucket = new s3.Bucket(scope, _bucketId, bucketprops);

  applySecureBucketPolicy(s3Bucket);

  return [s3Bucket, loggingBucket];
}

export function addCfnNagS3BucketNotificationRulesToSuppress(stackRoot: cdk.Stack, logicalId: string) {
  const notificationsResourceHandler = stackRoot.node.tryFindChild(logicalId) as lambda.Function;
  const notificationsResourceHandlerRoleRole = notificationsResourceHandler.node.findChild('Role') as iam.Role;
  const notificationsResourceHandlerRolePolicy = notificationsResourceHandlerRoleRole.node.findChild('DefaultPolicy') as iam.Policy;

  // Extract the CfnFunction from the Function
  const fnResource = notificationsResourceHandler.node.findChild('Resource') as lambda.CfnFunction;

  fnResource.cfnOptions.metadata = {
    cfn_nag: {
      rules_to_suppress: [{
        id: 'W58',
        reason: `Lambda function has permission to write CloudWatch Logs via AWSLambdaBasicExecutionRole policy attached to the lambda role`
      }]
    }
  };

  // Extract the CfnPolicy from the iam.Policy
  const policyResource = notificationsResourceHandlerRolePolicy.node.findChild('Resource') as iam.CfnPolicy;

  policyResource.cfnOptions.metadata = {
    cfn_nag: {
      rules_to_suppress: [{
        id: 'W12',
        reason: `Bucket resource is '*' due to circular dependency with bucket and role creation at the same time`
      }]
    }
  };
}
