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

import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as mediastore from 'aws-cdk-lib/aws-mediastore';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as glue from 'aws-cdk-lib/aws-glue';
import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as kms from "aws-cdk-lib/aws-kms";
import { ResponseHeadersPolicyProps } from "aws-cdk-lib/aws-cloudfront";
import * as opensearch from "aws-cdk-lib/aws-opensearchservice";
import * as s3assets from "aws-cdk-lib/aws-s3-assets";

export interface VerifiedProps {
  readonly existingStreamObj?: kinesis.Stream;
  readonly kinesisStreamProps?: kinesis.StreamProps,

  readonly existingLambdaObj?: lambda.Function,
  readonly lambdaFunctionProps?: lambda.FunctionProps,

  readonly existingMediaStoreContainerObj?: mediastore.CfnContainer;
  readonly mediaStoreContainerProps?: mediastore.CfnContainerProps;

  readonly existingSagemakerEndpointObj?: sagemaker.CfnEndpoint,
  readonly endpointProps?: sagemaker.CfnEndpointProps,

  readonly existingSecretObj?: secretsmanager.Secret;
  readonly secretProps?: secretsmanager.SecretProps;

  readonly existingVpc?: ec2.IVpc;
  readonly vpcProps?: ec2.VpcProps;
  readonly deployVpc?: boolean;

  readonly encryptionKey?: kms.Key,
  readonly encryptionKeyProps?: kms.KeyProps

  readonly loadBalancerProps?: elb.ApplicationLoadBalancerProps;
  readonly existingLoadBalancerObj?: elb.ApplicationLoadBalancer;

  readonly logAlbAccessLogs?: boolean;
  readonly albLoggingBucketProps?: s3.BucketProps;

  readonly insertHttpSecurityHeaders?: boolean;
  readonly responseHeadersPolicyProps?: ResponseHeadersPolicyProps;
  readonly openSearchDomainProps?: opensearch.CfnDomainProps;

}

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function CheckProps(propsObject: VerifiedProps | any) {
  let errorMessages = '';
  let errorFound = false;

  if (propsObject.loadBalancerProps && propsObject.existingLoadBalancerObj) {
    errorMessages += 'Error - Either provide loadBalancerProps or existingLoadBalancerObj, but not both.\n';
    errorFound = true;
  }

  if ((propsObject?.logAlbAccessLogs === false) && (propsObject.albLoggingBucketProps)) {
    errorMessages += 'Error - If logAlbAccessLogs is false, supplying albLoggingBucketProps is invalid.\n';
    errorFound = true;
  }

  if (propsObject.existingStreamObj && propsObject.kinesisStreamProps) {
    errorMessages += 'Error - Either provide existingStreamObj or kinesisStreamProps, but not both.\n';
    errorFound = true;
  }

  if (propsObject.existingLambdaObj && propsObject.lambdaFunctionProps) {
    errorMessages += 'Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n';
    errorFound = true;
  }

  if (propsObject.existingMediaStoreContainerObj && propsObject.mediaStoreContainerProps) {
    errorMessages += 'Error - Either provide mediaStoreContainerProps or existingMediaStoreContainerObj, but not both.\n';
    errorFound = true;
  }

  if (propsObject.existingSagemakerEndpointObj && propsObject.endpointProps) {
    errorMessages += 'Error - Either provide endpointProps or existingSagemakerEndpointObj, but not both.\n';
    errorFound = true;
  }

  if (propsObject.existingSecretObj && propsObject.secretProps) {
    errorMessages += 'Error - Either provide secretProps or existingSecretObj, but not both.\n';
    errorFound = true;
  }

  if ((propsObject.deployVpc || propsObject.vpcProps) && propsObject.existingVpc) {
    errorMessages += 'Error - Either provide an existingVpc or some combination of deployVpc and vpcProps, but not both.\n';
    errorFound = true;
  }

  if (propsObject.encryptionKey && propsObject.encryptionKeyProps) {
    errorMessages += 'Error - Either provide encryptionKey or encryptionKeyProps, but not both.\n';
    errorFound = true;
  }

  if (propsObject.existingEventBusInterface && propsObject.eventBusProps) {
    errorMessages += 'Error - Either provide existingEventBusInterface or eventBusProps, but not both.\n';
    errorFound = true;
  }

  if (propsObject.existingWebaclObj && propsObject.webaclProps) {
    errorMessages += 'Error - Either provide existingWebaclObj or webaclProps, but not both.\n';
    errorFound = true;
  }

  if (propsObject.insertHttpSecurityHeaders !== false && propsObject.responseHeadersPolicyProps?.securityHeadersBehavior) {
    errorMessages += 'responseHeadersPolicyProps.securityHeadersBehavior can only be passed if httpSecurityHeaders is set to `false`.';
    errorFound = true;
  }

  if (propsObject.openSearchDomainProps?.vpcOptions) {
    errorMessages += "Error - Define VPC using construct parameters not the OpenSearch Service props\n";
    errorFound = true;
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }
}

export interface GlueProps {
  readonly existingGlueJob?: glue.CfnJob,
  readonly etlCodeAsset?: s3assets.Asset;
  readonly glueJobProps?: glue.CfnJobProps | any;
  readonly fieldSchema?: glue.CfnTable.ColumnProperty[];
  readonly existingTable?: glue.CfnTable;
  readonly tablePropss?: glue.CfnTableProps;
}

export function CheckGlueProps(propsObject: GlueProps | any) {
  let errorMessages = '';
  let errorFound = false;

  if (propsObject.glueJobProps && propsObject.existingGlueJob) {
    errorMessages += 'Error - Either provide glueJobProps or existingGlueJob, but not both.\n';
    errorFound = true;
  }

  if ((!propsObject.existingGlueJob) && (!propsObject.glueJobProps.command.scriptLocation && !propsObject.etlCodeAsset)) {
    errorMessages += ('Either one of CfnJob.JobCommandProperty.scriptLocation or etlCodeAsset has ' +
      'to be provided. If the ETL Job code file exists in a local filesystem, please set ' +
      'KinesisstreamsToGluejobProps.etlCodeAsset. If the ETL Job is available in an S3 bucket, set the ' +
      'CfnJob.JobCommandProperty.scriptLocation property\n');
    errorFound = true;
  }

  if (propsObject.glueJobProps?.command?.scriptLocation) {
    const s3Url: string = propsObject.glueJobProps.command.scriptLocation;
    const found = s3Url.match(/^s3:\/\/\S+\/\S+/g);
    if (!(found && found.length > 0 && found[0].length === s3Url.length)) {
      errorMessages += "Invalid S3 URL for Glue script provided\n";
      errorFound = true;
    }
  }

  if (propsObject.fieldSchema === undefined && propsObject.existingTable === undefined && propsObject.tableProps === undefined) {
    errorMessages += "Either fieldSchema or table property has to be set, both cannot be omitted";
    errorFound = true;
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }
}

export interface DynamoDBProps {
  readonly dynamoTableProps?: dynamodb.TableProps,
  readonly existingTableObj?: dynamodb.Table,
  readonly existingTableInterface?: dynamodb.ITable,
}

export function CheckDynamoDBProps(propsObject: DynamoDBProps | any) {
  let errorMessages = '';
  let errorFound = false;

  if (propsObject.dynamoTableProps && propsObject.existingTableObj) {
    errorMessages += 'Error - Either provide existingTableObj or dynamoTableProps, but not both.\n';
    errorFound = true;
  }

  if (propsObject.dynamoTableProps && propsObject.existingTableInterface) {
    errorMessages += 'Error - Either provide existingTableInterface or dynamoTableProps, but not both.\n';
    errorFound = true;
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }
}

export interface SnsProps {
  readonly topicProps?: sns.TopicProps,
  readonly existingTopicObj?: sns.Topic,
  readonly existingTopicObject?: sns.Topic,
  readonly encryptionKey?: kms.Key,
  readonly encryptionKeyProps?: kms.KeyProps
}

export function CheckSnsProps(propsObject: SnsProps | any) {
  let errorMessages = '';
  let errorFound = false;

  // FargateToSns used TopicObject instead of TopicObj - to fix would be a breaking change, so we
  // must look for both here.
  if (propsObject.topicProps && (propsObject.existingTopicObj || propsObject.existingTopicObject)) {
    errorMessages += 'Error - Either provide topicProps or existingTopicObj, but not both.\n';
    errorFound = true;
  }

  if (propsObject.topicProps?.masterKey && propsObject.encryptionKey) {
    errorMessages += 'Error - Either provide topicProps.masterKey or encryptionKey, but not both.\n';
    errorFound = true;
  }

  if (propsObject.topicProps?.masterKey && propsObject.encryptionKeyProps) {
    errorMessages += 'Error - Either provide topicProps.masterKey or encryptionKeyProps, but not both.\n';
    errorFound = true;
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }
}

export interface SqsProps {
  readonly existingQueueObj?: sqs.Queue,
  readonly queueProps?: sqs.QueueProps,
  readonly deployDeadLetterQueue?: boolean,
  readonly deadLetterQueueProps?: sqs.QueueProps,
  readonly encryptionKey?: kms.Key,
  readonly encryptionKeyProps?: kms.KeyProps
}

export function CheckSqsProps(propsObject: SqsProps | any) {
  let errorMessages = '';
  let errorFound = false;

  if (propsObject.existingQueueObj && propsObject.queueProps) {
    errorMessages += 'Error - Either provide queueProps or existingQueueObj, but not both.\n';
    errorFound = true;
  }

  if (propsObject.queueProps?.encryptionMasterKey && propsObject.encryptionKey) {
    errorMessages += 'Error - Either provide queueProps.encryptionMasterKey or encryptionKey, but not both.\n';
    errorFound = true;
  }

  if (propsObject.queueProps?.encryptionMasterKey && propsObject.encryptionKeyProps) {
    errorMessages += 'Error - Either provide queueProps.encryptionMasterKey or encryptionKeyProps, but not both.\n';
    errorFound = true;
  }

  if ((propsObject?.deployDeadLetterQueue === false) && propsObject.deadLetterQueueProps) {
    errorMessages += 'Error - If deployDeadLetterQueue is false then deadLetterQueueProps cannot be specified.\n';
    errorFound = true;
  }

  const isQueueFifo: boolean = propsObject?.queueProps?.fifo;
  const isDeadLetterQueueFifo: boolean = propsObject?.deadLetterQueueProps?.fifo;
  const deployDeadLetterQueue: boolean = propsObject.deployDeadLetterQueue || propsObject.deployDeadLetterQueue === undefined;

  if (deployDeadLetterQueue && (isQueueFifo !== isDeadLetterQueueFifo)) {
    errorMessages += 'Error - If you specify a fifo: true in either queueProps or deadLetterQueueProps, you must also set fifo: ' +
      'true in the other props object. Fifo must match for the Queue and the Dead Letter Queue.\n';
    errorFound = true;
  }

  if (errorFound) {
    throw new Error(errorMessages);
  }
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

// export interface DynamoDBProps {
// }

// export function CheckDynamoDBProps(propsObject: GlueProps | any) {
//   let errorMessages = '';
//   let errorFound = false;

//   if (errorFound) {
//     throw new Error(errorMessages);
//   }
// }

/**
 * @internal This is an internal core function and should not be called directly by Solutions Constructs clients.
 */
export function CheckListValues(allowedPermissions: string[], submittedValues: string[], valueType: string) {
  submittedValues.forEach((submittedValue) => {
    if (!allowedPermissions.includes(submittedValue)) {
      throw Error(`Invalid ${valueType} submitted - ${submittedValue}`);
    }
  });
}
