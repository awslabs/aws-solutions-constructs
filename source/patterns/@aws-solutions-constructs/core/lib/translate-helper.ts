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

/**
 * Check Translate-specific props for validity
 * @param props - The props object to validate
 */
export function CheckTranslateProps(props: any): void {
  // If asyncJobs is false, no S3 bucket props should be provided
  if (!props.asyncJobs) {
    if (props.existingSourceBucketObj || props.sourceBucketProps ||
        props.existingDestinationBucketObj || props.destinationBucketProps ||
        props.sourceLoggingBucketProps || props.destinationLoggingBucketProps ||
        props.logSourceS3AccessLogs !== undefined || props.logDestinationS3AccessLogs !== undefined ||
        props.sourceBucketEnvironmentVariableName || props.destinationBucketEnvironmentVariableName) {
      throw new Error('S3 bucket properties can only be provided when asyncJobs is true');
    }
  }

  // If useSameBucket is true, no destination bucket props should be provided
  if (props.useSameBucket) {
    if (props.existingDestinationBucketObj || props.destinationBucketProps ||
        props.destinationLoggingBucketProps || props.logDestinationS3AccessLogs !== undefined) {
      throw new Error('Destination bucket properties cannot be provided when useSameBucket is true');
    }
  }
}
