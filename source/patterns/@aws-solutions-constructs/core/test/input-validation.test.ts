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

// Imports
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as glue from 'aws-cdk-lib/aws-glue';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as mediastore from 'aws-cdk-lib/aws-mediastore';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Stack } from 'aws-cdk-lib';
import * as defaults from '../';
import { MediaStoreContainerProps } from '../lib/mediastore-defaults';
import { BuildSagemakerEndpoint } from '../lib/sagemaker-helper';
import { CreateScrapBucket } from './test-helper';

test('Test with valid props', () => {
  const props: defaults.VerifiedProps = {
  };

  defaults.CheckProps(props);
});

// ---------------------------
// DynamoDB Prop Tests
// ---------------------------
test('Test fail DynamoDB table check', () => {
  const stack = new Stack();

  const props: defaults.DynamoDBProps = {
    existingTableObj: new dynamodb.Table(stack, 'placeholder', defaults.DefaultTableProps),
    dynamoTableProps: defaults.DefaultTableProps,
  };

  const app = () => {
    defaults.CheckDynamoDBProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide existingTableObj or dynamoTableProps, but not both.\n');
});

test('Test fail DynamoDB table check (for interface)', () => {
  const stack = new Stack();

  const props: defaults.DynamoDBProps = {
    existingTableInterface: new dynamodb.Table(stack, 'placeholder', defaults.DefaultTableProps),
    dynamoTableProps: defaults.DefaultTableProps,
  };

  const app = () => {
    defaults.CheckDynamoDBProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide existingTableInterface or dynamoTableProps, but not both.\n');
});

// ---------------------------
// Lambda Prop Tests
// ---------------------------
test("Test fail Lambda function check", () => {
  const stack = new Stack();

  const props: defaults.LambdaProps = {
    lambdaFunctionProps: {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: "index.handler",
    },
    existingLambdaObj: new lambda.Function(stack, "placeholder", {
      code: lambda.Code.fromAsset(`${__dirname}/lambda`),
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: "index.handler",
    }),
  };

  const app = () => {
    defaults.CheckLambdaProps(props);
  };

  // Assertion
  expect(app).toThrowError(
    "Error - Either provide lambdaFunctionProps or existingLambdaObj, but not both.\n"
  );
});
// ---------------------------

// ---------------------------
// DynamoDB Prop Tests
// ---------------------------
test("Test fail SQS Queue check", () => {
  const stack = new Stack();

  const props: defaults.SqsProps = {
    queueProps: {},
    existingQueueObj: new sqs.Queue(stack, 'placeholder', {}),
  };

  const app = () => {
    defaults.CheckSqsProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide queueProps or existingQueueObj, but not both.\n');
});

test('Test fail SQS queue check when queueProps.encryptionMasterKey and encryptionKey are both specified', () => {
  const stack = new Stack();

  const props: defaults.SqsProps = {
    queueProps: {
      encryptionMasterKey: new kms.Key(stack, 'key')
    },
    encryptionKey: new kms.Key(stack, 'otherkey')
  };

  const app = () => {
    defaults.CheckSqsProps(props);
  };

  expect(app).toThrowError('Error - Either provide queueProps.encryptionMasterKey or encryptionKey, but not both.\n');
});

test('Test fail SQS queue check when queueProps.encryptionMasterKey and encryptionKeyProps are both specified', () => {
  const stack = new Stack();

  const props: defaults.SqsProps = {
    encryptionKeyProps: {
      description: 'key description'
    },
    queueProps: {
      encryptionMasterKey: new kms.Key(stack, 'key')
    }
  };

  const app = () => {
    defaults.CheckSqsProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide queueProps.encryptionMasterKey or encryptionKeyProps, but not both.\n');
});

test('Test fail Dead Letter Queue check', () => {

  const props: defaults.SqsProps = {
    deployDeadLetterQueue: false,
    deadLetterQueueProps: {},
  };

  const app = () => {
    defaults.CheckSqsProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - If deployDeadLetterQueue is false then deadLetterQueueProps cannot be specified.\n');
});

test('Test fail Dead Letter Queue check with queueProps fifo set to true and undefined deadLetterQueueProps', () => {

  const props: defaults.SqsProps = {
    queueProps: { fifo: true },
    deadLetterQueueProps: {},
  };

  const app = () => {
    defaults.CheckSqsProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - If you specify a fifo: true in either queueProps or deadLetterQueueProps, you must also set fifo: ' +
    'true in the other props object. Fifo must match for the Queue and the Dead Letter Queue.\n');
});

test('Test fail Dead Letter Queue check with queueProps fifo set to true and deadLetterQueueProps fifo set to false', () => {

  const props: defaults.SqsProps = {
    queueProps: { fifo: true },
    deadLetterQueueProps: { fifo: false },
  };

  const app = () => {
    defaults.CheckSqsProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - If you specify a fifo: true in either queueProps or deadLetterQueueProps, you must also set fifo: ' +
    'true in the other props object. Fifo must match for the Queue and the Dead Letter Queue.\n');
});

test('Test fail Dead Letter Queue check with queueProps fifo set to false and deadLetterQueueProps fifo set to true', () => {

  const props: defaults.SqsProps = {
    deadLetterQueueProps: { fifo: true },
    queueProps: { fifo: false },
  };

  const app = () => {
    defaults.CheckSqsProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - If you specify a fifo: true in either queueProps or deadLetterQueueProps, you must also set fifo: ' +
    'true in the other props object. Fifo must match for the Queue and the Dead Letter Queue.\n');
});

test('Test fail Dead Letter Queue check with deadLetterQueueProps fifo set to true', () => {

  const props: defaults.SqsProps = {
    deadLetterQueueProps: { fifo: true },
  };

  const app = () => {
    defaults.CheckSqsProps(props);
  };

  expect(app).toThrowError('Error - If you specify a fifo: true in either queueProps or deadLetterQueueProps, you must also set fifo: ' +
    'true in the other props object. Fifo must match for the Queue and the Dead Letter Queue.\n');
});

test('Test fail Dead Letter Queue check with queueProps fifo set to false', () => {

  const props: defaults.SqsProps = {
    queueProps: { fifo: false },
  };

  const app = () => {
    defaults.CheckSqsProps(props);
  };

  expect(app).toThrowError('Error - If you specify a fifo: true in either queueProps or deadLetterQueueProps, you must also set fifo: ' +
    'true in the other props object. Fifo must match for the Queue and the Dead Letter Queue.\n');
});

test("Test fail MediaStore container check", () => {
  const stack = new Stack();

  const mediaStoreContainer = new mediastore.CfnContainer(
    stack,
    "placeholder",
    MediaStoreContainerProps()
  );

  const props: defaults.VerifiedProps = {
    mediaStoreContainerProps: MediaStoreContainerProps(),
    existingMediaStoreContainerObj: mediaStoreContainer,
  };

  const app = () => {
    defaults.CheckProps(props);
  };

  // Assertion
  expect(app).toThrowError(
    "Error - Either provide mediaStoreContainerProps or existingMediaStoreContainerObj, but not both.\n"
  );
});

test('Test fail Kinesis stream check', () => {
  const stack = new Stack();

  const stream = new kinesis.Stream(stack, 'placeholder', {

  });

  const props: defaults.VerifiedProps = {
    existingStreamObj: stream,
    kinesisStreamProps: {}
  };

  const app = () => {
    defaults.CheckProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide existingStreamObj or kinesisStreamProps, but not both.\n');
});

// ---------------------------
// Sns Prop Tests
// ---------------------------
test('Test fail SNS topic check', () => {
  const stack = new Stack();

  const props: defaults.SnsProps = {
    topicProps: {},
    existingTopicObj: new sns.Topic(stack, 'placeholder', {})
  };

  const app = () => {
    defaults.CheckSnsProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide topicProps or existingTopicObj, but not both.\n');
});

test('Test fail SNS topic check with bad topic attribute name', () => {
  const stack = new Stack();

  const props: defaults.SnsProps = {
    topicProps: {},
    existingTopicObj: new sns.Topic(stack, 'placeholder', {})
  };

  const app = () => {
    defaults.CheckSnsProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide topicProps or existingTopicObj, but not both.\n');
});

test('Test fail SNS topic check when both encryptionKey and encryptionKeyProps are specified', () => {
  const stack = new Stack();

  const props: defaults.VerifiedProps = {
    encryptionKey: new kms.Key(stack, 'key'),
    encryptionKeyProps: {
      description: 'a description'
    }
  };

  const app = () => {
    defaults.CheckProps(props);
  };

  expect(app).toThrowError('Error - Either provide encryptionKey or encryptionKeyProps, but not both.\n');
});

test('Test fail SNS topic check when both topicProps.masterKey and encryptionKeyProps are specified', () => {
  const stack = new Stack();

  const props: defaults.SnsProps = {
    topicProps: {
      masterKey: new kms.Key(stack, 'key')
    },
    encryptionKeyProps: {
      description: 'a description'
    }
  };

  const app = () => {
    defaults.CheckSnsProps(props);
  };

  expect(app).toThrowError('Error - Either provide topicProps.masterKey or encryptionKeyProps, but not both.\n');
});

test('Test fail SNS topic check when both encryptionKey and topicProps.masterKey are specified', () => {
  const stack = new Stack();

  const props: defaults.SnsProps = {
    encryptionKey: new kms.Key(stack, 'key'),
    topicProps: {
      masterKey: new kms.Key(stack, 'otherkey')
    }
  };

  const app = () => {
    defaults.CheckSnsProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide topicProps.masterKey or encryptionKey, but not both.\n');
});
// ---------------------------

// ---------------------------
// Glue Prop Tests
// ---------------------------
test('Test fail Glue job check', () => {
  const stack = new Stack();

  const _jobRole = new iam.Role(stack, 'CustomETLJobRole', {
    assumedBy: new iam.ServicePrincipal('glue.amazonaws.com')
  });

  const jobProps: glue.CfnJobProps = defaults.DefaultGlueJobProps(_jobRole, {
    command: {
      name: 'glueetl',
      pythonVersion: '3',
      scriptLocation: new s3.Bucket(stack, 'ScriptBucket').bucketArn,
    },
    role: new iam.Role(stack, 'JobRole', {
      assumedBy: new iam.ServicePrincipal('glue.amazonaws.com')
    }).roleArn
  }, 'testETLJob', {});

  const job = new glue.CfnJob(stack, 'placeholder', jobProps);

  const props: defaults.GlueProps = {
    glueJobProps: jobProps,
    existingGlueJob: job
  };

  const app = () => {
    defaults.CheckGlueProps(props);
  };

  // Assertion
  expect(app).toThrowError("Error - Either provide glueJobProps or existingGlueJob, but not both.\n");
});

test('Test bad Glue script location', () => {
  const stack = new Stack();

  const _jobRole = new iam.Role(stack, 'CustomETLJobRole', {
    assumedBy: new iam.ServicePrincipal('glue.amazonaws.com')
  });

  const jobProps: glue.CfnJobProps = defaults.DefaultGlueJobProps(_jobRole, {
    command: {
      name: 'glueetl',
      pythonVersion: '3',
      scriptLocation: "s://bad/url",
    },
    role: new iam.Role(stack, 'JobRole', {
      assumedBy: new iam.ServicePrincipal('glue.amazonaws.com')
    }).roleArn
  }, 'testETLJob', {});

  const props: defaults.GlueProps = {
    glueJobProps: jobProps,
  };

  const app = () => {
    defaults.CheckGlueProps(props);
  };

  // Assertion
  expect(app).toThrowError('Invalid S3 URL for Glue script provided\n');
});

test('Test missing Glue script location', () => {
  const stack = new Stack();

  const _jobRole = new iam.Role(stack, 'CustomETLJobRole', {
    assumedBy: new iam.ServicePrincipal('glue.amazonaws.com')
  });

  const jobProps: glue.CfnJobProps = defaults.DefaultGlueJobProps(_jobRole, {
    command: {
      name: 'glueetl',
      pythonVersion: '3',
    },
    role: new iam.Role(stack, 'JobRole', {
      assumedBy: new iam.ServicePrincipal('glue.amazonaws.com')
    }).roleArn
  }, 'testETLJob', {});

  const props: defaults.GlueProps = {
    glueJobProps: jobProps,
  };

  const app = () => {
    defaults.CheckGlueProps(props);
  };

  const expectedError: string = 'Either one of CfnJob.JobCommandProperty.scriptLocation or etlCodeAsset has ' +
    'to be provided. If the ETL Job code file exists in a local filesystem, please set ' +
    'KinesisstreamsToGluejobProps.etlCodeAsset. If the ETL Job is available in an S3 bucket, set the ' +
    'CfnJob.JobCommandProperty.scriptLocation property\n';

  // Assertion
  expect(app).toThrowError(expectedError);
});
// ---------------------------

test('Test fail SageMaker endpoint check', () => {
  const stack = new Stack();

  // Build Sagemaker Inference Endpoint
  const modelProps = {
    primaryContainer: {
      image: "<AccountId>.dkr.ecr.<region>.amazonaws.com/linear-learner:latest",
      modelDataUrl: "s3://<bucket-name>/<prefix>/model.tar.gz",
    },
  };

  const buildSagemakerEndpointResponse = BuildSagemakerEndpoint(stack, { modelProps });

  const props: defaults.VerifiedProps = {
    existingSagemakerEndpointObj: buildSagemakerEndpointResponse.endpoint,
    endpointProps: {
      endpointConfigName: 'placeholder'
    }
  };

  const app = () => {
    defaults.CheckProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide endpointProps or existingSagemakerEndpointObj, but not both.\n');
});

test('Test fail Secret check', () => {
  const stack = new Stack();

  const props: defaults.VerifiedProps = {
    secretProps: {},
    existingSecretObj: defaults.buildSecretsManagerSecret(stack, 'secret', {}),
  };

  const app = () => {
    defaults.CheckProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide secretProps or existingSecretObj, but not both.\n');
});

test('Test fail encryption key check', () => {
  const stack = new Stack();

  const key = defaults.buildEncryptionKey(stack, {
    enableKeyRotation: false
  });

  const props: defaults.VerifiedProps = {
    encryptionKey: key,
    encryptionKeyProps: {},
  };

  const app = () => {
    defaults.CheckProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide encryptionKey or encryptionKeyProps, but not both.\n');
});

// ---------------------------
// S3 Prop Tests
// ---------------------------
test('Test fail Vpc check with deployVpc', () => {
  const stack = new Stack();

  const props: defaults.VpcProps = {
    deployVpc: true,
    existingVpc: defaults.buildVpc(stack, {
      defaultVpcProps: defaults.DefaultPublicPrivateVpcProps(),
    }),
  };

  const app = () => {
    defaults.CheckVpcProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide an existingVpc or some combination of deployVpc and vpcProps, but not both.\n');
});

test('Test fail Vpc check with vpcProps', () => {
  const stack = new Stack();

  const props: defaults.VpcProps = {
    vpcProps: defaults.DefaultPublicPrivateVpcProps(),
    existingVpc: defaults.buildVpc(stack, {
      defaultVpcProps: defaults.DefaultPublicPrivateVpcProps(),
    }),
  };

  const app = () => {
    defaults.CheckVpcProps(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide an existingVpc or some combination of deployVpc and vpcProps, but not both.\n');
});
// ---------------------------

// ---------------------------
// S3 Prop Tests
// ---------------------------
test('Test fail S3 check', () => {
  const stack = new Stack();

  const props: defaults.S3Props = {
    existingBucketObj: CreateScrapBucket(stack, {}),
    bucketProps: {},
  };

  const app = () => {
    defaults.CheckS3Props(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide bucketProps or existingBucketObj, but not both.\n');
});

test('Test fail existing log bucket and log bucket prop check', () => {
  const stack = new Stack();

  const props: defaults.S3Props = {
    existingLoggingBucketObj: new s3.Bucket(stack, 'logging-bucket'),
    loggingBucketProps: {
      autoDeleteObjects: true
    }
  };

  const app = () => {
    defaults.CheckS3Props(props);
  };

  // Assertion
  expect(app).toThrowError('Error - Either provide existingLoggingBucketObj or loggingBucketProps, but not both.\n');
});

test('Test fail false logS3Accesslogs and loggingBucketProps check', () => {
  const stack = new Stack();

  const props: defaults.S3Props = {
    existingLoggingBucketObj: new s3.Bucket(stack, 'logging-bucket'),
    logS3AccessLogs: false
  };

  const app = () => {
    defaults.CheckS3Props(props);
  };

  // Assertion
  expect(app).toThrowError('Error - If logS3AccessLogs is false, supplying loggingBucketProps or existingLoggingBucketObj is invalid.\n');
});

test('Test fail existingBucketObj and loggingBucketProps check', () => {
  const stack = new Stack();

  const props: defaults.S3Props = {
    existingBucketObj: new s3.Bucket(stack, 'temp-bucket'),
    loggingBucketProps: {
      autoDeleteObjects: true
    }
  };

  const app = () => {
    defaults.CheckS3Props(props);
  };

  // Assertion
  expect(app).toThrowError('Error - If existingBucketObj is provided, supplying loggingBucketProps or logS3AccessLogs is an error.\n');
});
// ---------------------------

test('Test successful CheckListValues', () => {

  const app = () => {
    defaults.CheckListValues(['one', 'two', 'four'], ['four', 'one'], 'test value');
  };

  // Assertion
  expect(app).not.toThrowError();
});

test('Test unsuccessful CheckListValues', () => {

  const app = () => {
    defaults.CheckListValues(['one', 'two', 'four'], ['four', 'three'], 'test value');
  };

  // Assertion
  expect(app).toThrowError('Invalid test value submitted - three');
});
