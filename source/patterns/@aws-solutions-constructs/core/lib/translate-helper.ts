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
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { CheckS3Props, buildS3Bucket } from './s3-bucket-helper';
import { overrideProps } from './utils';

export interface TranslateProps {
  readonly asyncJobs?: boolean;
  readonly existingSourceBucketObj?: s3.IBucket;
  readonly sourceBucketProps?: s3.BucketProps;
  readonly existingDestinationBucketObj?: s3.IBucket;
  readonly destinationBucketProps?: s3.BucketProps;
  readonly useSameBucket?: boolean;
  readonly sourceLoggingBucketProps?: s3.BucketProps;
  readonly destinationLoggingBucketProps?: s3.BucketProps;
  readonly logSourceS3AccessLogs?: boolean;
  readonly logDestinationS3AccessLogs?: boolean;
  readonly sourceBucketEnvironmentVariableName?: string;
  readonly destinationBucketEnvironmentVariableName?: string;
  readonly dataAccessRoleArnEnvironmentVariableName?: string;
}

export interface TranslateConfiguration {
  readonly translateRole?: iam.Role,
  readonly lambdaIamActionsRequired: string[],
  readonly sourceBucket?: BucketDetails,
  readonly destinationBucket?: BucketDetails,
}

export interface BucketDetails {
  readonly bucket?: s3.Bucket,
  readonly bucketInterface: s3.IBucket,
  readonly loggingBucket?: s3.Bucket
}

export function ConfigureTranslateSupport(scope: Construct, id: string, props: TranslateProps): TranslateConfiguration {

  let configuration: TranslateConfiguration = {
    lambdaIamActionsRequired: ['translate:TranslateText', 'translate:TranslateDocument'],
  };

  if (props.asyncJobs) {

    // Setup source S3 Bucket
    if (props.existingSourceBucketObj) {
      configuration = overrideProps(configuration, {
        sourceBucket: {
          bucketInterface: props.existingSourceBucketObj
        }
      }, false);
    } else {
      const buildSourceBucketResponse = buildS3Bucket(scope, {
        bucketProps: props.sourceBucketProps,
        loggingBucketProps: props.sourceLoggingBucketProps,
        logS3AccessLogs: props.logSourceS3AccessLogs
      }, `${id}-source-bucket`);
      configuration = overrideProps(configuration, {
        sourceBucket: {
          bucket: buildSourceBucketResponse.bucket,
          loggingBucket: buildSourceBucketResponse.loggingBucket,
          bucketInterface: buildSourceBucketResponse.bucket,
        }
      }, false);
    }

    // Setup destination S3 Bucket
    if (props.useSameBucket) {
      configuration = overrideProps(configuration, {
        destinationBucket: {
          bucketInterface: configuration.sourceBucket?.bucketInterface,
          bucket: configuration.sourceBucket?.bucket,
          loggingBucket: configuration.sourceBucket?.loggingBucket,
        }
      }, false);
    } else {
      if (props.existingDestinationBucketObj) {
        configuration = overrideProps(configuration, {
          destinationBucket: {
            bucketInterface: props.existingDestinationBucketObj
          }
        }, false);
      } else {
        const buildDestinationBucketResponse = buildS3Bucket(scope, {
          bucketProps: props.destinationBucketProps,
          loggingBucketProps: props.destinationLoggingBucketProps,
          logS3AccessLogs: props.logDestinationS3AccessLogs
        }, `${id}-destination-bucket`);
        configuration = overrideProps(configuration, {
          destinationBucket: {
            bucket: buildDestinationBucketResponse.bucket,
            loggingBucket: buildDestinationBucketResponse.loggingBucket,
            bucketInterface: buildDestinationBucketResponse.bucket,
          }
        }, false);
      }
    }

    // Set up role that is sent to the Translate service
    const translateServiceRole = new iam.Role(scope, `${id}-translate-service-role`, {
      assumedBy: new iam.ServicePrincipal('translate.amazonaws.com'),
    });
    configuration.destinationBucket?.bucketInterface.grantReadWrite(translateServiceRole);
    configuration.sourceBucket?.bucketInterface.grantRead(translateServiceRole);
    configuration = overrideProps(configuration, {
      translateRole: translateServiceRole
    }, false);

    // Give the Lambda function additional permissions
    configuration.lambdaIamActionsRequired.push("translate:DescribeTextTranslationJob");
    configuration.lambdaIamActionsRequired.push("translate:ListTextTranslationJobs");
    configuration.lambdaIamActionsRequired.push("translate:StartTextTranslationJob");
    configuration.lambdaIamActionsRequired.push("translate:StopTextTranslationJob");

  }
  return configuration;
}

export function CheckTranslateProps(props: TranslateProps): void {
  let errorMessages = '';
  let errorFound = false;

  if (props.asyncJobs) {

    // Check source bucket props
    const sourceS3Props = {
      existingBucketObj: props.existingSourceBucketObj,
      bucketProps: props.sourceBucketProps,
      loggingBucketProps: props.sourceLoggingBucketProps,
      logS3AccessLogs: props.logSourceS3AccessLogs
    };
    CheckS3Props(sourceS3Props);

    // Check destination bucket props (only if not using same bucket)
    if (!props.useSameBucket) {
      const destinationS3Props = {
        existingBucketObj: props.existingDestinationBucketObj,
        bucketProps: props.destinationBucketProps,
        loggingBucketProps: props.destinationLoggingBucketProps,
        logS3AccessLogs: props.logDestinationS3AccessLogs
      };
      CheckS3Props(destinationS3Props);
    }
  }

  // If asyncJobs is false, no S3 bucket props should be provided
  if (!props.asyncJobs) {
    if (props.existingSourceBucketObj || props.sourceBucketProps ||
      props.existingDestinationBucketObj || props.destinationBucketProps ||
      props.sourceLoggingBucketProps || props.destinationLoggingBucketProps ||
      props.logSourceS3AccessLogs !== undefined || props.logDestinationS3AccessLogs !== undefined ||
      props.sourceBucketEnvironmentVariableName || props.destinationBucketEnvironmentVariableName ||
       props.dataAccessRoleArnEnvironmentVariableName ||props.useSameBucket) {
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
