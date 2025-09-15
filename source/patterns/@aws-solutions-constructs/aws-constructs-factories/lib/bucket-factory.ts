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

// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as defaults from '@aws-solutions-constructs/core';

export interface S3BucketFactoryProps {
  readonly bucketProps?: s3.BucketProps | any,
  readonly logS3AccessLogs?: boolean,
  readonly loggingBucketProps?: s3.BucketProps,
}

// Create a response specifically for the interface to avoid coupling client with internal implementation
export interface S3BucketFactoryResponse {
  readonly s3Bucket: s3.Bucket,
  readonly s3LoggingBucket?: s3.Bucket,
}

export class BucketFactory {

  public static factory(scope: Construct, id: string, props: S3BucketFactoryProps): S3BucketFactoryResponse {
      defaults.CheckS3Props(props);

      const propsArg: defaults.BuildS3BucketProps = {
        bucketProps: props.bucketProps,
        loggingBucketProps: props.loggingBucketProps,
        logS3AccessLogs: props.logS3AccessLogs,
      };

      const buildS3BucketResponse = defaults.buildS3Bucket(scope, propsArg, id);

      return {
        s3Bucket: buildS3BucketResponse.bucket,
        s3LoggingBucket: buildS3BucketResponse.loggingBucket
      };
    }
  }
