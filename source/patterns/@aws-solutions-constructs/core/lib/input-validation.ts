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

import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as kinesis from '@aws-cdk/aws-kinesis';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sqs from '@aws-cdk/aws-sqs';
import * as mediastore from '@aws-cdk/aws-mediastore';
import * as s3 from '@aws-cdk/aws-s3';
import * as sns from '@aws-cdk/aws-sns';
import * as glue from '@aws-cdk/aws-glue';
import * as sagemaker from '@aws-cdk/aws-sagemaker';
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";

export interface VerifiedProps {
  dynamoTableProps?: dynamodb.TableProps,
  existingTableObj?: dynamodb.Table,

  existingStreamObj?: kinesis.Stream;
  kinesisStreamProps?: kinesis.StreamProps,

  existingLambdaObj?: lambda.Function,
  lambdaFunctionProps?: lambda.FunctionProps,

  existingQueueObj?: sqs.Queue,
  queueProps?: sqs.QueueProps,
  deployDeadLetterQueue?: boolean,
  deadLetterQueueProps?: sqs.QueueProps,

  existingMediaStoreContainerObj?: mediastore.CfnContainer;
  mediaStoreContainerProps?: mediastore.CfnContainerProps;

  existingBucketObj?: s3.Bucket,
  bucketProps?: s3.BucketProps,

  // topicsProps is an incorrect attribute used in event-rule-sns that 
  // we need to support
  topicProps?: sns.TopicProps,
  topicsProps?: sns.TopicProps,
  existingTopicObj?: sns.Topic,  

  glueJobProps?: glue.CfnJobProps,
  existingGlueJob?: glue.CfnJob,

  existingSagemakerEndpointObj?: sagemaker.CfnEndpoint,
  endpointProps?: sagemaker.CfnEndpointProps,

  readonly existingSecretObj?: secretsmanager.Secret;
  readonly secretProps?: secretsmanager.SecretProps;

}

export function CheckProps(propsObject: VerifiedProps | any) {
  let errorMessages = '';
  let errorFound = false;

  if (propsObject.dynamoTableProps && propsObject.existingTableObj) {
    errorMessages += 'Cannot specify an existing DDB table AND DDB table props\n';
    errorFound = true;
  }

  if (propsObject.existingStreamObj  && propsObject.kinesisStreamProps) {
    errorMessages += 'Cannot specify an existing Stream table AND Stream props\n';
    errorFound = true;
  }

  if (propsObject.existingLambdaObj && propsObject.lambdaFunctionProps) {
    errorMessages += 'Cannot specify an existing Lambda function AND Lambda function props\n';
    errorFound = true;
  }

  if (propsObject.existingQueueObj && propsObject.queueProps) {
    errorMessages += 'Cannot specify an existing SQS queue AND SQS queue props\n';
    errorFound = true;
  }
  
  if ((propsObject?.deployDeadLetterQueue == false) && propsObject.deadLetterQueueProps) {
    errorMessages += 'Cannot specify no Dead Letter Queue AND Dead Letter Queue props\n';
    errorFound = true;
  }

  if (propsObject.existingMediaStoreContainerObj && propsObject.mediaStoreContainerProps) {
    errorMessages += 'Cannot specify an existing MediaStore container AND MediaStore container props\n';
    errorFound = true;
  }

  if (propsObject.existingBucketObj && propsObject.bucketProps) {
    errorMessages += 'Cannot specify an existing S3 bucket AND S3 bucket props\n';
    errorFound = true;
  }

  if ((propsObject.topicProps || propsObject.topicsProps) && propsObject.existingTopicObj) {
    errorMessages += 'Cannot specify an existing SNS topic AND SNS topic props\n';
    errorFound = true;
  }

  if (propsObject.glueJobProps && propsObject.existingGlueJob) {
    errorMessages += 'Cannot specify an existing Glue job AND Glue job props\n';
    errorFound = true;
  }

  if (propsObject.existingSagemakerEndpointObj && propsObject.endpointProps) {
    errorMessages += 'Cannot specify an existing SageMaker endpoint AND SageMaker endpoint props\n';
    errorFound = true;
  }

  if (propsObject.existingSecretObj && propsObject.secretProps) {
    errorMessages += 'Cannot specify an existing Secret AND Secret props\n';
    errorFound = true;
  }


  if (errorFound) {
    throw new Error(errorMessages);
  }
}