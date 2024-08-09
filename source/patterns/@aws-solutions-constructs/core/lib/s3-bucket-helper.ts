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

import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import { DefaultS3Props } from './s3-bucket-defaults';
import { overrideProps, addCfnSuppressRules, consolidateProps, CheckBooleanWithDefault } from './utils';
import { StorageClass } from 'aws-cdk-lib/aws-s3';
import { Duration } from 'aws-cdk-lib';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

export interface BuildS3BucketProps {
  /**
   * User provided props to override the default props for the S3 Bucket.
   *
   * @default - Default props are used
   */
  readonly bucketProps?: s3.BucketProps;
  /**
   * User provided props to override the default props for the S3 Logging Bucket.
   *
   * @default - Default props are used
   */
  readonly loggingBucketProps?: s3.BucketProps;
  /**
   * Whether to turn on Access Logs for S3. Uses an S3 bucket with associated storage costs.
   * Enabling Access Logging is a best practice.
   *
   * @default - true
   */
  readonly logS3AccessLogs?: boolean;
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function createS3AccessLoggingBucket(scope: Construct,
  bucketId: string,
  loggingBucketProps: s3.BucketProps): s3.Bucket {

  // Introduce the default props since we can't be certain the caller used them and
  // they are important best practices
  const combinedBucketProps = consolidateProps(DefaultS3Props(), loggingBucketProps);

  // Create the Logging Bucket
  // NOSONAR  (typescript:S6281)
  // Block Public Access is set by DefaultS3Props, but Sonarqube can't detect it
  // It is verified by 's3 bucket with default props' in the unit tests
  // NOSONAR (typescript:S6245)
  // Encryption is turned on in the default properties that Sonarqube doesn't see
  // Verified by unit test 's3 bucket with default props'
  // NOSONAR (typescript:S6249)
  // enforceSSL  is turned on in the default properties that Sonarqube doesn't see
  // Verified by unit test 's3 bucket with default props'
  // NOSONAR (typescript:typescript:S6249)
  // versioning is turned on in the default properties that Sonarqube doesn't see
  // Verified by unit test 's3 bucket with default props'
  const loggingBucket: s3.Bucket = new s3.Bucket(scope, bucketId, combinedBucketProps); // NOSONAR

  addCfnSuppressRules(loggingBucket, [
    {
      id: 'W35',
      reason: "This S3 bucket is used as the access logging bucket for another bucket"
    }
  ]);

  return loggingBucket;
}

export interface CreateCloudFrontLoggingBucketRequest {
  readonly loggingBucketProps: s3.BucketProps,
  readonly s3AccessLogBucketProps?: s3.BucketProps,
  readonly enableS3AccessLogs?: boolean
}

export interface CreateCloudFrontLoggingBucketResponse {
  readonly logBucket: s3.Bucket,
  readonly s3AccessLogBucket?: s3.Bucket
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function createCloudFrontLoggingBucket(scope: Construct,
  bucketId: string,
  props: CreateCloudFrontLoggingBucketRequest): CreateCloudFrontLoggingBucketResponse {

  let cloudFrontLogAccessLogBucket: s3.Bucket | undefined;

  // Introduce the default props since we can't be certain the caller used them and
  // they are important best practices
  let combinedBucketProps = consolidateProps(DefaultS3Props(), props.loggingBucketProps);

  if (!props.loggingBucketProps.serverAccessLogsBucket) {
    // Create bucket and add to props
    const combinedS3LogBucketProps = consolidateProps(DefaultS3Props(), props.s3AccessLogBucketProps);

    if (CheckBooleanWithDefault(props.enableS3AccessLogs, true)) {
      cloudFrontLogAccessLogBucket = new s3.Bucket(scope, `${bucketId}AccessLog`, combinedS3LogBucketProps); // NOSONAR
      combinedBucketProps = overrideProps(combinedBucketProps, { serverAccessLogsBucket: cloudFrontLogAccessLogBucket });
      addCfnSuppressRules(cloudFrontLogAccessLogBucket, [
        {
          id: 'W35',
          reason: "This S3 bucket is used as the access logging bucket for another bucket"
        }
      ]);
    }
  }

  // Create the Logging Bucket
  // NOSONAR  (typescript:S6281)
  // Block Public Access is set by DefaultS3Props, but Sonarqube can't detect it
  // It is verified by 's3 bucket with default props' in the unit tests
  // NOSONAR (typescript:S6245)
  // Encryption is turned on in the default properties that Sonarqube doesn't see
  // Verified by unit test 's3 bucket with default props'
  // NOSONAR (typescript:S6249)
  // enforceSSL  is turned on in the default properties that Sonarqube doesn't see
  // Verified by unit test 's3 bucket with default props'
  // NOSONAR (typescript:typescript:S6249)
  // versioning is turned on in the default properties that Sonarqube doesn't see
  // Verified by unit test 's3 bucket with default props'
  const cloudfrontLogBucket: s3.Bucket = new s3.Bucket(scope, bucketId, combinedBucketProps); // NOSONAR

  return {
    logBucket: cloudfrontLogBucket,
    s3AccessLogBucket: cloudFrontLogAccessLogBucket
  };
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function createAlbLoggingBucket(scope: Construct,
  bucketId: string,
  loggingBucketProps: s3.BucketProps): s3.Bucket {

  // Introduce the default props since we can't be certain the caller used them and
  // they are important best practices
  const combinedBucketProps = consolidateProps(DefaultS3Props(), loggingBucketProps);

  // Create the Logging Bucket
  // NOSONAR (typescript:S6281)
  // Block Public Access is set by DefaultS3Props, but Sonarqube can't detect it
  // It is verified by 's3 bucket with default props' in the unit tests
  // NOSONAR (typescript:S6245)
  // Encryption is turned on in the default properties that Sonarqube doesn't see
  // Verified by unit test 's3 bucket with default props'
  // NOSONAR (typescript:S6249)
  // enforceSSL  is turned on in the default properties that Sonarqube doesn't see
  // Verified by unit test 's3 bucket with default props'
  // NOSONAR (typescript:typescript:S6249)
  // versioning is turned on in the default properties that Sonarqube doesn't see
  // Verified by unit test 's3 bucket with default props'
  const loggingBucket: s3.Bucket = new s3.Bucket(scope, bucketId, combinedBucketProps); // NOSONAR

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

export interface BuildS3BucketResponse {
  readonly bucket: s3.Bucket,
  readonly loggingBucket?: s3.Bucket
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 * @internal This functionality is exposed externally through aws-constructs-factories
 */
export function buildS3Bucket(scope: Construct,
  props: BuildS3BucketProps,
  bucketId?: string): BuildS3BucketResponse {

  /** Default Life Cycle policy to transition older versions to Glacier after 90 days */
  const lifecycleRules: s3.LifecycleRule[] = [{
    noncurrentVersionTransitions: [{
      storageClass: StorageClass.GLACIER,
      transitionAfter: Duration.days(90)
    }]
  }];

  // Create the Application Bucket
  let defaultBucketProps: s3.BucketProps;
  let loggingBucket;
  const resolvedBucketId = bucketId ? bucketId + 'S3Bucket' : 'S3Bucket';
  const loggingBucketId = bucketId ? bucketId + 'S3LoggingBucket' : 'S3LoggingBucket';

  // If logging S3 access logs is enabled/undefined and an existing bucket object is not provided
  if (props.logS3AccessLogs !== false && !(props.bucketProps?.serverAccessLogsBucket)) {
    // Create the Logging Bucket
    let loggingBucketProps = DefaultS3Props();

    if (props.loggingBucketProps) {
      // User provided logging bucket props
      loggingBucketProps = overrideProps(loggingBucketProps, props.loggingBucketProps);
    } else if (props.bucketProps?.removalPolicy) {
      // If the client explicitly specified a removal policy for the main bucket,
      // then replicate that policy on the logging bucket
      loggingBucketProps = overrideProps(loggingBucketProps, { removalPolicy: props.bucketProps.removalPolicy });
    }

    loggingBucket = createS3AccessLoggingBucket(scope, loggingBucketId, loggingBucketProps);
  } else if (props.bucketProps?.serverAccessLogsBucket) {
    loggingBucket = props.bucketProps?.serverAccessLogsBucket as s3.Bucket;
  }

  // Attach the Default Life Cycle policy ONLY IF the versioning is ENABLED
  if (props.bucketProps?.versioned === undefined || props.bucketProps.versioned) {
    defaultBucketProps = DefaultS3Props(loggingBucket, lifecycleRules);
  } else {
    defaultBucketProps = DefaultS3Props(loggingBucket);
  }

  const combinedBucketProps = consolidateProps(defaultBucketProps, props.bucketProps);

  // NOSONAR (typescript:S6281) - Block Public Access is set by DefaultS3Props,
  // but Sonarqube can't detect it
  // It is verified by 's3 bucket with default props' in the unit tests
  // NOSONAR (typescript:S6245)
  // Encryption is turned on in the default properties that Sonarqube doesn't see
  // Verified by unit test 's3 bucket with default props'
  // NOSONAR (typescript:S6249)
  // enforceSSL  is turned on in the default properties that Sonarqube doesn't see
  // Verified by unit test 's3 bucket with default props'
  // NOSONAR (typescript:typescript:S6249)
  // versioning is turned on in the default properties that Sonarqube doesn't see
  // Verified by unit test 's3 bucket with default props'
  const s3Bucket: s3.Bucket = new s3.Bucket(scope, resolvedBucketId, combinedBucketProps ); // NOSONAR

  return { bucket: s3Bucket, loggingBucket };
}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
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

export interface S3Props {
  readonly existingBucketObj?: s3.Bucket,
  readonly existingBucketInterface?: s3.IBucket,
  readonly bucketProps?: s3.BucketProps,
  readonly existingLoggingBucketObj?: s3.IBucket;
  readonly loggingBucketProps?: s3.BucketProps;
  readonly logS3AccessLogs?: boolean;
}

export function CheckS3Props(propsObject: S3Props | any) {
  let errorMessages = '';
  let errorFound = false;

  if ((propsObject.existingBucketObj || propsObject.existingBucketInterface) && propsObject.bucketProps) {
    errorMessages += 'Error - Either provide bucketProps or existingBucketObj, but not both.\n';
    errorFound = true;
  }

  if (propsObject.existingLoggingBucketObj && propsObject.loggingBucketProps) {
    errorMessages += 'Error - Either provide existingLoggingBucketObj or loggingBucketProps, but not both.\n';
    errorFound = true;
  }

  if ((propsObject?.logS3AccessLogs === false) && (propsObject.loggingBucketProps || propsObject.existingLoggingBucketObj)) {
    errorMessages += 'Error - If logS3AccessLogs is false, supplying loggingBucketProps or existingLoggingBucketObj is invalid.\n';
    errorFound = true;
  }

  if (propsObject.existingBucketObj && (propsObject.loggingBucketProps || propsObject.logS3AccessLogs)) {
    errorMessages += 'Error - If existingBucketObj is provided, supplying loggingBucketProps or logS3AccessLogs is an error.\n';
    errorFound = true;
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }
}
