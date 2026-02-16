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
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';

/**
 * @summary The properties for the LambdaToPolly class.
 */
export interface LambdaToPollyProps {
  /**
   * Optional - instance of an existing Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function;
  /**
   * Optional - user provided props to override the default props for the Lambda function. Providing both this and `existingLambdaObj`
   * causes an error.
   *
   * Function will have these Polly permissions: ['polly:SynthesizeSpeech']. When asyncJobs is true, function will also have
   * ['polly:StartSpeechSynthesisTask', 'polly:GetSpeechSynthesisTask', 'polly:ListSpeechSynthesisTasks'].
   *
   * @default - Default properties are used.
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps;
  /**
   * Whether to enable asynchronous speech synthesis tasks. When true, an S3 bucket for audio output and an SNS topic for
   * completion notifications will be created, and the Lambda function will be granted permissions to start and monitor
   * asynchronous synthesis tasks.
   *
   * @default - false
   */
  readonly asyncJobs?: boolean;
  /**
   * Existing instance of S3 Bucket object for audio output, providing both this and `bucketProps` will cause an error.
   * Only valid when asyncJobs is true.
   *
   * @default - None
   */
  readonly existingBucketObj?: s3.IBucket;
  /**
   * Optional user provided props to override the default props for the S3 Bucket. Only valid when asyncJobs is true.
   *
   * @default - Default props are used
   */
  readonly bucketProps?: s3.BucketProps;
  /**
   * Optional Name for the Lambda function environment variable set to the name of the output bucket. Only valid when asyncJobs is true.
   *
   * @default - OUTPUT_BUCKET_NAME
   */
  readonly bucketEnvironmentVariableName?: string;
  /**
   * Whether to turn on Access Logs for the S3 bucket with the associated storage costs. Enabling Access Logging is a best practice.
   * Only valid when asyncJobs is true.
   *
   * @default - true
   */
  readonly logS3AccessLogs?: boolean;
  /**
   * Optional user provided props to override the default props for the S3 Logging Bucket. Only valid when asyncJobs is true.
   *
   * @default - Default props are used
   */
  readonly loggingBucketProps?: s3.BucketProps;
  /**
   * Optional - existing instance of SNS topic object, providing both this and `topicProps` will cause an error.
   * Only valid when asyncJobs is true.
   *
   * @default - None
   */
  readonly existingTopicObj?: sns.Topic;
  /**
   * Optional - user provided properties to override the default properties for the SNS topic.
   * Providing both this and `existingTopicObj` causes an error. Only valid when asyncJobs is true.
   *
   * @default - Default properties are used.
   */
  readonly topicProps?: sns.TopicProps | any;
  /**
   * Optional Name for the Lambda function environment variable set to the ARN of the SNS topic used for asynchronous
   * task completion notifications. Only valid when asyncJobs is true.
   *
   * @default - SNS_TOPIC_ARN
   */
  readonly topicEnvironmentVariableName?: string;
  /**
   * If an existing topic is provided in the `existingTopicObj` property, and that topic is encrypted with a customer
   * managed KMS key, this property must specify that key. Only valid when asyncJobs is true.
   *
   * @default - None
   */
  readonly existingTopicEncryptionKey?: kms.Key;
  /**
   * An optional, imported encryption key to encrypt the SNS Topic with. Only valid when asyncJobs is true.
   *
   * @default - not specified.
   */
  readonly topicEncryptionKey?: kms.Key;
  /**
   * Optional user provided properties to override the default properties for the KMS encryption key used to encrypt
   * the SNS Topic with. Only valid when asyncJobs is true.
   *
   * @default - None
   */
  readonly topicEncryptionKeyProps?: kms.KeyProps | any;
  /**
   * If no key is provided, this flag determines whether the SNS Topic is encrypted with a new CMK or an AWS managed key.
   * This flag is ignored if any of the following are defined: topicProps.masterKey, topicEncryptionKey or topicEncryptionKeyProps.
   * Only valid when asyncJobs is true.
   *
   * @default - None
   */
  readonly enableTopicEncryptionWithCustomerManagedKey?: boolean;
  /**
   * An existing VPC for the construct to use (construct will NOT create a new VPC in this case)
   */
  readonly existingVpc?: ec2.IVpc;
  /**
   * Properties to override default properties if deployVpc is true
   */
  readonly vpcProps?: ec2.VpcProps | any;
  /**
   * Whether to deploy a new VPC
   *
   * @default - false
   */
  readonly deployVpc?: boolean;
}

/**
 * @summary The LambdaToPolly class.
 */
export class LambdaToPolly extends Construct {
  public readonly lambdaFunction: lambda.Function;
  public readonly vpc?: ec2.IVpc;
  // Bucket will be set if this construct creates it, if existing bucket is passed in, this will not be set (async only)
  public readonly destinationBucket?: s3.Bucket;
  public readonly loggingBucket?: s3.Bucket;
  // Interface will always be set for async architectures, either with the new bucket or the existingBucket interface passed in props
  public readonly destinationBucketInterface?: s3.IBucket;
  public readonly snsNotificationTopic?: sns.Topic;
  public readonly notificationTopicEncryptionKey?: kms.IKey;

  /**
   * @summary Constructs a new instance of the LambdaToPolly class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {LambdaToPollyProps} props - user provided props for the construct.
   * @access public
   */
  constructor(scope: Construct, id: string, props: LambdaToPollyProps) {
    super(scope, id);

    // All our tests are based upon this behavior being on, so we're setting
    // context here rather than assuming the client will set it
    this.node.setContext("@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy", true);

    // Check props
    defaults.CheckLambdaProps(props);
    defaults.CheckVpcProps(props);
    defaults.CheckPollyProps(props);

    // Setup VPC if required
    if (props.deployVpc || props.existingVpc) {
      this.vpc = defaults.buildVpc(scope, {
        defaultVpcProps: defaults.DefaultIsolatedVpcProps(),
        existingVpc: props.existingVpc,
        userVpcProps: props.vpcProps,
        constructVpcProps: {
          enableDnsHostnames: true,
          enableDnsSupport: true,
        },
      });

      defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.POLLY);
    }

    // Configure Polly support (bucket, topic, permissions)
    const pollyConfiguration = defaults.ConfigurePollySupport(this, id, props);

    // Extract bucket, topic, and encryption key from configuration
    if (pollyConfiguration.destinationBucket) {
      this.destinationBucket = pollyConfiguration.destinationBucket.bucket;
      this.loggingBucket = pollyConfiguration.destinationBucket.loggingBucket;
      this.destinationBucketInterface = pollyConfiguration.destinationBucket.bucketInterface;
    }

    this.snsNotificationTopic = pollyConfiguration.snsNotificationTopic;
    this.notificationTopicEncryptionKey = pollyConfiguration.notificationTopicEncryptionKey;

    // Create Lambda function
    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      // We want a longer default timeout for the Polly call, but will defer to client value
      lambdaFunctionProps: defaults.overrideProps({ timeout: Duration.seconds(30) }, props.lambdaFunctionProps ?? {}),
      vpc: this.vpc,
    });

    // Grant IAM permissions for Polly
    this.lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: pollyConfiguration.lambdaIamActionsRequired,
      resources: ['*']
    }));

    // Grant S3 permissions (async only)
    if (pollyConfiguration.destinationBucket) {
      pollyConfiguration.destinationBucket.bucketInterface.grantReadWrite(this.lambdaFunction);
    }

    // Grant SNS permissions (async only)
    if (pollyConfiguration.snsNotificationTopic) {
      pollyConfiguration.snsNotificationTopic.grantPublish(this.lambdaFunction);
    }

    // Set environment variables
    pollyConfiguration.environmentVariables.forEach(variable => {
      const varName = variable.clientNameOverride || variable.defaultName;
      this.lambdaFunction.addEnvironment(varName, variable.value);
    });

    // Add S3 Gateway Endpoint when VPC and asyncJobs
    if (this.vpc && props.asyncJobs) {
      defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.S3);
    }
  }
}
