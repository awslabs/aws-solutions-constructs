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
import { buildTopic } from './sns-helper';
import { overrideProps } from './utils';
import * as sns from 'aws-cdk-lib/aws-sns';

export interface TextractProps {
  readonly asyncJobs?: boolean;
  readonly existingSourceBucketObj?: s3.IBucket;
  readonly sourceBucketProps?: s3.BucketProps;
  readonly existingDestinationBucketObj?: s3.IBucket;
  readonly destinationBucketProps?: s3.BucketProps;
  readonly useSameBucket?: boolean;
  readonly createCustomerManagedOutputBucket?: boolean;
  readonly sourceLoggingBucketProps?: s3.BucketProps;
  readonly destinationLoggingBucketProps?: s3.BucketProps;
  readonly logSourceS3AccessLogs?: boolean;
  readonly logDestinationS3AccessLogs?: boolean;
  readonly sourceBucketEnvironmentVariableName?: string;
  readonly destinationBucketEnvironmentVariableName?: string;
  readonly dataAccessRoleArnEnvironmentVariableName?: string;
  readonly snsNotificationTopicArnEnvironmentVariableName?: string;
  readonly existingNotificationTopicObj?: sns.Topic;
  readonly existingNotificationTopicEncryptionKey?: kms.Key;
  readonly notificationTopicProps?: sns.TopicProps;
  readonly enableNotificationTopicEncryptionWithCustomerManagedKey?: boolean;
  readonly notificationTopicEncryptionKey?: kms.Key;
  readonly notificationTopicEncryptionKeyProps?: kms.KeyProps;
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
  readonly snsNotificationTopic?: sns.Topic,
  readonly notificationTopicEncryptionKey?: kms.Key,
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
    lambdaIamActionsRequired: [...syncPermissions],
  };

  if (props.asyncJobs) {
    const buildTopicResponse = buildTopic(scope, id, {
      existingTopicObj: props.existingNotificationTopicObj,
      existingTopicEncryptionKey: props.existingNotificationTopicEncryptionKey,
      topicProps: props.notificationTopicProps,
      enableEncryptionWithCustomerManagedKey: props.enableNotificationTopicEncryptionWithCustomerManagedKey,
      encryptionKey: props.notificationTopicEncryptionKey,
      encryptionKeyProps: props.notificationTopicEncryptionKeyProps
    });
    // Setup notification topic
    configuration = overrideProps(configuration, {
      snsNotificationTopic: buildTopicResponse.topic,
    });
    if (buildTopicResponse.key) {
      configuration = overrideProps(configuration, { notificationTopicEncryptionKey: buildTopicResponse.key });
    }

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

    if (props.createCustomerManagedOutputBucket !== false) {
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
    }

    // Set up role that is sent to the Textract service
    const textractServiceRole = new iam.Role(scope, `${id}-textract-service-role`, {
      assumedBy: new iam.ServicePrincipal('textract.amazonaws.com'),
    });
    configuration.destinationBucket?.bucketInterface.grantReadWrite(textractServiceRole);
    configuration.sourceBucket?.bucketInterface.grantRead(textractServiceRole);
    configuration.snsNotificationTopic!.grantPublish(textractServiceRole);
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
    CheckTextractSnsProps(props);
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
    if (props.existingNotificationTopicObj || props.notificationTopicProps || props.existingNotificationTopicEncryptionKey ||
      props.enableNotificationTopicEncryptionWithCustomerManagedKey !== undefined || props.notificationTopicEncryptionKey ||
      props.notificationTopicEncryptionKeyProps) {
      errorMessages += 'SNS topic properties can only be provided when asyncJobs is true';
      errorFound = true;
    }
  }

  // If useSameBucket is true, no destination bucket props should be provided
  if (props.useSameBucket) {
    if (props.existingDestinationBucketObj || props.destinationBucketProps ||
      props.destinationLoggingBucketProps || props.logDestinationS3AccessLogs !== undefined) {
      errorMessages += 'Destination bucket properties cannot be provided when useSameBucket is true\n';
      errorFound = true;
    }
  }

  // If createCustomerManagedOutputBucket is explicitly false, no output bucket properties should be provided
  if (props.createCustomerManagedOutputBucket === false) {
    if (props.existingDestinationBucketObj || props.destinationBucketProps ||
      props.destinationLoggingBucketProps || props.logDestinationS3AccessLogs !== undefined ||
      props.useSameBucket) {
      errorMessages += 'Output bucket properties cannot be provided when createCustomerManagedOutputBucket is false';
      errorFound = true;
    }
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }
}

/*
 * Because the notification topic is a secondary resource
 * for textract configurations, the prop names are different
 * than when SNS is primary resource. CheckTextractSnsProps() is
 * a clone of the CheckSnsProps() in sns-helper.ts using the
 * Textract notification topic specific names. This has a risk of
 * getting out of sync going forward - but this seemed a better
 * solution than CheckSnsProps throwing error messages with the
 * wrong property names.
 */
export interface TextractSnsProps {
  readonly notificationTopicProps?: sns.TopicProps,
  readonly existingNotificationTopicObj?: sns.Topic,
  readonly existingNotificationTopicObject?: sns.Topic,
  readonly notificationTopicEncryptionKey?: kms.Key,
  readonly notificationTopicEncryptionKeyProps?: kms.KeyProps
}

export function CheckTextractSnsProps(propsObject: TextractSnsProps | any) {
  let errorMessages = '';
  let errorFound = false;

  // FargateToSns used TopicObject instead of TopicObj - to fix would be a breaking change, so we
  // must look for both here.
  if (propsObject.notificationTopicProps && (propsObject.existingNotificationTopicObj || propsObject.existingNotificationTopicObject)) {
    errorMessages += 'Error - Either provide notificationTopicProps or existingNotificationTopicObj, but not both.\n';
    errorFound = true;
  }

  if (propsObject.notificationTopicProps?.masterKey && propsObject.notificationTopicEncryptionKey) {
    errorMessages += 'Error - Either provide notificationTopicProps.masterKey or notificationTopicEncryptionKey, but not both.\n';
    errorFound = true;
  }

  if (propsObject.notificationTopicProps?.masterKey && propsObject.notificationTopicEncryptionKeyProps) {
    errorMessages += 'Error - Either provide notificationTopicProps.masterKey or notificationTopicEncryptionKeyProps, but not both.\n';
    errorFound = true;
  }

  if (propsObject.notificationTopicEncryptionKey && propsObject.notificationTopicEncryptionKeyProps) {
    errorMessages += 'Error - Either provide notificationTopicEncryptionKey or notificationTopicEncryptionKeyProps, but not both.\n';
    errorFound = true;
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }
}
