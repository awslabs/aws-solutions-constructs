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
import * as kms from 'aws-cdk-lib/aws-kms';
import { CheckS3Props, buildS3Bucket } from './s3-bucket-helper';
import { buildTopic, CheckSnsProps } from './sns-helper';
import { overrideProps } from './utils';
import * as sns from 'aws-cdk-lib/aws-sns';

export interface TextractProps {
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
  readonly existingTopicObj?: sns.Topic;
  readonly existingTopicEncryptionKey?: kms.Key;
  readonly topicProps?: sns.TopicProps;
  readonly enableEncryptionWithCustomerManagedKey?: boolean;
  readonly encryptionKey?: kms.Key;
  readonly encryptionKeyProps?: kms.KeyProps;
}

export interface TextractBucketDetails {
  readonly bucket?: s3.Bucket,
  readonly bucketInterface: s3.IBucket,
  readonly loggingBucket?: s3.Bucket
}

export interface TextractConfiguration {
  readonly textractRole?: iam.Role,
  readonly lambdaIamActionsRequired: string[],
  readonly sourceBucket?: TextractBucketDetails,
  readonly destinationBucket?: TextractBucketDetails,
  readonly snsTopic?: sns.Topic
}

const syncPermissions = [
  'textract:DetectDocumentText',
  'textract:AnalyzeDocument',
  'textract:AnalyzeExpense',
  'textract:AnalyzeID'
];

const asyncPermissions = [
  'texttract:StartDocumentTextDetection',
  'texttract:GetDocumentTextDetection',
  'textract:StartDocumentAnalysis',
  'textract:GetDocumentAnalysis',
  'textract:StartExpenseAnalysis',
  'textract:GetExpenseAnalysis',
  'textract:StartLendingAnalysis',
  'textract:GetLendingAnalysis'
];

export function ConfigureTextractSupport(scope: Construct, id: string, props: TextractProps): TextractConfiguration {

  let configuration: TextractConfiguration = {
    lambdaIamActionsRequired: [ ...syncPermissions],
  };

  if (props.asyncJobs) {
    // Setup notification topic
    configuration = overrideProps(configuration, {
      snsTopic: buildTopic(scope, id, {
        existingTopicObj: props.existingTopicObj,
        existingTopicEncryptionKey: props.existingTopicEncryptionKey,
        topicProps: props.topicProps,
        enableEncryptionWithCustomerManagedKey: props.enableEncryptionWithCustomerManagedKey,
        encryptionKey: props.encryptionKey,
        encryptionKeyProps: props.encryptionKeyProps
      }).topic
    });

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

    // Set up role that is sent to the Textract service
    const textractServiceRole = new iam.Role(scope, `${id}-textract-service-role`, {
      assumedBy: new iam.ServicePrincipal('textract.amazonaws.com'),
    });
    configuration.destinationBucket?.bucketInterface.grantReadWrite(textractServiceRole);
    configuration.sourceBucket?.bucketInterface.grantRead(textractServiceRole);
    configuration.snsTopic!.grantPublish(textractServiceRole);
    configuration = overrideProps(configuration, {
      textractRole: textractServiceRole
    }, false);

    // Give the Lambda function additional permissions
    asyncPermissions.forEach((permission) => {
      configuration.lambdaIamActionsRequired.push(permission);
    });

  }
  return configuration;
}

export function CheckTextractProps(props: TextractProps): void {
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

    // Check SNS topic props
    CheckSnsProps(props);
  }

  // If asyncJobs is false, no S3 bucket props should be provided
  if (!props.asyncJobs) {
    if (props.existingSourceBucketObj || props.sourceBucketProps ||
      props.existingDestinationBucketObj || props.destinationBucketProps ||
      props.sourceLoggingBucketProps || props.destinationLoggingBucketProps ||
      props.logSourceS3AccessLogs !== undefined || props.logDestinationS3AccessLogs !== undefined ||
      props.sourceBucketEnvironmentVariableName || props.destinationBucketEnvironmentVariableName ||
      props.dataAccessRoleArnEnvironmentVariableName || props.useSameBucket) {
      errorMessages += 'S3 bucket properties can only be provided when asyncJobs is true\n';
      errorFound = true;
    }

    // Check SNS topic props separately for clearer error message
    if (props.existingTopicObj || props.topicProps || props.existingTopicEncryptionKey ||
      props.enableEncryptionWithCustomerManagedKey !== undefined || props.encryptionKey || props.encryptionKeyProps) {
      errorMessages += 'SNS topic properties can only be provided when asyncJobs is true';
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
