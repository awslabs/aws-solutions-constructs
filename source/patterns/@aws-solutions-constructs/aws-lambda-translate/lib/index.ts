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
   * Optional Name for the role to pass to Batch translate jobs. Only set if asyncJobs is true
   *
   * @default - DATA_ACCESS_ROLE_ARN
   */
  readonly dataAccessRoleArnEnvironmentVariableName?: string;
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

interface EnvironmentVariableDefinition {
  defaultName: string,
  clientNameOverride?: string,
  value: string
}

/**
 * @summary The LambdaToTranslate class.
 */
export class LambdaToTranslate extends Construct {
  public readonly lambdaFunction: lambda.Function;
  // Buckets will be set if this construct creates them, if existing buckets are passed in, these will not be set
  public readonly sourceBucket?: s3.Bucket;
  public readonly destinationBucket?: s3.Bucket;
  public readonly sourceLoggingBucket?: s3.Bucket;
  public readonly destinationLoggingBucket?: s3.Bucket;
  public readonly vpc?: ec2.IVpc;
  // Interfaces will always be set, either with the new bucket or the existingBucket interfaces passed in props
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

    const lambdaFunctionRoleActions = ['translate:TranslateText', 'translate:TranslateDocument'];
    const lambdaEnvironmentVariables: EnvironmentVariableDefinition[] = [];

    // Asyncrhonous jobs involve addtional configuration, including:
    //   Action permissions for the Lambda Function
    //   Ah IAM role to pass to Translate
    //   Destination and Source buckets
    //   Environment Variables for the Lambda function
    if (props.asyncJobs) {
      CheckTranslateS3Props(props);

      // Setup source S3 Bucket
      if (props.existingSourceBucketObj) {
        this.sourceBucketInterface = props.existingSourceBucketObj;
      } else {
        const buildSourceBucketResponse = defaults.buildS3Bucket(this, {
          bucketProps: props.sourceBucketProps,
          loggingBucketProps: props.sourceLoggingBucketProps,
          logS3AccessLogs: props.logSourceS3AccessLogs
        }, `${id}-source-bucket`);
        this.sourceBucket = buildSourceBucketResponse.bucket;
        this.sourceLoggingBucket = buildSourceBucketResponse.loggingBucket;
        this.sourceBucketInterface = this.sourceBucket;
      }

      // Setup destination S3 Bucket
      if (props.useSameBucket) {
        this.destinationBucketInterface = this.sourceBucketInterface;
        this.destinationBucket = this.sourceBucket;
        this.destinationLoggingBucket = this.sourceLoggingBucket;
      } else {
        if (props.existingDestinationBucketObj) {
          this.destinationBucketInterface = props.existingDestinationBucketObj;
        } else {
          const buildDestinationBucketResponse = defaults.buildS3Bucket(this, {
            bucketProps: props.destinationBucketProps,
            loggingBucketProps: props.destinationLoggingBucketProps,
            logS3AccessLogs: props.logDestinationS3AccessLogs
          }, `${id}-destination-bucket`);
          this.destinationBucket = buildDestinationBucketResponse.bucket;
          this.destinationLoggingBucket = buildDestinationBucketResponse.loggingBucket;
          this.destinationBucketInterface = this.destinationBucket;
        }
      }

      // Set up role that is sent to the Translate service
      const translateServiceRole = new iam.Role(this, `${id}-translate-service-role`, {
        assumedBy: new iam.ServicePrincipal('translate.amazonaws.com'),
      });
      this.destinationBucketInterface.grantReadWrite(translateServiceRole);
      this.sourceBucketInterface.grantRead(translateServiceRole);

      // expose everything we just created as environment variables
      lambdaEnvironmentVariables.push({
        defaultName: "SOURCE_BUCKET_NAME",
        clientNameOverride: props.sourceBucketEnvironmentVariableName,
        value: this.sourceBucketInterface.bucketName
      });
      lambdaEnvironmentVariables.push({
        defaultName: "DESTINATION_BUCKET_NAME",
        clientNameOverride: props.destinationBucketEnvironmentVariableName,
        value: this.destinationBucketInterface.bucketName
      });
      lambdaEnvironmentVariables.push({
        defaultName: "DATA_ACCESS_ROLE_ARN",
        clientNameOverride: props.dataAccessRoleArnEnvironmentVariableName,
        value: translateServiceRole.roleArn
      });

      // Give the Lambda function additional permissions
      lambdaFunctionRoleActions.push("iam:PassRole");
      lambdaFunctionRoleActions.push("translate:DescribeTextTranslationJob");
      lambdaFunctionRoleActions.push("translate:ListTextTranslationJobs");
      lambdaFunctionRoleActions.push("translate:StartTextTranslationJob");
      lambdaFunctionRoleActions.push("translate:StopTextTranslationJob");

    }

    // Now we know everything the Lambda Function needs, we can configure it
    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      lambdaFunctionProps: props.lambdaFunctionProps,
      vpc: this.vpc,
    });

    if (props.additionalPermissions) {
      props.additionalPermissions.forEach(permission => {
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

    // Configure environment variables
    lambdaEnvironmentVariables.forEach(variable => {
      const varName = variable.clientNameOverride || variable.defaultName;
      this.lambdaFunction.addEnvironment(varName, variable.value);
    });

  }
}

function CheckTranslateS3Props(props: LambdaToTranslateProps) {
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