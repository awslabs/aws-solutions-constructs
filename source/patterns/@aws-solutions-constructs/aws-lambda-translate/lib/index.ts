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
import * as defaults from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';

/**
 * @summary The properties for the LambdaToTranslate class.
 */
export interface LambdaToTranslateProps {
  /**
   * Existing instance of Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function;
  /**
   * Optional user provided props to override the default props for the Lambda function.
   *
   * @default - Default properties are used.
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps;
  /**
   * Whether to enable asynchronous translation jobs. When true, source and destination S3 buckets will be created and the Lambda function
   * will be granted permissions to start and stop translation jobs.
   *
   * @default - false
   */
  readonly asyncJobs?: boolean;
  /**
   * Existing instance of S3 Bucket object for source files, providing both this and `sourceBucketProps` will cause an error.
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
   * Existing instance of S3 Bucket object for translation results, providing both this and `destinationBucketProps` will cause an error.
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
  readonly destinationBucketProps?: s3.BucketProps;
  /**
   * Whether to use the same S3 bucket for both source and destination files. When true, only the source bucket will be created and used
   * for both purposes. Only valid when asyncJobs is true.
   *
   * @default - false
   */
  readonly useSameBucket?: boolean;
  /**
   * Optional array of additional IAM permissions to grant to the Lambda function for Amazon Translate.
   *
   * @default - ['translate:List*', 'translate:Read*']
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

/**
 * @summary The LambdaToTranslate class.
 */
export class LambdaToTranslate extends Construct {
  public readonly lambdaFunction: lambda.Function;
  public readonly sourceBucket?: s3.Bucket;
  public readonly destinationBucket?: s3.Bucket;
  public readonly sourceLoggingBucket?: s3.Bucket;
  public readonly destinationLoggingBucket?: s3.Bucket;
  public readonly vpc?: ec2.IVpc;
  public readonly sourceBucketInterface?: s3.IBucket;
  public readonly destinationBucketInterface?: s3.IBucket;

  /**
   * @summary Constructs a new instance of the LambdaToTranslate class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {LambdaToTranslateProps} props - user provided props for the construct.
   * @access public
   */
  constructor(scope: Construct, id: string, props: LambdaToTranslateProps) {
    super(scope, id);

    // All our tests are based upon this behavior being on, so we're setting
    // context here rather than assuming the client will set it
    this.node.setContext("@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy", true);

    // Check props
    defaults.CheckVpcProps(props);
    defaults.CheckLambdaProps(props);
    defaults.CheckTranslateProps(props);

    // Check S3 bucket props if asyncJobs is true
    if (props.asyncJobs) {
      // Check source bucket props
      const sourceS3Props = {
        existingBucketObj: props.existingSourceBucketObj,
        bucketProps: props.sourceBucketProps,
        loggingBucketProps: props.sourceLoggingBucketProps,
        logS3AccessLogs: props.logSourceS3AccessLogs
      };
      defaults.CheckS3Props(sourceS3Props);

      // Check destination bucket props (only if not using same bucket)
      if (!props.useSameBucket) {
        const destinationS3Props = {
          existingBucketObj: props.existingDestinationBucketObj,
          bucketProps: props.destinationBucketProps,
          loggingBucketProps: props.destinationLoggingBucketProps,
          logS3AccessLogs: props.logDestinationS3AccessLogs
        };
        defaults.CheckS3Props(destinationS3Props);
      }
    }

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

      defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.TRANSLATE);
      if (props.asyncJobs) {
        defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.S3);
      }
    }

    // Setup the Lambda function
    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps,
      vpc: this.vpc,
    });

    // Setup S3 buckets if asyncJobs is true
    if (props.asyncJobs) {
      // Setup source S3 Bucket
      let sourceBucket: s3.IBucket;
      if (!props.existingSourceBucketObj) {
        const buildSourceBucketResponse = defaults.buildS3Bucket(this, {
          bucketProps: props.sourceBucketProps,
          loggingBucketProps: props.sourceLoggingBucketProps,
          logS3AccessLogs: props.logSourceS3AccessLogs
        }, `${id}-source-bucket`);
        this.sourceBucket = buildSourceBucketResponse.bucket;
        this.sourceLoggingBucket = buildSourceBucketResponse.loggingBucket;
        sourceBucket = this.sourceBucket;
      } else {
        sourceBucket = props.existingSourceBucketObj;
      }
      this.sourceBucketInterface = sourceBucket;

      // Setup destination S3 Bucket
      let destinationBucket: s3.IBucket;
      if (props.useSameBucket) {
        destinationBucket = sourceBucket;
        this.destinationBucketInterface = sourceBucket;
      } else {
        if (!props.existingDestinationBucketObj) {
          const buildDestinationBucketResponse = defaults.buildS3Bucket(this, {
            bucketProps: props.destinationBucketProps,
            loggingBucketProps: props.destinationLoggingBucketProps,
            logS3AccessLogs: props.logDestinationS3AccessLogs
          }, `${id}-destination-bucket`);
          this.destinationBucket = buildDestinationBucketResponse.bucket;
          this.destinationLoggingBucket = buildDestinationBucketResponse.loggingBucket;
          destinationBucket = this.destinationBucket;
        } else {
          destinationBucket = props.existingDestinationBucketObj;
        }
        this.destinationBucketInterface = destinationBucket;
      }

      // Configure environment variables
      const sourceBucketEnvName = props.sourceBucketEnvironmentVariableName || 'SOURCE_BUCKET_NAME';
      const destinationBucketEnvName = props.destinationBucketEnvironmentVariableName || 'DESTINATION_BUCKET_NAME';

      this.lambdaFunction.addEnvironment(sourceBucketEnvName, sourceBucket.bucketName);
      this.lambdaFunction.addEnvironment(destinationBucketEnvName, destinationBucket.bucketName);

      // Grant Lambda permissions to S3 buckets
      sourceBucket.grantRead(this.lambdaFunction.grantPrincipal);
      destinationBucket.grantWrite(this.lambdaFunction.grantPrincipal);
    }

    // Grant Lambda permissions to Translate service
    const translateActions = props.additionalPermissions || ['translate:List*', 'translate:Read*'];

    // Add async job permissions if asyncJobs is true
    if (props.asyncJobs) {
      if (!translateActions.includes('translate:StartTextTranslationJob')) {
        translateActions.push('translate:StartTextTranslationJob');
      }
      if (!translateActions.includes('translate:StopTextTranslationJob')) {
        translateActions.push('translate:StopTextTranslationJob');
      }
    }

    this.lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: translateActions,
      resources: ['*']
    }));
  }
}
