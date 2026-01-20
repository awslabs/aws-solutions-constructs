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
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

/**
 * @summary The properties for the LambdaToTextract class.
 */
export interface LambdaToTextractProps {
  /**
   * Optional - instance of an existing Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function;
  /**
   * Optional - user provided props to override the default props for the Lambda function. Providing both this and `existingLambdaObj` is an error.
   *
   * @default - Default properties are used.
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps;
  /**
   * Whether to enable asynchronous document analysis jobs. When true, source and destination S3 buckets will be created and the Lambda function
   * will be granted permissions to start and get status of document analysis jobs.
   *
   * @default - false
   */
  readonly asyncJobs?: boolean;
  /**
   * Existing instance of S3 Bucket object for source documents, providing both this and `sourceBucketProps` will cause an error.
   * Only valid when asyncJobs is true.
   *
   * @default - None
   */
  readonly existingSourceBucketObj?: s3.IBucket;
  /**
   * Optional user provided props to override the default props for the source S3 Bucket. Only valid when asyncJobs is true.
   *
   * @default - Default props are used
   */
  readonly sourceBucketProps?: s3.BucketProps;
  /**
   * Existing instance of S3 Bucket object for analysis results, providing both this and `destinationBucketProps` will cause an error.
   * Only valid when asyncJobs is true.
   *
   * @default - None
   */
  readonly existingDestinationBucketObj?: s3.IBucket;
  /**
   * Optional user provided props to override the default props for the destination S3 Bucket. Only valid when asyncJobs is true.
   *
   * @default - Default props are used
   */
  // TODO: Output bucket is optional-Textract will use AWS bucket if not specific. Add flag "useAwsManagedDestinationBucket"
  readonly destinationBucketProps?: s3.BucketProps;
  /**
   * Whether to use the same S3 bucket for both source and destination files. When true, only the source bucket will be created and used
   * for both purposes. Only valid when asyncJobs is true.
   *
   * @default - false
   */
  readonly useSameBucket?: boolean;
  /**
   * Optional array of additional IAM permissions to grant to the Lambda function for Amazon Textract.
   *
   * @default - ['textract:DetectDocumentText', 'textract:AnalyzeDocument', 'textract:AnalyzeExpense', 'textract:AnalyzeID']
   */
  readonly additionalPermissions?: string[];
  /**
   * An existing VPC for the construct to use (construct will NOT create a new VPC in this case)
   */
  readonly existingVpc?: ec2.IVpc;
  /**
   * Properties to override default properties if deployVpc is true
   */
  readonly vpcProps?: ec2.VpcProps;
  /**
   * Whether to deploy a new VPC
   *
   * @default - false
   */
  readonly deployVpc?: boolean;
  /**
   * Optional Name for the Lambda function environment variable set to the name of the source bucket. Only valid when asyncJobs is true.
   *
   * @default - SOURCE_BUCKET_NAME
   */
  readonly sourceBucketEnvironmentVariableName?: string;
  /**
   * Optional Name for the Lambda function environment variable set to the name of the destination bucket. Only valid when asyncJobs is true.
   *
   * @default - DESTINATION_BUCKET_NAME
   */
  readonly destinationBucketEnvironmentVariableName?: string;
  /**
   * Optional Name for the Lambda function environment variable set to the ARN of the IAM role used for asynchronous
   * document analysis jobs. Only valid when asyncJobs is true.
   *
   * @default - DATA_ACCESS_ROLE_ARN
   */
  readonly dataAccessRoleArnEnvironmentVariableName?: string;
  /**
   * Optional Name for the Lambda function environment variable set to the ARN of the SNS topic used for asynchronous
   * job completion notifications. Only valid when asyncJobs is true.
   *
   * @default - SNS_TOPIC_ARN
   */
  // TODO: Improvement - group and isolate these with explanation, perhaps change name, check README.adoc
  readonly snsTopicArnEnvironmentVariableName?: string;
  /**
   * Optional - existing instance of SNS topic object, providing both this and `topicProps` will cause an error.
   * Only valid when asyncJobs is true.
   *
   * @default - None
   */
  readonly existingTopicObj?: sns.Topic;
  /**
   * If an existing topic is provided in the `existingTopicObj` property, and that topic is encrypted with a customer
   * managed KMS key, this property must specify that key. Only valid when asyncJobs is true.
   *
   * @default - None
   */
  readonly existingTopicEncryptionKey?: kms.Key;
  /**
   * Optional - user provided properties to override the default properties for the SNS topic.
   * Providing both this and `existingTopicObj` is an error. Only valid when asyncJobs is true.
   *
   * @default - Default properties are used.
   */
  readonly topicProps?: sns.TopicProps;
  /**
   * If no key is provided, this flag determines whether the SNS Topic is encrypted with a new CMK or an AWS managed key.
   * This flag is ignored if any of the following are defined: topicProps.masterKey, encryptionKey or encryptionKeyProps.
   * Only valid when asyncJobs is true.
   *
   * @default - None
   */
  readonly enableEncryptionWithCustomerManagedKey?: boolean;
  /**
   * An optional, imported encryption key to encrypt the SNS Topic with. Only valid when asyncJobs is true.
   *
   * @default - not specified.
   */
  readonly encryptionKey?: kms.Key;
  /**
   * Optional user provided properties to override the default properties for the KMS encryption key used to encrypt
   * the SNS Topic with. Only valid when asyncJobs is true.
   *
   * @default - None
   */
  readonly encryptionKeyProps?: kms.KeyProps;
  /**
   * Optional user provided props to override the default props for the source S3 Logging Bucket. Only valid when asyncJobs is true.
   *
   * @default - Default props are used
   */
  readonly sourceLoggingBucketProps?: s3.BucketProps;
  /**
   * Optional user provided props to override the default props for the destination S3 Logging Bucket. Only valid when asyncJobs is true.
   *
   * @default - Default props are used
   */
  readonly destinationLoggingBucketProps?: s3.BucketProps;
  /**
   * Whether to turn on Access Logs for the source S3 bucket with the associated storage costs. Enabling Access Logging is a best practice.
   * Only valid when asyncJobs is true.
   *
   * @default - true
   */
  readonly logSourceS3AccessLogs?: boolean;
  /**
   * Whether to turn on Access Logs for the destination S3 bucket with the associated storage costs. Enabling Access Logging is a best practice.
   * Only valid when asyncJobs is true.
   *
   * @default - true
   */
  readonly logDestinationS3AccessLogs?: boolean;
}

export interface EnvironmentVariableDefinition {
  readonly defaultName: string,
  readonly clientNameOverride?: string,
  readonly value: string
}

// TODO: All of the properties exposed when a topic is involved must be exposed

/**
 * @summary The LambdaToTextract class.
 */
export class LambdaToTextract extends Construct {
  public readonly lambdaFunction: lambda.Function;
  // Buckets will be set if this construct creates them, if existing buckets are passed in, these will not be set
  public readonly sourceBucket?: s3.Bucket;
  public readonly destinationBucket?: s3.Bucket;
  public readonly sourceLoggingBucket?: s3.Bucket;
  public readonly destinationLoggingBucket?: s3.Bucket;
  public readonly snsTopic?: sns.Topic;
  public readonly vpc?: ec2.IVpc;
  // Interfaces will always be set for async architectures, either with the new bucket or the existingBucket interfaces passed in props
  public readonly sourceBucketInterface?: s3.IBucket;
  public readonly destinationBucketInterface?: s3.IBucket;

  /**
   * @summary Constructs a new instance of the LambdaToTextract class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {LambdaToTextractProps} props - user provided props for the construct.
   * @access public
   */
  constructor(scope: Construct, id: string, props: LambdaToTextractProps) {
    super(scope, id);

    // All our tests are based upon this behavior being on, so we're setting
    // context here rather than assuming the client will set it
    this.node.setContext("@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy", true);

    // Check props
    defaults.CheckVpcProps(props);
    defaults.CheckLambdaProps(props);
    defaults.CheckTextractProps(props);

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

      defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.TEXTRACT);
      if (props.asyncJobs) {
        defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.S3);
        defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.SNS);
      }
    }
    const lambdaEnvironmentVariables: EnvironmentVariableDefinition[] = [];

    const textractConfiguration = defaults.ConfigureTextractSupport(this, id, props);

    this.snsTopic = textractConfiguration.snsTopic;

    if (textractConfiguration.sourceBucket) {
      // Incorporate all the configuration created (to support async jobs)
      this.sourceBucket = textractConfiguration.sourceBucket.bucket;
      this.sourceLoggingBucket = textractConfiguration.sourceBucket.loggingBucket;
      this.sourceBucketInterface = textractConfiguration.sourceBucket.bucketInterface;

      this.destinationBucket = textractConfiguration.destinationBucket?.bucket;
      this.destinationLoggingBucket = textractConfiguration.destinationBucket?.loggingBucket;
      this.destinationBucketInterface = textractConfiguration.destinationBucket?.bucketInterface;

      lambdaEnvironmentVariables.push({
        defaultName: "SOURCE_BUCKET_NAME",
        clientNameOverride: props.sourceBucketEnvironmentVariableName,
        value: this.sourceBucketInterface.bucketName
      });
      lambdaEnvironmentVariables.push({
        defaultName: "DESTINATION_BUCKET_NAME",
        clientNameOverride: props.destinationBucketEnvironmentVariableName,
        value: this.destinationBucketInterface?.bucketName!
      });
      lambdaEnvironmentVariables.push({
        defaultName: "DATA_ACCESS_ROLE_ARN",
        clientNameOverride: props.dataAccessRoleArnEnvironmentVariableName,
        value: textractConfiguration.textractRole?.roleArn!
      });
      if (this.snsTopic) {
        lambdaEnvironmentVariables.push({
          defaultName: "SNS_TOPIC_ARN",
          clientNameOverride: props.snsTopicArnEnvironmentVariableName,
          value: this.snsTopic.topicArn
        });
      }
    }

    // Now we know everything the Lambda Function needs, we can configure it
    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps,
      vpc: this.vpc,
    });

    // Add all actions from textract configuration and client to the Lambda function
    // PassRole is handled separately, because it must specify role being passed as the resource
    const lambdaFunctionRoleActions: string[] = [];
    textractConfiguration.lambdaIamActionsRequired.forEach((action: string) => {
      lambdaFunctionRoleActions.push(action);
    });

    if (props.additionalPermissions) {
      props.additionalPermissions.forEach((permission: string) => {
        if (!lambdaFunctionRoleActions.includes(permission)) {
          lambdaFunctionRoleActions.push(permission);
        }
      });
    }

    this.lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: lambdaFunctionRoleActions,
      resources: ['*']
    }));

    // Add PassRole in it's own statement
    if (textractConfiguration.textractRole) {
      this.lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["iam:PassRole"],
        resources: [textractConfiguration.textractRole.roleArn]
      }));
    }

    // Configure environment variables
    lambdaEnvironmentVariables.forEach(variable => {
      const varName = variable.clientNameOverride || variable.defaultName;
      this.lambdaFunction.addEnvironment(varName, variable.value);
    });

  }
}
