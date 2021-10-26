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

import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import { DefaultS3Props } from './s3-bucket-defaults';
import { overrideProps, addCfnSuppressRules } from './utils';
import { PolicyStatement, Effect, AnyPrincipal } from '@aws-cdk/aws-iam';
import { StorageClass } from '@aws-cdk/aws-s3';
import { Duration } from '@aws-cdk/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from '@aws-cdk/core';

export interface BuildS3BucketProps {
  /**
   * User provided props to override the default props for the S3 Bucket.
   *
   * @default - Default props are used
   */
  readonly bucketProps?: s3.BucketProps
  /**
   * User provided props to override the default props for the S3 Logging Bucket.
   *
   * @default - Default props are used
   */
  readonly loggingBucketProps?: s3.BucketProps
}

export function buildS3Bucket(scope: Construct, props: BuildS3BucketProps, bucketId?: string): [s3.Bucket, s3.Bucket?] {
  return s3BucketWithLogging(scope, props.bucketProps, bucketId, props.loggingBucketProps);
}

export function applySecureBucketPolicy(s3Bucket: s3.Bucket): void {

  // Apply bucket policy to enforce encryption of data in transit

  s3Bucket.addToResourcePolicy(
    new PolicyStatement({
      sid: 'HttpsOnly',
      resources: [
        `${s3Bucket.bucketArn}/*`,
        `${s3Bucket.bucketArn}`
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

export function createLoggingBucket(scope: Construct,
  bucketId: string,
  loggingBucketProps: s3.BucketProps): s3.Bucket {

  // Create the Logging Bucket
  const loggingBucket: s3.Bucket = new s3.Bucket(scope, bucketId, loggingBucketProps);

  applySecureBucketPolicy(loggingBucket);

  // Extract the CfnBucket from the loggingBucket
  const loggingBucketResource = loggingBucket.node.findChild('Resource') as s3.CfnBucket;

  // Override accessControl configuration and add metadata for the logging bucket
  loggingBucketResource.addPropertyOverride('AccessControl', 'LogDeliveryWrite');

  // Remove the default LifecycleConfiguration for the Logging Bucket
  loggingBucketResource.addPropertyDeletionOverride('LifecycleConfiguration.Rules');

  let _reason = "This S3 bucket is used as the access logging bucket for another bucket";

  if (bucketId === 'CloudfrontLoggingBucket') {
    _reason = "This S3 bucket is used as the access logging bucket for CloudFront Distribution";
  }

  addCfnSuppressRules(loggingBucketResource, [
    {
      id: 'W35',
      reason: _reason
    }
  ]);

  return loggingBucket;
}

export function createAlbLoggingBucket(scope: Construct,
  bucketId: string,
  loggingBucketProps: s3.BucketProps): s3.Bucket {

  // Create the Logging Bucket
  const loggingBucket: s3.Bucket = new s3.Bucket(scope, bucketId, loggingBucketProps);

  applySecureBucketPolicy(loggingBucket);

  // Extract the CfnBucket from the loggingBucket
  const loggingBucketResource = loggingBucket.node.findChild('Resource') as s3.CfnBucket;

  addCfnSuppressRules(loggingBucketResource, [
    {
      id: 'W35',
      reason: "This is a log bucket for an Application Load Balancer"
    }
  ]);

  return loggingBucket;
}

function s3BucketWithLogging(scope: Construct,
  s3BucketProps?: s3.BucketProps,
  bucketId?: string,
  userLoggingBucketProps?: s3.BucketProps): [s3.Bucket, s3.Bucket?] {

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
    let loggingBucketProps;

    if (userLoggingBucketProps) { // User provided logging bucket props
      loggingBucketProps = overrideProps(DefaultS3Props(), userLoggingBucketProps);
    } else if (s3BucketProps?.removalPolicy) { // Deletes logging bucket only if it is empty
      loggingBucketProps = overrideProps(DefaultS3Props(), { removalPolicy: s3BucketProps.removalPolicy });
    } else { // Default S3 bucket props
      loggingBucketProps = DefaultS3Props();
    }

    loggingBucket = createLoggingBucket(scope, _loggingBucketId, loggingBucketProps);

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
  addCfnSuppressRules(fnResource, [
    {
      id: 'W58',
      reason: `Lambda functions has the required permission to write CloudWatch Logs. It uses custom policy instead of arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole with tighter permissions.`
    },
    {
      id: 'W89',
      reason: `This is not a rule for the general case, just for specific use cases/industries`
    },
    {
      id: 'W92',
      reason: `Impossible for us to define the correct concurrency for clients`
    }
  ]);

  // Extract the CfnPolicy from the iam.Policy
  const policyResource = notificationsResourceHandlerRolePolicy.node.findChild('Resource') as iam.CfnPolicy;
  addCfnSuppressRules(policyResource, [
    {
      id: 'W12',
      reason: `Bucket resource is '*' due to circular dependency with bucket and role creation at the same time`
    }
  ]);
}
