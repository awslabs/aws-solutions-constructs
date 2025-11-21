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
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface TranslateProps {
  readonly asyncJobs?: boolean;
  readonly existingSourceBucketObj?: s3.IBucket;
  readonly sourceBucketProps?: s3.BucketProps;
  readonly existingDestinationBucketObj?: s3.IBucket;
  readonly destinationBucketProps?: s3.BucketProps;
  readonly useSameBucket?: boolean;
  readonly additionalPermissions?: string[];
  readonly existingVpc?: ec2.IVpc;
  readonly vpcProps?: ec2.VpcProps;
  readonly deployVpc?: boolean;
  readonly sourceBucketEnvironmentVariableName?: string;
  readonly destinationBucketEnvironmentVariableName?: string;
  readonly dataAccessRoleArnEnvironmentVariableName?: string;
  readonly sourceLoggingBucketProps?: s3.BucketProps;
  readonly destinationLoggingBucketProps?: s3.BucketProps;
  readonly logSourceS3AccessLogs?: boolean;
  readonly logDestinationS3AccessLogs?: boolean;
}

export function CheckTranslateProps(props: TranslateProps): void {
  let errorMessages = '';
  let errorFound = false;

  // If asyncJobs is false, no S3 bucket props should be provided
  if (!props.asyncJobs) {
    if (props.existingSourceBucketObj || props.sourceBucketProps ||
      props.existingDestinationBucketObj || props.destinationBucketProps ||
      props.sourceLoggingBucketProps || props.destinationLoggingBucketProps ||
      props.logSourceS3AccessLogs !== undefined || props.logDestinationS3AccessLogs !== undefined ||
      props.sourceBucketEnvironmentVariableName || props.destinationBucketEnvironmentVariableName ||
      props.useSameBucket) {
      errorMessages += 'S3 bucket properties can only be provided when asyncJobs is true';
      errorFound = true;
    }
  }

  // If useSameBucket is true, no destination bucket props should be provided
  if (props.useSameBucket) {
    if (props.existingDestinationBucketObj || props.destinationBucketProps ||
      props.destinationLoggingBucketProps || props.logDestinationS3AccessLogs !== undefined) {
      errorMessages += 'Destination bucket properties cannot be provided when useSameBucket is true';
      errorFound = true;
    }
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }
}
