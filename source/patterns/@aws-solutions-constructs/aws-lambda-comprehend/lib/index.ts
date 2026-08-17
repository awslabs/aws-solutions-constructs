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
import { ComprehendAnalysisType, ComprehendUseCase } from '@aws-solutions-constructs/core';
// Note: To ensure CDKv2 compatibility, keep the import statement for Construct separate
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';

// Both enums are declared in the core library. Re-exporting them here lets Typescript clients
// import the construct and its enums from a single package. The props below still reference the
// core fully qualified names, so clients in the other languages import the enums from the core
// package (see the Python and Java examples in README.adoc)
export { ComprehendAnalysisType, ComprehendUseCase } from '@aws-solutions-constructs/core';

/**
 * @summary The properties for the LambdaToComprehend class.
 */
export interface LambdaToComprehendProps {
  /**
   * Optional - instance of an existing Lambda Function object, providing both this and `lambdaFunctionProps` will cause an error.
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function;
  /**
   * Optional - user provided props to override the default props for the Lambda function. Providing both this and
   * `existingLambdaObj` causes an error.
   *
   * @default - Default properties are used.
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps;
  /**
   * The Amazon Comprehend processing modes the Lambda function will use. Selecting ASYNC_BATCH causes source and
   * destination S3 buckets and a Comprehend data access role to be created.
   *
   * @default - [ComprehendUseCase.SINGLE_DOCUMENT_SYNC, ComprehendUseCase.MULTI_DOCUMENT_SYNC]
   */
  readonly comprehendUseCases?: ComprehendUseCase[];
  /**
   * The Amazon Comprehend analysis families the Lambda function will use. The IAM policy granted to the Lambda
   * function is the cross product of comprehendUseCases and analysisTypes.
   *
   * @default - All analysis types
   */
  readonly analysisTypes?: ComprehendAnalysisType[];
  /**
   * Optional array of additional IAM permissions to grant to the Lambda function for Amazon Comprehend. This is
   * intended for use with Comprehend actions and will assign a resource of '*' - permissions for other services with
   * specific resources should add the permission using Function.addToRolePolicy().
   *
   * @default - None
   */
  readonly additionalPermissions?: string[];
  /**
   * Existing instance of S3 Bucket object for source documents. If this is provided, then also providing
   * sourceBucketProps causes an error. Only valid when comprehendUseCases includes ComprehendUseCase.ASYNC_BATCH.
   *
   * @default - None
   */
  readonly existingSourceBucketObj?: s3.IBucket;
  /**
   * Optional user provided props to override the default props for the source S3 Bucket. Only valid when
   * comprehendUseCases includes ComprehendUseCase.ASYNC_BATCH.
   *
   * @default - Default props are used
   */
  readonly sourceBucketProps?: s3.BucketProps;
  /**
   * Existing instance of S3 Bucket object for analysis results. If this is provided, then also providing
   * destinationBucketProps causes an error. Only valid when comprehendUseCases includes
   * ComprehendUseCase.ASYNC_BATCH.
   *
   * @default - None
   */
  readonly existingDestinationBucketObj?: s3.IBucket;
  /**
   * Optional user provided props to override the default props for the destination S3 Bucket. Only valid when
   * comprehendUseCases includes ComprehendUseCase.ASYNC_BATCH.
   *
   * @default - Default props are used
   */
  readonly destinationBucketProps?: s3.BucketProps;
  /**
   * Whether to use the same S3 bucket for both source documents and analysis results. When true, only the source
   * bucket will be created and used for both purposes. Only valid when comprehendUseCases includes
   * ComprehendUseCase.ASYNC_BATCH.
   *
   * @default - false
   */
  readonly useSameBucket?: boolean;
  /**
   * Optional user provided props to override the default props for the source S3 Logging Bucket. Only valid when
   * comprehendUseCases includes ComprehendUseCase.ASYNC_BATCH.
   *
   * @default - Default props are used
   */
  readonly sourceLoggingBucketProps?: s3.BucketProps;
  /**
   * Optional user provided props to override the default props for the destination S3 Logging Bucket. Only valid
   * when comprehendUseCases includes ComprehendUseCase.ASYNC_BATCH.
   *
   * @default - Default props are used
   */
  readonly destinationLoggingBucketProps?: s3.BucketProps;
  /**
   * Whether to turn on Access Logging for the source S3 bucket. Creates an S3 bucket with associated storage costs
   * for the logs. Enabling Access Logging is a best practice. Only valid when comprehendUseCases includes
   * ComprehendUseCase.ASYNC_BATCH.
   *
   * @default - true
   */
  readonly logSourceS3AccessLogs?: boolean;
  /**
   * Whether to turn on Access Logging for the destination S3 bucket. Creates an S3 bucket with associated storage
   * costs for the logs. Enabling Access Logging is a best practice. Only valid when comprehendUseCases includes
   * ComprehendUseCase.ASYNC_BATCH.
   *
   * @default - true
   */
  readonly logDestinationS3AccessLogs?: boolean;
  /**
   * Optional Name for the Lambda function environment variable set to the name of the source bucket. Only valid when
   * comprehendUseCases includes ComprehendUseCase.ASYNC_BATCH.
   *
   * @default - SOURCE_BUCKET_NAME
   */
  readonly sourceBucketEnvironmentVariableName?: string;
  /**
   * Optional Name for the Lambda function environment variable set to the name of the destination bucket. Only valid
   * when comprehendUseCases includes ComprehendUseCase.ASYNC_BATCH.
   *
   * @default - DESTINATION_BUCKET_NAME
   */
  readonly destinationBucketEnvironmentVariableName?: string;
  /**
   * Optional Name for the Lambda function environment variable set to the ARN of the IAM role used for asynchronous
   * analysis jobs. Only valid when comprehendUseCases includes ComprehendUseCase.ASYNC_BATCH.
   *
   * @default - DATA_ACCESS_ROLE_ARN
   */
  readonly dataAccessRoleArnEnvironmentVariableName?: string;
  /**
   * An optional, existing VPC into which this pattern should be deployed. When deployed in a VPC, the Lambda function
   * will use ENIs in the VPC to access network resources and an Interface Endpoint will be created in the VPC for
   * Amazon Comprehend. If comprehendUseCases includes ComprehendUseCase.ASYNC_BATCH, a Gateway Endpoint for Amazon S3
   * will also be created. If an existing VPC is provided, the `deployVpc` property cannot be `true`. This uses
   * `ec2.IVpc` to allow clients to supply VPCs that exist outside the stack using the `ec2.Vpc.fromLookup()` method.
   *
   * @default - None
   */
  readonly existingVpc?: ec2.IVpc;
  /**
   * Optional user provided properties to override the default properties for the new VPC. `enableDnsHostnames`,
   * `enableDnsSupport`, `natGateways` and `subnetConfiguration` are set by the pattern, so any values for those
   * properties supplied here will be overridden. If `deployVpc` is not `true` then this property will be ignored.
   *
   * @default - None
   */
  readonly vpcProps?: ec2.VpcProps | any;
  /**
   * Whether to create a new VPC based on `vpcProps` into which to deploy this pattern. Setting this to true will
   * deploy the minimal, most private VPC to run the pattern.
   *
   * @default - false
   */
  readonly deployVpc?: boolean;
}

/**
 * @summary The LambdaToComprehend class.
 */
export class LambdaToComprehend extends Construct {
  public readonly lambdaFunction: lambda.Function;
  public readonly vpc?: ec2.IVpc;
  // The data access role is only required by asynchronous jobs, so it is only created when
  // comprehendUseCases includes ComprehendUseCase.ASYNC_BATCH
  public readonly dataAccessRole?: iam.Role;
  // The buckets will be set if this construct creates them. If existing buckets are passed in, these will not be set
  public readonly sourceBucket?: s3.Bucket;
  public readonly sourceLoggingBucket?: s3.Bucket;
  public readonly destinationBucket?: s3.Bucket;
  public readonly destinationLoggingBucket?: s3.Bucket;
  // The interfaces will always be set for asynchronous architectures, either with the new buckets or with the
  // existing bucket interfaces passed in props
  public readonly sourceBucketInterface?: s3.IBucket;
  public readonly destinationBucketInterface?: s3.IBucket;

  /**
   * @summary Constructs a new instance of the LambdaToComprehend class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {LambdaToComprehendProps} props - user provided props for the construct.
   * @access public
   */
  constructor(scope: Construct, id: string, props: LambdaToComprehendProps) {
    super(scope, id);

    // All our tests are based upon this behavior being on, so we're setting
    // context here rather than assuming the client will set it
    this.node.setContext("@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy", true);

    // Check props. All validation precedes all resource creation, so a rejected configuration
    // produces no partial stack
    defaults.CheckLambdaProps(props);
    defaults.CheckComprehendProps(props);
    defaults.CheckS3Props({
      existingBucketObj: props.existingSourceBucketObj,
      bucketProps: props.sourceBucketProps,
      loggingBucketProps: props.sourceLoggingBucketProps,
      logS3AccessLogs: props.logSourceS3AccessLogs
    });
    if (!props.useSameBucket) {
      defaults.CheckS3Props({
        existingBucketObj: props.existingDestinationBucketObj,
        bucketProps: props.destinationBucketProps,
        loggingBucketProps: props.destinationLoggingBucketProps,
        logS3AccessLogs: props.logDestinationS3AccessLogs
      });
    }
    defaults.CheckVpcProps(props);
    // The loose-typed check runs last so that structural errors are reported only after the
    // combination checks pass
    defaults.ValidateVpcProps(this, props.vpcProps);

    // Asynchronous jobs are the only mode that stages documents in S3, so they alone determine
    // whether buckets, a data access role and an S3 endpoint are required. Reading the answer
    // from the core resolver means this can never disagree with the permissions granted below
    const asyncJobsSelected = defaults.resolveComprehendSelection(props).useCases.includes(ComprehendUseCase.ASYNC_BATCH);

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

      defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.COMPREHEND);

      if (asyncJobsSelected) {
        defaults.AddAwsServiceEndpoint(scope, this.vpc, defaults.ServiceEndpointTypes.S3);
      }
    }

    // Create Lambda function
    this.lambdaFunction = defaults.buildLambdaFunction(this, {
      existingLambdaObj: props.existingLambdaObj,
      // We want a longer default timeout for the Comprehend call, but will defer to client value
      lambdaFunctionProps: defaults.overrideProps({ timeout: Duration.seconds(30) }, props.lambdaFunctionProps ?? {}),
      vpc: this.vpc,
    });

    // Configure Comprehend support (buckets, data access role, S3 and PassRole grants, environment
    // variable definitions). The Lambda function is passed as the grantee, so it must already exist
    const comprehendConfiguration = defaults.ConfigureComprehendSupport(this, id, props, this.lambdaFunction);

    // Set environment variables
    comprehendConfiguration.environmentVariables.forEach(variable => {
      const varName = variable.clientNameOverride || variable.defaultName;
      this.lambdaFunction.addEnvironment(varName, variable.value);
    });

    // Grant IAM permissions for Comprehend. Additional permissions are appended to the same
    // statement, after the generated actions, and de-duplicated against them
    const comprehendActions = [...comprehendConfiguration.lambdaIamActionsRequired];
    (props.additionalPermissions ?? []).forEach(permission => {
      if (!comprehendActions.includes(permission)) {
        comprehendActions.push(permission);
      }
    });

    this.lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: comprehendActions,
      resources: ['*']
    }));

    // Extract the buckets and the data access role from the configuration (asynchronous only)
    this.dataAccessRole = comprehendConfiguration.dataAccessRole;

    if (comprehendConfiguration.sourceBucket) {
      this.sourceBucket = comprehendConfiguration.sourceBucket.bucket;
      this.sourceLoggingBucket = comprehendConfiguration.sourceBucket.loggingBucket;
      this.sourceBucketInterface = comprehendConfiguration.sourceBucket.bucketInterface;
    }

    if (comprehendConfiguration.destinationBucket) {
      this.destinationBucket = comprehendConfiguration.destinationBucket.bucket;
      this.destinationLoggingBucket = comprehendConfiguration.destinationBucket.loggingBucket;
      this.destinationBucketInterface = comprehendConfiguration.destinationBucket.bucketInterface;
    }

    // Amazon Comprehend runs asynchronous jobs on service-managed infrastructure and reaches S3
    // over the public AWS network, not through the client's VPC. The interface endpoint only
    // covers the Lambda function's own calls to the Comprehend control plane
    if (this.vpc && asyncJobsSelected) {
      defaults.printWarning('Amazon Comprehend asynchronous analysis jobs do not run inside your VPC. The Lambda '
        + 'function reaches the Comprehend API through the Interface Endpoint, but Comprehend reads the source '
        + 'bucket and writes the destination bucket from service-managed infrastructure outside the VPC.');
    }
  }
}
