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

import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import * as kms from 'aws-cdk-lib/aws-kms';
import { buildS3Bucket } from './s3-bucket-helper';
import { buildTopic } from './sns-helper';
import { overrideProps } from './utils';
import * as sns from 'aws-cdk-lib/aws-sns';

export interface PollyProps {
  readonly asyncJobs?: boolean;
  readonly existingBucketObj?: s3.IBucket;
  readonly bucketProps?: s3.BucketProps;
  readonly loggingBucketProps?: s3.BucketProps;
  readonly logS3AccessLogs?: boolean;
  readonly bucketEnvironmentVariableName?: string;
  readonly existingTopicObj?: sns.Topic;
  readonly existingTopicEncryptionKey?: kms.Key;
  readonly topicProps?: sns.TopicProps;
  readonly enableTopicEncryptionWithCustomerManagedKey?: boolean;
  readonly topicEncryptionKey?: kms.Key;
  readonly topicEncryptionKeyProps?: kms.KeyProps;
  readonly topicEnvironmentVariableName?: string;
}

export interface PollyBucketDetails {
  readonly bucket?: s3.Bucket,
  readonly bucketInterface: s3.IBucket,
  readonly loggingBucket?: s3.Bucket
}

export interface EnvironmentVariableDefinition {
  readonly defaultName: string;
  readonly clientNameOverride?: string;
  readonly value: string;
}

export interface PollyConfiguration {
  readonly destinationBucket?: PollyBucketDetails,
  readonly snsNotificationTopic?: sns.Topic,
  readonly notificationTopicEncryptionKey?: kms.Key,
  readonly lambdaIamActionsRequired: string[],
  readonly environmentVariables: EnvironmentVariableDefinition[],
}

const syncPermissions = [
  'polly:SynthesizeSpeech'
];

const asyncPermissions = [
  'polly:StartSpeechSynthesisTask',
  'polly:GetSpeechSynthesisTask',
  'polly:ListSpeechSynthesisTasks'
];

export function ConfigurePollySupport(scope: Construct, id: string, props: PollyProps): PollyConfiguration {

  let configuration: PollyConfiguration = {
    lambdaIamActionsRequired: [...syncPermissions],
    environmentVariables: [],
  };

  if (props.asyncJobs) {
    // Setup SNS notification topic
    const buildTopicResponse = buildTopic(scope, id, {
      existingTopicObj: props.existingTopicObj,
      existingTopicEncryptionKey: props.existingTopicEncryptionKey,
      topicProps: props.topicProps,
      enableEncryptionWithCustomerManagedKey: props.enableTopicEncryptionWithCustomerManagedKey,
      encryptionKey: props.topicEncryptionKey,
      encryptionKeyProps: props.topicEncryptionKeyProps
    });
    
    configuration = overrideProps(configuration, {
      snsNotificationTopic: buildTopicResponse.topic,
    });
    
    if (buildTopicResponse.key) {
      configuration = overrideProps(configuration, { notificationTopicEncryptionKey: buildTopicResponse.key });
    }

    // Setup S3 Bucket for audio output
    if (props.existingBucketObj) {
      configuration = overrideProps(configuration, {
        destinationBucket: {
          bucketInterface: props.existingBucketObj
        }
      }, false);
    } else {
      const buildBucketResponse = buildS3Bucket(scope, {
        bucketProps: props.bucketProps,
        loggingBucketProps: props.loggingBucketProps,
        logS3AccessLogs: props.logS3AccessLogs
      }, `${id}-output-bucket`);
      
      configuration = overrideProps(configuration, {
        destinationBucket: {
          bucket: buildBucketResponse.bucket,
          loggingBucket: buildBucketResponse.loggingBucket,
          bucketInterface: buildBucketResponse.bucket,
        }
      }, false);
    }

    // Add async permissions
    asyncPermissions.forEach((permission) => {
      configuration.lambdaIamActionsRequired.push(permission);
    });

    // Build environment variables
    configuration.environmentVariables.push({
      defaultName: 'OUTPUT_BUCKET_NAME',
      clientNameOverride: props.bucketEnvironmentVariableName,
      value: configuration.destinationBucket!.bucketInterface.bucketName
    });

    configuration.environmentVariables.push({
      defaultName: 'SNS_TOPIC_ARN',
      clientNameOverride: props.topicEnvironmentVariableName,
      value: configuration.snsNotificationTopic!.topicArn
    });
  }

  return configuration;
}

export function CheckPollyProps(props: PollyProps): void {
  let errorMessages = '';
  let errorFound = false;

  if (props.asyncJobs) {
    // Check for conflicting bucket props
    if (props.existingBucketObj && props.bucketProps) {
      errorMessages += 'Error - Either provide bucketProps or existingBucketObj, but not both.\n';
      errorFound = true;
    }

    // Check for conflicting topic props
    if (props.existingTopicObj && props.topicProps) {
      errorMessages += 'Error - Either provide topicProps or existingTopicObj, but not both.\n';
      errorFound = true;
    }

    // Check SNS encryption props
    if (props.topicProps?.masterKey && props.topicEncryptionKey) {
      errorMessages += 'Error - Either provide topicProps.masterKey or topicEncryptionKey, but not both.\n';
      errorFound = true;
    }

    if (props.topicProps?.masterKey && props.topicEncryptionKeyProps) {
      errorMessages += 'Error - Either provide topicProps.masterKey or topicEncryptionKeyProps, but not both.\n';
      errorFound = true;
    }

    if (props.topicEncryptionKey && props.topicEncryptionKeyProps) {
      errorMessages += 'Error - Either provide topicEncryptionKey or topicEncryptionKeyProps, but not both.\n';
      errorFound = true;
    }
  }

  // If asyncJobs is false or undefined, no bucket or topic props should be provided
  if (!props.asyncJobs) {
    if (props.existingBucketObj || props.bucketProps ||
      props.loggingBucketProps || props.logS3AccessLogs !== undefined ||
      props.bucketEnvironmentVariableName) {
      errorMessages += 'Error - Bucket properties can only be provided when asyncJobs is true.\n';
      errorFound = true;
    }

    if (props.existingTopicObj || props.topicProps ||
      props.existingTopicEncryptionKey || props.topicEncryptionKey ||
      props.topicEncryptionKeyProps || 
      props.enableTopicEncryptionWithCustomerManagedKey !== undefined ||
      props.topicEnvironmentVariableName) {
      errorMessages += 'Error - Topic properties can only be provided when asyncJobs is true.\n';
      errorFound = true;
    }
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }
}
